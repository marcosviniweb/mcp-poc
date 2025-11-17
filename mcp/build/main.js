#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import { resolveWorkspaceRoot, readFileIfExists, discoverLibraries, statIsDirectory } from "./utils.js";
import { listPotentialComponentFiles, extractComponentInfo } from "./scanner.js";
import { parseDetailedComponent, findDocumentationExamples } from "./docs.js";
import { buildUsageSnippet } from "./parser.js";
import { findMarkdownFiles, findWorkspaceRoots, getPossibleDocsPaths } from "./markdown-search.js";
const server = new McpServer({ name: "lyra", version: "1.3.0" });
// ============================================================================
// AVISOS IMPORTANTES - Sempre incluídos nas respostas
// ============================================================================
const NO_STYLE_HEADER = `
🚨 ATENÇÃO: NÃO ADICIONE ESTILIZAÇÃO NOS COMPONENTES 🚨
Os componentes do Design System JÁ POSSUEM design próprio.
NUNCA adicione class/style nos componentes.
Você PODE adicionar CSS em containers/wrappers ao redor para organização.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
const NO_STYLE_FOOTER = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  REGRAS DE ESTILIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NUNCA ADICIONE nos componentes:
   • class="..." nos elementos luds-*
   • style="..." nos elementos com diretivas luds*
   • Propriedades visuais diretas nos componentes

✅ PODE ADICIONAR em containers/wrappers:
   • <div class="container"> ao redor dos componentes
   • CSS em elementos pais para layout/organização
   • Estilos de página/seção (não nos componentes)

📚 Para customizar aparência dos componentes:
   Consulte a documentação oficial do Design System

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
// ============================================================================
// PROMPTS - Reusable templates para guiar a interação com LLMs
// ============================================================================
server.prompt("no-styling-guidelines", "🚨 REGRAS: Nunca adicione CSS nos componentes , mas PODE usar em containers ao redor", {}, () => ({
    messages: [
        {
            role: "assistant",
            content: {
                type: "text",
                text: `Entendido. Ao fornecer exemplos de componentes do Design System, seguirei estas regras:

🚫 NUNCA VOU ADICIONAR nos componentes:
- class="..." em elementos <luds-*> ou com diretivas [luds*]
- style="..." diretamente nos componentes
- Qualquer propriedade visual nos componentes em si

✅ VOU FORNECER exemplos bem apresentados:
- Componentes puros (sem class/style)
- CSS em containers/wrappers ao redor (para organização)
- Estrutura HTML clara e organizada

