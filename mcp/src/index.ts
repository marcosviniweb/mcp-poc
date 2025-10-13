#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ExportEntry = {
  specifier: string;
  fromPath: string;
};

type ComponentInfo = {
  name: string;
  file: string;
  selector?: string;
  standalone?: boolean;
  inputs?: Array<{
    name: string;
    alias?: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  outputs?: Array<{
    name: string;
    alias?: string;
    type?: string;
    description?: string;
  }>;
};

const server = new McpServer({ name: "lib-components", version: "1.0.0" });

// Resolve o workspace relativo ao arquivo compilado em build/index.js
// Estrutura esperada: <repo>/mcp/build/index.js -> workspace é <repo>
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_WORKSPACE_ROOT = path.resolve(__dirname, "..", "..");
async function resolveWorkspaceRoot(): Promise<string> {
  // 1) via env var
  const fromEnv = process.env.LIB_COMPONENTS_WORKSPACE || process.env.MCP_WORKSPACE_ROOT;
  if (fromEnv) {
    const p = path.resolve(fromEnv, PUBLIC_API_RELATIVE);
    const exists = await readFileIfExists(p);
    if (exists !== null) return path.resolve(fromEnv);
  }
  // 2) via argumento CLI: node index.js <workspaceRoot>
  const argRoot = process.argv[2];
  if (argRoot) {
    const p = path.resolve(argRoot, PUBLIC_API_RELATIVE);
    const exists = await readFileIfExists(p);
    if (exists !== null) return path.resolve(argRoot);
  }
  const candidates = [
    DEFAULT_WORKSPACE_ROOT,
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "..", ".."),
  ];
  for (const root of candidates) {
    const p = path.resolve(root, PUBLIC_API_RELATIVE);
    const exists = await readFileIfExists(p);
    if (exists !== null) return root;
  }
  return DEFAULT_WORKSPACE_ROOT;
}
const PUBLIC_API_RELATIVE = path.join(
  "projects",
  "my-lib",
  "src",
  "public-api.ts",
);

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content;
  } catch {
    return null;
  }
}

async function parseReExports(fileContent: string): Promise<ExportEntry[]> {
  // Suporte a: export * from '...'; e export { X, Y } from '...';
  const exports: ExportEntry[] = [];
  const exportAllRegex = /export\s*\*\s*from\s*['\"](.+?)['\"];?/g;
  const exportNamedRegex = /export\s*\{[\s\S]*?\}\s*from\s*['\"](.+?)['\"];?/g;
  let match: RegExpExecArray | null;
  while ((match = exportAllRegex.exec(fileContent)) !== null) {
    exports.push({ specifier: "*", fromPath: match[1] });
  }
  while ((match = exportNamedRegex.exec(fileContent)) !== null) {
    exports.push({ specifier: "named", fromPath: match[1] });
  }
  return exports;
}

async function resolveTsPath(baseFile: string, fromPath: string): Promise<string | null> {
  const baseDir = path.dirname(baseFile);
  const tryPaths = [
    path.resolve(baseDir, `${fromPath}.ts`),
    path.resolve(baseDir, `${fromPath}.mts`),
    path.resolve(baseDir, `${fromPath}.cts`),
    path.resolve(baseDir, fromPath, "index.ts"),
  ];
  for (const p of tryPaths) {
    const content = await readFileIfExists(p);
    if (content !== null) return p;
  }
  return null;
}

async function collectExportChain(entryFile: string, visited = new Set<string>()): Promise<string[]> {
  const result: string[] = [];
  if (visited.has(entryFile)) return result;
  visited.add(entryFile);
  const content = await readFileIfExists(entryFile);
  if (!content) return result;
  const reexports = await parseReExports(content);
  if (reexports.length === 0) return result;
  for (const re of reexports) {
    const next = await resolveTsPath(entryFile, re.fromPath);
    if (!next) continue;
    result.push(next);
    const nested = await collectExportChain(next, visited);
    result.push(...nested);
  }
  return Array.from(new Set(result));
}

async function listPotentialComponentFiles(): Promise<string[]> {
  const WORKSPACE_ROOT = await resolveWorkspaceRoot();
  const publicApiPath = path.resolve(WORKSPACE_ROOT, PUBLIC_API_RELATIVE);
  const chain = await collectExportChain(publicApiPath);
  if (chain.length > 0) return chain;
  // Fallback: varrer diretório de componentes por *.component.ts
  const componentsDir = path.resolve(
    WORKSPACE_ROOT,
    "projects",
    "my-lib",
    "src",
    "lib",
    "components",
  );
  async function walk(dir: string, acc: string[] = []): Promise<string[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return acc;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory()) {
          await walk(full, acc);
        } else if (/\.component\.ts$/.test(entry)) {
          acc.push(full);
        }
      } catch {
        // ignore
      }
    }
    return acc;
  }
  return await walk(componentsDir);
}

