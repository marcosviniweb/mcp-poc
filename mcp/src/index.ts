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
  const componentRegex = /@Component\s*\(\s*\{[\s\S]*?selector:\s*['\"]([^'\"]+)['\"][\s\S]*?\}\s*\)\s*export\s+class\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = componentRegex.exec(content)) !== null) {
    const selector = match[1];
    const className = match[2];
    infos.push({ name: className, file: filePath, selector });
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
        const rel = path.relative(root, found.file);
        const detail = [
          `Nome: ${found.name}`,
          `Selector: ${found.selector ?? "(não definido)"}`,
          `Arquivo: ${rel}`,
        ].join("\n");
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



