#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import { resolveWorkspaceRoot } from "./utils.js";
import { listPotentialComponentFiles, extractComponentInfo } from "./scanner.js";
import { parseDetailedComponent } from "./docs.js";
import { buildUsageSnippet } from "./parser.js";

const server = new McpServer({ name: "lib-components", version: "1.0.0" });

server.tool(
  "list-components",
  "Lista componentes Angular exportados indiretamente pelo public-api",
  {},
  async () => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const files = await listPotentialComponentFiles(import.meta.url);
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
    const root = await resolveWorkspaceRoot(import.meta.url);
    const files = await listPotentialComponentFiles(import.meta.url);
    for (const f of files) {
      const infos = await extractComponentInfo(f);
      const found = infos.find((i) => i.name === name);
      if (found) {
        const detailed = await parseDetailedComponent(found.file, found.name, found.selector, found.standalone);
        const rel = path.relative(root, detailed.file);
    const inputs = (detailed.inputs || []).map((i: any) => `  - ${i.alias || i.name}${i.required ? '' : '?'}: ${i.type || 'any'}${i.defaultValue ? ` = ${i.defaultValue}` : ''}${i.description ? ` // ${i.description}` : ''}`).join('\n') || '  (nenhum)';
    const outputs = (detailed.outputs || []).map((o: any) => `  - ${o.alias || o.name}: ${o.type || 'any'}${o.description ? ` // ${o.description}` : ''}`).join('\n') || '  (nenhum)';
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


