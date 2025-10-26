import path from 'node:path';
import { collectExportChain } from './exports.js';
import { readFileIfExists, resolveWorkspaceRoot, readdirSafe, statIsDirectory, discoverLibraries, getLibraryEntryPoints } from './utils.js';
export async function listPotentialComponentFiles(importMetaUrl, libraryName, entryPointName) {
    const WORKSPACE_ROOT = await resolveWorkspaceRoot(importMetaUrl);
    const discovered = await discoverLibraries(importMetaUrl);
    let targetLib = discovered;
    if (libraryName)
        targetLib = discovered.filter((l) => l.name === libraryName);
    if (targetLib.length === 0 && libraryName)
        return [];
    if (targetLib.length === 0 && discovered.length > 0)
        targetLib = discovered.slice(0, 1); // fallback: primeira
    const results = [];
    for (const lib of targetLib) {
        const entryPoints = await getLibraryEntryPoints(lib);
        const targetEps = entryPointName
            ? entryPoints.filter(e => e.name === entryPointName || e.path.endsWith(entryPointName))
            : entryPoints;
        for (const ep of targetEps) {
            const chain = await collectExportChain(ep.entryFile, readFileIfExists);
            if (chain.length > 0) {
                results.push(...chain);
                continue;
            }
            const componentsDir = path.resolve(ep.path, 'src', 'lib', 'components');
            const walked = await walkComponents(componentsDir);
            results.push(...walked);
        }
    }
    return Array.from(new Set(results));
}
async function walkComponents(dir, acc = []) {
    const entries = await readdirSafe(dir);
    for (const entry of entries) {
        const full = path.join(dir, entry);
        if (await statIsDirectory(full)) {
            await walkComponents(full, acc);
        }
        else if (/\.component\.(ts|d\.ts)$/.test(entry)) {
            // Suporta tanto .component.ts (código fonte) quanto .component.d.ts (compilado)
            acc.push(full);
        }
    }
    return acc;
}
export async function extractComponentInfo(filePath) {
    const content = await readFileIfExists(filePath);
    if (!content)
        return [];
    const infos = [];
    // Tenta extrair componentes com decorador @Component
    const componentRegex = /@Component\s*\(\s*\{([\s\S]*?)\}\s*\)\s*export\s+class\s+(\w+)/g;
    let match;
    while ((match = componentRegex.exec(content)) !== null) {
        const metaBlock = match[1];
        const className = match[2];
        const selectorMatch = /selector\s*:\s*['\"]([^'\"]+)['\"]/m.exec(metaBlock);
        const selector = selectorMatch?.[1];
        const standaloneMatch = /standalone\s*:\s*(true|false)/m.exec(metaBlock);
        const standalone = standaloneMatch ? standaloneMatch[1] === 'true' : undefined;
        infos.push({ name: className, file: filePath, selector, standalone });
    }
    // Se não encontrou com @Component, tenta extrair classes Component (arquivos .d.ts)
    if (infos.length === 0) {
        // Suporta: export class, export declare class
        const classRegex = /export\s+(?:declare\s+)?class\s+(\w+Component)\b/g;
        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            infos.push({ name: className, file: filePath });
        }
    }
    return infos;
}
