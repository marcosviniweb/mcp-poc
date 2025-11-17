import path from 'node:path';
import { extractClassBody, extractLeadingComment, parsePropertyLine, parseEventEmitterType, buildUsageSnippet, parseSignalInput, parseSignalOutput } from './parser.js';
import { readFileIfExists, readdirSafe, statIsDirectory } from './utils.js';
import { extractImports, enrichTypeInfo } from './import-resolver.js';
export async function parseDetailedComponent(filePath, className, selector, standalone, type) {
    const source = (await readFileIfExists(filePath)) || '';
    const classBlock = extractClassBody(source, className);
    const result = { name: className, file: filePath, selector, standalone, type, inputs: [], outputs: [] };
    if (!classBlock)
        return result;
    const imports = extractImports(source);
    result.imports = imports;
    const block = classBlock.body;
    const inputRegex = /@Input(?:\s*\(\s*(['\"][^'\"]+['\"])\s*\))?\s*/g;
    let m;
    while ((m = inputRegex.exec(block)) !== null) {
        const aliasRaw = m[1];
        const rest = block.slice(m.index + m[0].length);
        const semi = rest.indexOf(';');
        if (semi === -1)
            continue;
        const line = rest.slice(0, semi);
        const { name, type, required, defaultValue } = parsePropertyLine(line);
        if (!name)
            continue;
        const alias = aliasRaw ? aliasRaw.replace(/^['\"]|['\"]$/g, '') : undefined;
        const description = extractLeadingComment(block, m.index) || undefined;
        const resolvedType = await enrichTypeInfo(filePath, type, imports);
        result.inputs.push({
            name,
            alias,
            type,
            required,
            defaultValue,
            description,
            kind: 'decorator',
            resolvedType: resolvedType !== type ? resolvedType : undefined
        });
    }
    const signalInputLines = block.split('\n');
    for (let i = 0; i < signalInputLines.length; i++) {
        const line = signalInputLines[i];
        if (line.includes('= input')) {
            const parsed = parseSignalInput(line);
            if (parsed.name) {
                const description = i > 0 ? extractLeadingComment(signalInputLines.slice(Math.max(0, i - 3), i).join('\n'), 0) : undefined;
                const resolvedType = await enrichTypeInfo(filePath, parsed.type, imports);
                result.inputs.push({
                    name: parsed.name,
                    alias: parsed.alias,
                    type: parsed.type,
                    required: parsed.required,
                    defaultValue: parsed.defaultValue,
                    description,
                    kind: 'signal',
                    resolvedType: resolvedType !== parsed.type ? resolvedType : undefined
                });
            }
        }
    }
    const outputRegex = /@Output(?:\s*\(\s*(['\"][^'\"]+['\"])\s*\))?\s*/g;
    while ((m = outputRegex.exec(block)) !== null) {
        const aliasRaw = m[1];
        const rest = block.slice(m.index + m[0].length);
        const semi = rest.indexOf(';');
        if (semi === -1)
            continue;
        const line = rest.slice(0, semi);
        const { name, type } = parsePropertyLine(line);
        if (!name)
            continue;
        const alias = aliasRaw ? aliasRaw.replace(/^['\"]|['\"]$/g, '') : undefined;
        const eventType = parseEventEmitterType(type);
        const description = extractLeadingComment(block, m.index) || undefined;
        const resolvedType = await enrichTypeInfo(filePath, eventType || type, imports);
        result.outputs.push({
            name,
            alias,
            type: eventType || type,
            description,
            kind: 'decorator',
            resolvedType: resolvedType !== (eventType || type) ? resolvedType : undefined
        });
    }
    for (let i = 0; i < signalInputLines.length; i++) {
        const line = signalInputLines[i];
        if (line.includes('= output')) {
            const parsed = parseSignalOutput(line);
            if (parsed.name) {
                const description = i > 0 ? extractLeadingComment(signalInputLines.slice(Math.max(0, i - 3), i).join('\n'), 0) : undefined;
                const resolvedType = await enrichTypeInfo(filePath, parsed.type, imports);
                result.outputs.push({
                    name: parsed.name,
                    alias: parsed.alias,
                    type: parsed.type,
                    description,
                    kind: 'signal',
                    resolvedType: resolvedType !== parsed.type ? resolvedType : undefined
                });
            }
        }
    }
    return result;
}
/**
 * Busca exemplos de uso na documentação (apps/docs/src/app/docs/{component}/demos/)
 */
export async function findDocumentationExamples(componentName, libFilePath) {
    // Normaliza o nome do componente (remove prefixo Luds, converte para kebab-case)
    const normalizedName = componentName
        .replace(/^Luds/, '')
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
    // Sobe na hierarquia até encontrar a raiz do workspace (que tem apps/)
    let workspaceRoot = path.dirname(libFilePath);
    let attempts = 0;
    while (attempts < 10) {
        const appsPath = path.join(workspaceRoot, 'apps');
        if (await statIsDirectory(appsPath)) {
            break; // Encontrou a raiz do workspace
        }
        const parent = path.dirname(workspaceRoot);
        if (parent === workspaceRoot)
            break; // Chegou na raiz do sistema
        workspaceRoot = parent;
        attempts++;
    }
    // Caminhos possíveis para documentação
    const docsPaths = [
        path.join(workspaceRoot, 'apps', 'docs', 'src', 'app', 'docs', normalizedName),
        path.join(workspaceRoot, 'apps', 'docs', 'src', 'docs', normalizedName),
        path.join(workspaceRoot, 'docs', normalizedName),
    ];
    for (const docsPath of docsPaths) {
        // Verifica se existe pasta demos/
        const demosPath = path.join(docsPath, 'demos');
        if (!await statIsDirectory(demosPath))
            continue;
        // Lista arquivos .component.ts na pasta demos
        const files = await readdirSafe(demosPath);
        const demoFiles = files.filter(f => f.endsWith('.component.ts'));
        if (demoFiles.length === 0)
            continue;
        // Lê o primeiro exemplo encontrado
        const firstDemo = path.join(demosPath, demoFiles[0]);
        const content = await readFileIfExists(firstDemo);
        if (!content)
            continue;
        // Extrai o template do componente
        const templateMatch = /template\s*:\s*`([\s\S]*?)`/m.exec(content);
        if (!templateMatch)
            continue;
        const template = templateMatch[1];
        // Extrai imports do arquivo de demo
        const importsLines = [];
        const importRegex = /import\s+{([^}]+)}\s+from\s+['"]@luds\/ui\/blocks\/[^'"]+['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const items = match[1].split(',').map(s => s.trim()).filter(s => s);
            importsLines.push(...items);
        }
        const uniqueImports = Array.from(new Set(importsLines))
            .filter(imp => !imp.includes('provide'))
            .join(',\n  ');
        return `
📚 EXEMPLO DA DOCUMENTAÇÃO OFICIAL
${'━'.repeat(70)}

**Arquivo**: ${path.relative(workspaceRoot, firstDemo)}

**Imports necessários**:
\`\`\`typescript
import {
  ${uniqueImports}
} from '@luds/ui/blocks/${normalizedName}';
\`\`\`

**Template (exemplo real)**:
\`\`\`html
${template.trim().split('\n').slice(0, 50).join('\n')}
${template.split('\n').length > 50 ? '\n... (template completo na documentação)' : ''}
\`\`\`

💡 **Dica**: Este é um exemplo real extraído da documentação do projeto.
   Veja mais exemplos em: apps/docs/src/app/docs/${normalizedName}/
${'━'.repeat(70)}
`;
    }
    return null;
}
export function stringifyComponentDetails(root, detailed) {
    const rel = path.relative(root, detailed.file);
    const inputs = (detailed.inputs || []).map((i) => `  - ${i.alias || i.name}${i.required ? '' : '?'}: ${i.type || 'any'}${i.defaultValue ? ` = ${i.defaultValue}` : ''}${i.description ? ` // ${i.description}` : ''}`).join('\n') || '  (nenhum)';
    const outputs = (detailed.outputs || []).map((o) => `  - ${o.alias || o.name}: ${o.type || 'any'}${o.description ? ` // ${o.description}` : ''}`).join('\n') || '  (nenhum)';
    const usage = buildUsageSnippet(detailed);
    return [
        `Nome: ${detailed.name}`,
        `Selector: ${detailed.selector ?? '(não definido)'}`,
        `Standalone: ${detailed.standalone === undefined ? '(desconhecido)' : detailed.standalone}`,
        `Arquivo: ${rel}`,
        `Inputs:\n${inputs}`,
        `Outputs:\n${outputs}`,
        usage ? `Uso:\n${usage}` : ''
    ].filter(Boolean).join('\n');
}