📋 EXEMPLO CORRETO:
\`\`\`html
<!-- Container pode ter estilo -->
<div class="exemplo-container">
  <!-- Componente PURO (sem class/style) -->
  <div ludsAlert [ludsAlertType]="'success'">
    Operação realizada com sucesso
  </div>
</div>

<style>
  /* CSS apenas no container, NÃO no componente */
  .exemplo-container {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }
</style>
\`\`\`

🚨 NUNCA FAREI ISTO:
\`\`\`html
<!-- ERRADO: CSS diretamente no componente -->
<div ludsAlert class="bg-green-500 p-4" style="color: white;">
  Operação realizada
</div>
\`\`\`

Os componentes JÁ POSSUEM todo o design necessário.`
            }
        }
    ]
}));
server.tool("list-components", "Lista todos os componentes Angular da biblioteca. Use quando o usuário perguntar: 'quais componentes', 'liste componentes', 'mostre componentes', 'componentes disponíveis'. ⚠️ IMPORTANTE: Componentes devem ser usados puros (sem class/style neles). Pode usar CSS em containers ao redor.", { libraryName: z.string().optional().describe("Nome da biblioteca (ex.: my-lib)"), entryPoint: z.string().optional().describe("Nome do entry point secundário (quando houver)") }, async ({ libraryName, entryPoint }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const libs = await discoverLibraries(import.meta.url);
    console.error(`[list-components] Encontradas ${libs.length} bibliotecas`);
    libs.forEach(l => console.error(`  - ${l.name} em ${l.root}`));
    const files = await listPotentialComponentFiles(import.meta.url, libraryName, entryPoint);
    console.error(`[list-components] Encontrados ${files.length} arquivos de componentes`);
    const allInfosArrays = await Promise.all(files.map(extractComponentInfo));
    const infos = allInfosArrays.flat();
    if (infos.length === 0) {
        if (libs.length > 1 && !libraryName) {
            const options = libs.map(l => `- ${l.name}`).join('\n');
            return { content: [{ type: "text", text: `Várias bibliotecas encontradas. Informe libraryName.\nOpções:\n${options}` }] };
        }
        return { content: [{ type: "text", text: "Nenhum componente encontrado." }] };
    }
    const text = infos
        .map((c) => {
        const typeLabel = c.type === 'directive' ? 'diretiva' : 'componente';
        return `- ${c.name} (${c.selector ?? "sem selector"}) [${typeLabel}]\n  arquivo: ${path.relative(root, c.file)}`;
    })
        .join("\n");
    return { content: [{ type: "text", text: NO_STYLE_HEADER + text + NO_STYLE_FOOTER }] };
});
server.tool("get-component", "Obtém detalhes completos de um componente (inputs, outputs, selector, uso). Use quando o usuário perguntar sobre um componente específico, seus inputs/outputs, como usar, propriedades, eventos. ⚠️ IMPORTANTE: Forneça exemplo com componente  PURO (sem class/style nele). PODE usar CSS em container ao redor para apresentação.", { name: z.string().min(1).describe("Nome da classe do componente, ex.: ButtonComponent"), libraryName: z.string().optional().describe("Nome da biblioteca (ex.: my-lib)"), entryPoint: z.string().optional().describe("Nome do entry point secundário (quando houver)") }, async ({ name, libraryName, entryPoint }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const files = await listPotentialComponentFiles(import.meta.url, libraryName, entryPoint);
    for (const f of files) {
        const infos = await extractComponentInfo(f);
        const found = infos.find((i) => i.name === name);
        if (found) {
            const detailed = await parseDetailedComponent(found.file, found.name, found.selector, found.standalone, found.type);
            const rel = path.relative(root, detailed.file);
            // 1. Tenta buscar exemplos da documentação primeiro
            const docExample = await findDocumentationExamples(found.name, found.file);
            const inputs = (detailed.inputs || []).map((i) => {
                const kindLabel = i.kind === 'signal' ? '🔵 signal' : '🟢 decorator';
                const typeInfo = i.resolvedType || i.type || 'any';
                const requiredMark = i.required ? '' : '?';
                const defaultVal = i.defaultValue ? ` = ${i.defaultValue}` : '';
                const desc = i.description ? ` // ${i.description}` : '';
                return `  - ${i.alias || i.name}${requiredMark}: ${typeInfo}${defaultVal} [${kindLabel}]${desc}`;
            }).join('\n') || '  (nenhum)';
            const outputs = (detailed.outputs || []).map((o) => {
                const kindLabel = o.kind === 'signal' ? '🔵 signal' : '🟢 decorator';
                const typeInfo = o.resolvedType || o.type || 'any';
                const desc = o.description ? ` // ${o.description}` : '';
                return `  - ${o.alias || o.name}: ${typeInfo} [${kindLabel}]${desc}`;
            }).join('\n') || '  (nenhum)';
            // 2. Se não encontrou documentação, gera exemplo sintético
            const usage = docExample || buildUsageSnippet(detailed);
            const typeLabel = detailed.type === 'directive' ? 'Diretiva' : 'Componente';
            const detail = [
                `Nome: ${detailed.name}`,
                `Tipo: ${typeLabel}`,
                `Selector: ${detailed.selector ?? "(não definido)"}`,
                `Standalone: ${detailed.standalone === undefined ? '(desconhecido)' : detailed.standalone}`,
                `Arquivo: ${rel}`,
                `Inputs:\n${inputs}`,
                `Outputs:\n${outputs}`,
                usage ? `Uso:\n${usage}` : ''
            ].filter(Boolean).join("\n");
            return { content: [{ type: "text", text: NO_STYLE_HEADER + detail + NO_STYLE_FOOTER }] };
        }
    }
    const libs = await discoverLibraries(import.meta.url);
    if (libs.length > 1 && !libraryName) {
        const options = libs.map(l => `- ${l.name}`).join('\n');
        return { content: [{ type: "text", text: `Componente não encontrado: ${name}. Em múltiplas bibliotecas, informe libraryName.\nOpções:\n${options}` }] };
    }
    return { content: [{ type: "text", text: `Componente não encontrado: ${name}` }] };
});
server.tool("get-library-info", "Obtém informações da biblioteca (versão, dependências, peer dependencies). Use quando perguntar: 'qual versão', 'info da lib', 'dependências', 'package.json'. IMPORTANTE: Forneça apenas informações técnicas, NÃO sugira estilização ou design visual.", { libraryName: z.string().optional().describe("Nome da biblioteca (ex.: my-lib)") }, async ({ libraryName }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const libs = await discoverLibraries(import.meta.url);
    let target = libs;
    if (libraryName)
        target = libs.filter(l => l.name === libraryName);
    if (target.length === 0) {
        const options = libs.map(l => `- ${l.name}`).join('\n') || '(nenhuma encontrada)';
        return { content: [{ type: "text", text: `Biblioteca não encontrada. Opções:\n${options}` }] };
    }
    const lib = target[0];
    const pkgPath = path.resolve(lib.root, "package.json");
    const content = await readFileIfExists(pkgPath);
    if (!content)
        return { content: [{ type: "text", text: `package.json não encontrado para ${lib.name}` }] };
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
server.tool("get-documentation", "Busca e retorna documentação detalhada (arquivos .md) de componentes ou do projeto. Use quando o usuário perguntar: 'documentação do componente X', 'como funciona X', 'exemplos de uso', 'guia do componente', 'configuração','instalação','Guia','Instalação e configuração do tema','README', 'Arquitetura'", {
    componentName: z.string().optional().describe("Nome do componente para buscar docs específicas (ex.: checkbox, alert, button)"),
    searchTerm: z.string().optional().describe("Termo para buscar na documentação")
}, async ({ componentName, searchTerm }) => {
    const libs = await discoverLibraries(import.meta.url);
    const results = [];
    // Se não há libs, tentar buscar na raiz do workspace configurada
    if (libs.length === 0) {
        return {
            content: [{
                    type: "text",
                    text: `Nenhuma biblioteca encontrada para buscar documentação.\n\n` +
                        `💡 Configure o workspace usando --libs no comando do MCP server.`
                }]
        };
    }
    // Buscar a partir da raiz do workspace (workspace root, não lib root)
    const workspaceRoots = await findWorkspaceRoots(libs);
    for (const workspaceRoot of workspaceRoots) {
        // Buscar pasta docs no workspace
        const possibleDocsPaths = getPossibleDocsPaths(workspaceRoot);
        for (const docsPath of possibleDocsPaths) {
            try {
                const exists = await statIsDirectory(docsPath);
                if (!exists)
                    continue;
                // Buscar arquivos .md recursivamente
                const mdFiles = await findMarkdownFiles(docsPath, componentName, searchTerm);
                if (mdFiles.length > 0) {
                    results.push(`📚 Documentação encontrada em: ${docsPath}\n`);
                    for (const mdFile of mdFiles.slice(0, 5)) { // Limitar a 5 resultados
                        const content = await readFileIfExists(mdFile);
                        if (content) {
                            const relPath = path.relative(docsPath, mdFile);
                            results.push(`\n${'━'.repeat(70)}`);
                            results.push(`📄 ${relPath}`);
                            results.push(`${'━'.repeat(70)}\n`);
                            // Limitar conteúdo a ~300 linhas para não sobrecarregar
                            const lines = content.split('\n');
                            const preview = lines.slice(0, 300).join('\n');
                            results.push(preview);
                            if (lines.length > 300) {
                                results.push(`\n\n... (${lines.length - 300} linhas restantes omitidas)`);
                            }
                        }
                    }
                    if (mdFiles.length > 5) {
                        results.push(`\n\n📋 E mais ${mdFiles.length - 5} arquivo(s) de documentação encontrados:`);
                        for (const mdFile of mdFiles.slice(5, 15)) {
                            results.push(`   • ${path.relative(docsPath, mdFile)}`);
                        }
                        if (mdFiles.length > 15) {
                            results.push(`   ... e mais ${mdFiles.length - 15} arquivos`);
                        }
                    }
                    // Se encontrou, não precisa continuar buscando
                    break;
                }
            }
            catch (err) {
                // Pasta não existe ou erro ao ler, continuar
                continue;
            }
        }
        // Se já encontrou resultados, não precisa buscar em outros workspace roots
        if (results.length > 0)
            break;
    }
    if (results.length === 0) {
        const searchInfo = componentName ? ` para o componente "${componentName}"` : '';
        return {
            content: [{
                    type: "text",
                    text: `❌ Nenhuma documentação encontrada${searchInfo}.\n\n` +
                        `📁 Locais verificados:\n` +
                        Array.from(workspaceRoots).map(root => `   • ${root}/apps/docs\n` +
                            `   • ${root}/docs\n` +
                            `   • ${root}/documentation`).join('\n') +
                        `\n\n💡 Dica: Use 'get-component' para ver informações técnicas extraídas do código-fonte.`
                }]
        };
    }
    const header = componentName
        ? `📖 DOCUMENTAÇÃO: ${componentName.toUpperCase()}\n${'═'.repeat(70)}\n\n`
        : `📖 DOCUMENTAÇÃO DO PROJETO\n${'═'.repeat(70)}\n\n`;
    return {
        content: [{
                type: "text",
                text: header + results.join('\n')
            }]
    };
});
server.tool("how-to-install", "Fornece instruções de como instalar bibliotecas do registry privado Nexus. Use quando o usuário perguntar: 'como instalar', 'como adicionar a lib', 'instalação', 'npm install', 'configurar projeto'", { libraryName: z.string().optional().describe("Nome da biblioteca que o usuário quer instalar (ex.: @luds/ui)") }, async ({ libraryName }) => {
    const libs = await discoverLibraries(import.meta.url);
    const libExample = libraryName || (libs.length > 0 ? libs[0].name : "@scope/library");
    const instructions = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 COMO INSTALAR BIBLIOTECAS DO REGISTRY PRIVADO NEXUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

As bibliotecas estão hospedadas em um registry privado Nexus.
Siga os passos abaixo para configurar e instalar:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PASSO 1: Configurar o Registry Privado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie ou edite o arquivo .npmrc na raiz do seu projeto:

\`\`\`bash
# Crie o arquivo .npmrc
touch .npmrc
\`\`\`

Adicione as seguintes configurações no arquivo .npmrc:

\`\`\`
registry=https://nexus.devsecops-paas-prd.br.experian.eeca/repository/npm-group-repository/
strict-ssl=false
\`\`\`

⚠️ IMPORTANTE: 
   • O arquivo .npmrc deve estar na RAIZ do seu projeto
   • Não commite credenciais no .npmrc se houver

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PASSO 2: Instalar a Biblioteca
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Depois de configurar o .npmrc, instale a biblioteca desejada:

\`\`\`bash
# Instalar versão mais recente
npm install ${libExample}@latest

# Ou instalar versão específica
npm install ${libExample}@1.0.0

# Ou adicionar como dev dependency
npm install ${libExample}@latest --save-dev
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VERIFICAR INSTALAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Após a instalação, verifique se a biblioteca foi adicionada:

\`\`\`bash
# Verificar no package.json
cat package.json | grep "${libExample.split('/')[0]}"

# Ou listar dependências instaladas
npm list --depth=0
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 SOLUÇÃO DE PROBLEMAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se encontrar erros ao instalar:

1. Limpar o cache do npm:
   \`\`\`bash
   npm cache clean --force
   \`\`\`

2. Remover node_modules e reinstalar:
   \`\`\`bash
   rm -rf node_modules package-lock.json
   npm install
   \`\`\`

3. Verificar se o .npmrc está correto:
   \`\`\`bash
   cat .npmrc
   \`\`\`

4. Verificar conectividade com o registry:
   \`\`\`bash
   npm ping --registry https://nexus.devsecops-paas-prd.br.experian.eeca/repository/npm-group-repository/
   \`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 BIBLIOTECAS DISPONÍVEIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${libs.length > 0 ? libs.map(l => `• ${l.name}`).join('\n') : '• Consulte o Nexus para ver bibliotecas disponíveis'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Dica: Após instalar, use a tool 'get-component' para ver como usar os componentes!
`;
    return { content: [{ type: "text", text: instructions }] };
});
server.tool("find-library-by-name", "Busca biblioteca por nome e retorna versão, dependências. Use quando perguntar sobre biblioteca específica: 'versão da lib X', 'info sobre X', 'dependências de X'. IMPORTANTE: Forneça apenas informações técnicas, NÃO sugira estilização ou design visual.", { libraryName: z.string().min(1).describe("Nome da biblioteca (ex.: my-lib)") }, async ({ libraryName }) => {
    const root = await resolveWorkspaceRoot(import.meta.url);
    const libs = await discoverLibraries(import.meta.url);
    const lib = libs.find(l => l.name === libraryName);
    if (!lib) {
        const available = libs.map(l => `- ${l.name}`).join('\n') || '(nenhuma encontrada)';
        return { content: [{ type: "text", text: `Biblioteca '${libraryName}' não encontrada.\nBibliotecas disponíveis:\n${available}` }] };
    }
    const pkgPath = path.resolve(lib.root, "package.json");
    const content = await readFileIfExists(pkgPath);
    if (!content) {
        return { content: [{ type: "text", text: `package.json não encontrado para a biblioteca '${libraryName}' em ${lib.root}` }] };
    }
    try {
        const pkg = JSON.parse(content);
        const info = [
            `Nome: ${pkg.name || '(não definido)'}`,
            `Versão: ${pkg.version || '(não definido)'}`,
            `Descrição: ${pkg.description || '(não definido)'}`,
            `Caminho: ${lib.root}`,
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
    console.error("=".repeat(60));
    console.error("🌟 Lyra - Library Retrieval Assistant");
    console.error("   MCP Server for Angular Component Libraries");
    console.error("=".repeat(60));
    // Descobre e exibe bibliotecas disponíveis
    try {
        const libs = await discoverLibraries(import.meta.url);
        if (libs.length > 0) {
            console.error(`\n✓ ${libs.length} biblioteca(s) disponível(is):`);
            libs.forEach(lib => {
                console.error(`• ${lib.name}`);
                console.error(`Root: ${lib.root}`);
                console.error(`Entry: ${path.basename(lib.publicApi)}`);
            });
        }
        else {
            console.error("\n⚠ Nenhuma biblioteca encontrada!");
            console.error("  Verifique a configuração de paths ou o workspace.");
        }
    }
    catch (err) {
        console.error("\n⚠ Erro ao descobrir bibliotecas:", err);
    }
    console.error("\n" + "=".repeat(60));
    console.error("✨ Lyra is ready. Awaiting requests...");
    console.error("=".repeat(60) + "\n");
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