async function extractComponentInfo(filePath: string): Promise<ComponentInfo[]> {
  const content = await readFileIfExists(filePath);
  if (!content) return [];
  const infos: ComponentInfo[] = [];
  // Match Angular @Component with selector and class name in same file
  const componentRegex = /@Component\s*\(\s*\{([\s\S]*?)\}\s*\)\s*export\s+class\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = componentRegex.exec(content)) !== null) {
    const metaBlock = match[1];
    const className = match[2];
    const selectorMatch = /selector\s*:\s*['\"]([^'\"]+)['\"]/m.exec(metaBlock);
    const selector = selectorMatch?.[1];
    const standaloneMatch = /standalone\s*:\s*(true|false)/m.exec(metaBlock);
    const standalone = standaloneMatch ? standaloneMatch[1] === "true" : undefined;
    infos.push({ name: className, file: filePath, selector, standalone });
  }
  // If no decorator found, still try to find exported class ...Component
  if (infos.length === 0) {
    const classRegex = /export\s+class\s+(\w+Component)\b/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      infos.push({ name: className, file: filePath });
    }
  }
  return infos;
}

function extractClassBody(source: string, className: string): { body: string; start: number } | null {
  const classRegex = new RegExp(`export\\s+class\\s+${className}\\b[^{]*{`, 'm');
  const m = classRegex.exec(source);
  if (!m) return null;
  const startIdx = (m.index || 0) + (m[0]?.length || 0);
  // brace matching
  let depth = 1;
  let i = startIdx;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const body = source.slice(startIdx, i);
        return { body, start: startIdx };
      }
    }
    i++;
  }
  return null;
}

function cleanWhitespace(s: string | undefined): string | undefined {
  return s ? s.replace(/\s+/g, ' ').trim() : s;
}

function extractLeadingComment(block: string, decoratorIndex: number): string | undefined {
  // Look backwards for /** ... */ within ~300 chars
  const lookBehind = block.slice(Math.max(0, decoratorIndex - 300), decoratorIndex);
  const m = /\/\*\*([\s\S]*?)\*\//.exec(lookBehind);
  if (!m) return undefined;
  const text = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .join(' ')
    .trim();
  return text || undefined;
}

function parsePropertyLine(line: string): { name?: string; type?: string; required?: boolean; defaultValue?: string } {
  // Example: label?: string;  OR variant: 'a' | 'b' = 'a';
  const m = /([A-Za-z_][\w]*)\s*(\?)?\s*:\s*([^=;]+)(?:=\s*([^;]+))?/.exec(line);
  if (!m) return {};
  const name = m[1];
  const required = !Boolean(m[2]);
  const type = cleanWhitespace(m[3]);
  const defaultValue = cleanWhitespace(m[4]);
  return { name, type, required, defaultValue };
}

function parseEventEmitterType(fragment: string | undefined): string | undefined {
  if (!fragment) return undefined;
  const m = /EventEmitter\s*<\s*([^>]+)\s*>/.exec(fragment);
  return cleanWhitespace(m?.[1] || undefined);
}

function generateSampleFromType(type?: string): string | undefined {
  if (!type) return undefined;
  const t = type.trim();
  if (/^string$/i.test(t)) return '"texto"';
  if (/^number$/i.test(t)) return '0';
  if (/^boolean$/i.test(t)) return 'true';
  const union = t.match(/'(?:[^']+)'/g);
  if (union && union.length > 0) return union[0];
  return undefined;
}

