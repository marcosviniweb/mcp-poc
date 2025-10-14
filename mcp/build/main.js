#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import { resolveWorkspaceRoot, readFileIfExists } from "./utils.js";
import { listPotentialComponentFiles, extractComponentInfo } from "./scanner.js";
import { parseDetailedComponent } from "./docs.js";
import { buildUsageSnippet } from "./parser.js";
const server = new McpServer({ name: "lib-components", version: "1.0.0" });
server.tool("list-components", "Lista todos os componentes Angular da biblioteca. Use quando o usuário perguntar: 'quais componentes', 'liste componentes', 'mostre componentes', 'componentes disponíveis'", {}, async () => {
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
});
server.tool("get-component", "Obtém detalhes completos de um componente (inputs, outputs, selector, uso). Use quando o usuário perguntar sobre um componente específico, seus inputs/outputs, como usar, propriedades, eventos", { name: z.string().min(1).describe("Nome da classe do componente, ex.: ButtonComponent") }, async ({ name }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const files = await listPotentialComponentFiles(import.meta.url);
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
});
server.tool("get-library-info", "Obtém informações da biblioteca my-lib (versão, dependências, peer dependencies). Use quando perguntar: 'qual versão', 'info da lib', 'dependências', 'package.json'", {}, async () => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const pkgPath = path.resolve(root, "projects", "my-lib", "package.json");
    const content = await readFileIfExists(pkgPath);
    if (!content) {
        return { content: [{ type: "text", text: "package.json da lib não encontrado." }] };
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
    }
    catch (err) {
        return { content: [{ type: "text", text: `Erro ao parsear package.json: ${err}` }] };
    }
});
server.tool("find-library-by-name", "Busca biblioteca por nome e retorna versão, dependências. Use quando perguntar sobre biblioteca específica: 'versão da lib X', 'info sobre X', 'dependências de X'", { libraryName: z.string().min(1).describe("Nome da biblioteca (ex.: my-lib)") }, async ({ libraryName }) => {
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
    }
    catch (err) {
        return { content: [{ type: "text", text: `Erro ao parsear package.json: ${err}` }] };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server 'lib-components' rodando via stdio");
}
main().catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
});
