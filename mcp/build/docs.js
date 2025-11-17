import path from 'node:path';
import { extractClassBody, extractLeadingComment, parsePropertyLine, parseEventEmitterType, buildUsageSnippet, parseSignalInput, parseSignalOutput } from './parser.js';
import { readFileIfExists } from './utils.js';
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