async function parseDetailedComponent(filePath: string, className: string, selector?: string, standalone?: boolean): Promise<ComponentInfo> {
  const source = (await readFileIfExists(filePath)) || '';
  const classBlock = extractClassBody(source, className);
  const result: ComponentInfo = { name: className, file: filePath, selector, standalone, inputs: [], outputs: [] };
  if (!classBlock) return result;
  const block = classBlock.body;
  // Parse @Input
  const inputRegex = /@Input(?:\s*\(\s*(['\"][^'\"]+['\"])\s*\))?\s*/g;
  let m: RegExpExecArray | null;
  while ((m = inputRegex.exec(block)) !== null) {
    const aliasRaw = m[1];
    // read until semicolon
    const rest = block.slice(m.index + m[0].length);
    const semi = rest.indexOf(';');
    if (semi === -1) continue;
    const line = rest.slice(0, semi);
    const { name, type, required, defaultValue } = parsePropertyLine(line);
    if (!name) continue;
    const alias = aliasRaw ? aliasRaw.replace(/^['\"]|['\"]$/g, '') : undefined;
    const description = extractLeadingComment(block, m.index) || undefined;
    result.inputs!.push({ name, alias, type, required, defaultValue, description });
  }
  // Parse @Output
  const outputRegex = /@Output(?:\s*\(\s*(['\"][^'\"]+['\"])\s*\))?\s*/g;
  while ((m = outputRegex.exec(block)) !== null) {
    const aliasRaw = m[1];
    const rest = block.slice(m.index + m[0].length);
    const semi = rest.indexOf(';');
    if (semi === -1) continue;
    const line = rest.slice(0, semi);
    const { name, type } = parsePropertyLine(line);
    if (!name) continue;
    const alias = aliasRaw ? aliasRaw.replace(/^['\"]|['\"]$/g, '') : undefined;
    const eventType = parseEventEmitterType(type);
    const description = extractLeadingComment(block, m.index) || undefined;
    result.outputs!.push({ name, alias, type: eventType || type, description });
  }
  return result;
}

function buildUsageSnippet(info: ComponentInfo): string | undefined {
  if (!info.selector) return undefined;
  const tag = info.selector;
  const inputs = info.inputs || [];
  const outputs = info.outputs || [];
  const bindings: string[] = [];
  for (const i of inputs) {
    const sample = generateSampleFromType(i.type) || '...';
    bindings.push(`[${i.alias || i.name}]=${sample}`);
  }
  for (const o of outputs) {
    bindings.push(`(${o.alias || o.name})="on${o.name[0].toUpperCase()}${o.name.slice(1)}($event)"`);
  }
  const space = bindings.length ? ' ' : '';
  return `<${tag}${space}${bindings.join(' ')}></${tag}>`;
}

server.tool(
  "list-components",
  "Lista componentes Angular exportados indiretamente pelo public-api",
  {},
  async () => {
    const root = await resolveWorkspaceRoot();
    const files = await listPotentialComponentFiles();
    const allInfosArrays = await Promise.all(files.map(extractComponentInfo));
    const infos = allInfosArrays.flat();
    if (infos.length === 0) {
      return { content: [{ type: "text", text: "Nenhum componente encontrado." }] };
    }
    const text = infos
      .map((c) => `- ${c.name} (${c.selector ?? "sem selector"})\n  arquivo: ${path.relative(root, c.file)}`)
      .join("\n");
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "get-component",
  "Obtém detalhes de um componente pelo nome da classe",
  { name: z.string().min(1).describe("Nome da classe do componente, ex.: ButtonComponent") },
  async ({ name }) => {
    const root = await resolveWorkspaceRoot();
    const files = await listPotentialComponentFiles();
    for (const f of files) {
      const infos = await extractComponentInfo(f);
      const found = infos.find((i) => i.name === name);
      if (found) {
        const detailed = await parseDetailedComponent(found.file, found.name, found.selector, found.standalone);
        const rel = path.relative(root, detailed.file);
        const inputs = (detailed.inputs || []).map((i) => `  - ${i.alias || i.name}${i.required ? '' : '?'}: ${i.type || 'any'}${i.defaultValue ? ` = ${i.defaultValue}` : ''}${i.description ? ` // ${i.description}` : ''}`).join('\n') || '  (nenhum)';
        const outputs = (detailed.outputs || []).map((o) => `  - ${o.alias || o.name}: ${o.type || 'any'}${o.description ? ` // ${o.description}` : ''}`).join('\n') || '  (nenhum)';
        const usage = buildUsageSnippet(detailed);
        const detail = [
          `Nome: ${detailed.name}`,
          `Selector: ${detailed.selector ?? "(não definido)"}`,
          `Standalone: ${detailed.standalone === undefined ? '(desconhecido)' : detailed.standalone}`,
          `Arquivo: ${rel}`,
          `Inputs:\n${inputs}`,
          `Outputs:\n${outputs}`,
          usage ? `Uso:\n${usage}` : ''
        ].filter(Boolean).join("\n");
        return { content: [{ type: "text", text: detail }] };
      }
    }
    return { content: [{ type: "text", text: `Componente não encontrado: ${name}` }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server 'lib-components' rodando via stdio");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});



