import path from 'node:path';
import { ComponentInfo } from './types.js';
import { extractClassBody, extractLeadingComment, parsePropertyLine, parseEventEmitterType, buildUsageSnippet } from './parser.js';
import { readFileIfExists } from './utils.js';

export async function parseDetailedComponent(filePath: string, className: string, selector?: string, standalone?: boolean): Promise<ComponentInfo> {
  const source = (await readFileIfExists(filePath)) || '';
  const classBlock = extractClassBody(source, className);
  const result: ComponentInfo = { name: className, file: filePath, selector, standalone, inputs: [], outputs: [] };
  if (!classBlock) return result;
  const block = classBlock.body;
  const inputRegex = /@Input(?:\s*\(\s*(['\"][^'\"]+['\"])\s*\))?\s*/g;
  let m: RegExpExecArray | null;
  while ((m = inputRegex.exec(block)) !== null) {
    const aliasRaw = m[1];
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

export function stringifyComponentDetails(root: string, detailed: ComponentInfo): string {
  const rel = path.relative(root, detailed.file);
  const inputs = (detailed.inputs || []).map((i: NonNullable<ComponentInfo['inputs']>[number]) => `  - ${i.alias || i.name}${i.required ? '' : '?'}: ${i.type || 'any'}${i.defaultValue ? ` = ${i.defaultValue}` : ''}${i.description ? ` // ${i.description}` : ''}`).join('\n') || '  (nenhum)';
  const outputs = (detailed.outputs || []).map((o: NonNullable<ComponentInfo['outputs']>[number]) => `  - ${o.alias || o.name}: ${o.type || 'any'}${o.description ? ` // ${o.description}` : ''}`).join('\n') || '  (nenhum)';
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


