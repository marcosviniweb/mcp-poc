#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import { resolveWorkspaceRoot, readFileIfExists, discoverLibraries } from "./utils.js";
import { listPotentialComponentFiles, extractComponentInfo } from "./scanner.js";
import { parseDetailedComponent } from "./docs.js";
import { buildUsageSnippet } from "./parser.js";

const server = new McpServer({ name: "lib-components", version: "1.0.0" });

server.tool(
  "list-components",
  "Lista todos os componentes Angular da biblioteca. Use quando o usuário perguntar: 'quais componentes', 'liste componentes', 'mostre componentes', 'componentes disponíveis'",
  { libraryName: z.string().optional().describe("Nome da biblioteca (ex.: my-lib)"), entryPoint: z.string().optional().describe("Nome do entry point secundário (quando houver)") },
  async ({ libraryName, entryPoint }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const files = await listPotentialComponentFiles(import.meta.url, libraryName, entryPoint);
    const allInfosArrays = await Promise.all(files.map(extractComponentInfo));
    const infos = allInfosArrays.flat();
    if (infos.length === 0) {
      const libs = await discoverLibraries(import.meta.url);
      if (libs.length > 1 && !libraryName) {
        const options = libs.map(l => `- ${l.name}`).join('\n');
        return { content: [{ type: "text", text: `Várias bibliotecas encontradas. Informe libraryName.\nOpções:\n${options}` }] };
      }
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
  "Obtém detalhes completos de um componente (inputs, outputs, selector, uso). Use quando o usuário perguntar sobre um componente específico, seus inputs/outputs, como usar, propriedades, eventos",
  { name: z.string().min(1).describe("Nome da classe do componente, ex.: ButtonComponent"), libraryName: z.string().optional().describe("Nome da biblioteca (ex.: my-lib)"), entryPoint: z.string().optional().describe("Nome do entry point secundário (quando houver)") },
  async ({ name, libraryName, entryPoint }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const files = await listPotentialComponentFiles(import.meta.url, libraryName, entryPoint);
    for (const f of files) {
      const infos = await extractComponentInfo(f);
      const found = infos.find((i) => i.name === name);
      if (found) {
        const detailed = await parseDetailedComponent(found.file, found.name, found.selector, found.standalone);
        const rel = path.relative(root, detailed.file);
    const inputs = (detailed.inputs || []).map((i: any) => {
      const kindLabel = i.kind === 'signal' ? '🔵 signal' : '🟢 decorator';
      const typeInfo = i.resolvedType || i.type || 'any';
      const requiredMark = i.required ? '' : '?';
      const defaultVal = i.defaultValue ? ` = ${i.defaultValue}` : '';
      const desc = i.description ? ` // ${i.description}` : '';
      return `  - ${i.alias || i.name}${requiredMark}: ${typeInfo}${defaultVal} [${kindLabel}]${desc}`;
    }).join('\n') || '  (nenhum)';
    const outputs = (detailed.outputs || []).map((o: any) => {
      const kindLabel = o.kind === 'signal' ? '🔵 signal' : '🟢 decorator';
      const typeInfo = o.resolvedType || o.type || 'any';
      const desc = o.description ? ` // ${o.description}` : '';
      return `  - ${o.alias || o.name}: ${typeInfo} [${kindLabel}]${desc}`;
    }).join('\n') || '  (nenhum)';
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
    const libs = await discoverLibraries(import.meta.url);
    if (libs.length > 1 && !libraryName) {
      const options = libs.map(l => `- ${l.name}`).join('\n');
      return { content: [{ type: "text", text: `Componente não encontrado: ${name}. Em múltiplas bibliotecas, informe libraryName.\nOpções:\n${options}` }] };
    }
    return { content: [{ type: "text", text: `Componente não encontrado: ${name}` }] };
  },
);

server.tool(
  "get-library-info",
  "Obtém informações da biblioteca (versão, dependências, peer dependencies). Use quando perguntar: 'qual versão', 'info da lib', 'dependências', 'package.json'",
  { libraryName: z.string().optional().describe("Nome da biblioteca (ex.: my-lib)") },
  async ({ libraryName }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const libs = await discoverLibraries(import.meta.url);
    let target = libs;
    if (libraryName) target = libs.filter(l => l.name === libraryName);
    if (target.length === 0) {
      const options = libs.map(l => `- ${l.name}`).join('\n') || '(nenhuma encontrada)';
      return { content: [{ type: "text", text: `Biblioteca não encontrada. Opções:\n${options}` }] };
    }
    const lib = target[0];
    const pkgPath = path.resolve(lib.root, "package.json");
    const content = await readFileIfExists(pkgPath);
    if (!content) return { content: [{ type: "text", text: `package.json não encontrado para ${lib.name}` }] };
    try {
      const pkg = JSON.parse(content);
      const info = [
        `Nome: ${pkg.name || '(não definido)'}`,
        `Versão: ${pkg.version || '(não definido)'}`,
        `Descrição: ${pkg.description || '(não definido)'}`,
        `Dependências:`,
        pkg.dependencies ? Object.entries(pkg.dependencies).map(([k, v]) => `  - ${k}: ${v}`).join('\n') : '  (nenhuma)',
        `Peer Dependencies:`,
        pkg.peerDependencies ? Object.entries(pkg.peerDependencies).map(([k, v]) => `  - ${k}: ${v}`).join('\n') : '  (nenhuma)',
      ].join('\n');
      return { content: [{ type: "text", text: info }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Erro ao parsear package.json: ${err}` }] };
    }
  },
);

server.tool(
  "find-library-by-name",
  "Busca biblioteca por nome e retorna versão, dependências. Use quando perguntar sobre biblioteca específica: 'versão da lib X', 'info sobre X', 'dependências de X'",
  { libraryName: z.string().min(1).describe("Nome da biblioteca (ex.: my-lib)") },
  async ({ libraryName }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const pkgPath = path.resolve(root, "projects", libraryName, "package.json");
    const content = await readFileIfExists(pkgPath);
    if (!content) {
      return { content: [{ type: "text", text: `Biblioteca '${libraryName}' não encontrada em projects/${libraryName}/package.json` }] };
    }
    try {
      const pkg = JSON.parse(content);
      const info = [
        `Nome: ${pkg.name || '(não definido)'}`,
        `Versão: ${pkg.version || '(não definido)'}`,
        `Descrição: ${pkg.description || '(não definido)'}`,
        `Dependências:`,
        pkg.dependencies ? Object.entries(pkg.dependencies).map(([k, v]) => `  - ${k}: ${v}`).join('\n') : '  (nenhuma)',
        `Peer Dependencies:`,
        pkg.peerDependencies ? Object.entries(pkg.peerDependencies).map(([k, v]) => `  - ${k}: ${v}`).join('\n') : '  (nenhuma)',
      ].join('\n');
      return { content: [{ type: "text", text: info }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Erro ao parsear package.json: ${err}` }] };
    }
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


