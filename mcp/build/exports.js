import path from 'node:path';
import { readFileIfExists } from './utils.js';
export async function parseReExports(fileContent) {
    const exports = [];
    const exportAllRegex = /export\s*\*\s*from\s*['\"](.+?)['\"];?/g;
    const exportNamedRegex = /export\s*\{[\s\S]*?\}\s*from\s*['\"](.+?)['\"];?/g;
    let match;
    while ((match = exportAllRegex.exec(fileContent)) !== null)
        exports.push({ specifier: '*', fromPath: match[1] });
    while ((match = exportNamedRegex.exec(fileContent)) !== null)
        exports.push({ specifier: 'named', fromPath: match[1] });
    return exports;
}
export async function resolveTsPath(baseFile, fromPath) {
    const baseDir = path.dirname(baseFile);
    const tryPaths = [
        path.resolve(baseDir, `${fromPath}.ts`),
        path.resolve(baseDir, `${fromPath}.mts`),
        path.resolve(baseDir, `${fromPath}.cts`),
        path.resolve(baseDir, fromPath, 'index.ts'),
    ];
    for (const p of tryPaths) {
        const content = await readFileIfExists(p);
        if (content !== null)
            return p;
    }
    return null;
}
export async function collectExportChain(entryFile, read = readFileIfExists, visited = new Set()) {
    const result = [];
    if (visited.has(entryFile))
        return result;
    visited.add(entryFile);
    const content = await read(entryFile);
    if (!content)
        return result;
    const reexports = await parseReExports(content);
    if (reexports.length === 0)
        return result;
    for (const re of reexports) {
        const next = await resolveTsPath(entryFile, re.fromPath);
        if (!next)
            continue;
        result.push(next);
        const nested = await collectExportChain(next, read, visited);
        result.push(...nested);
    }
    return Array.from(new Set(result));
}
