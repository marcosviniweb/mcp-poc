import path from 'node:path';
import { collectExportChain } from './exports.js';
import { readFileIfExists, resolveWorkspaceRoot, readdirSafe, statIsDirectory, discoverLibraries, getLibraryEntryPoints } from './utils.js';
export async function listPotentialComponentFiles(importMetaUrl, libraryName, entryPointName) {
    const WORKSPACE_ROOT = await resolveWorkspaceRoot(importMetaUrl);
    const discovered = await discoverLibraries(importMetaUrl);
    console.error(`[list-components] Bibliotecas descobertas: ${discovered.length}`);
    let targetLib = discovered;
    if (libraryName) {
        console.error(`[list-components] Filtrando por libraryName: ${libraryName}`);
        targetLib = discovered.filter((l) => l.name === libraryName);
        if (targetLib.length === 0) {
            console.error(`[list-components] Nenhuma biblioteca encontrada com nome exato: ${libraryName}`);
            console.error(`[list-components] Tentando busca parcial (contains)...`);
            // Tenta busca parcial (ex: "lumina" encontra libs com "lumina" no nome)
            targetLib = discovered.filter((l) => l.name.toLowerCase().includes(libraryName.toLowerCase()));
            if (targetLib.length === 0) {
                console.error(`[list-components] Nenhuma biblioteca encontrada com busca parcial`);
                console.error(`[list-components] Listando TODAS as bibliotecas disponíveis como fallback`);
                targetLib = discovered; // Lista tudo se não encontrar
            }
            else {
                console.error(`[list-components] Encontradas ${targetLib.length} biblioteca(s) com busca parcial`);
            }
        }
    }
    if (targetLib.length === 0 && discovered.length > 0) {
        console.error(`[list-components] Usando todas as bibliotecas como fallback`);
        targetLib = discovered;
    }
    console.error(`[list-components] Processando ${targetLib.length} biblioteca(s)`);
    const results = [];
    for (const lib of targetLib) {
        console.error(`[list-components] Processando lib: ${lib.name} em ${lib.root}`);
        const entryPoints = await getLibraryEntryPoints(lib);
        console.error(`[list-components] Entry points encontrados: ${entryPoints.length}`);
        const targetEps = entryPointName
            ? entryPoints.filter(e => e.name === entryPointName || e.path.endsWith(entryPointName))
            : entryPoints;
        for (const ep of targetEps) {
            console.error(`[list-components] Processando entry point: ${ep.entryFile}`);
            const chain = await collectExportChain(ep.entryFile, readFileIfExists);
            console.error(`[list-components] Arquivos na export chain: ${chain.length}`);
            if (chain.length > 0) {
                results.push(...chain);
                continue;
            }
            // Fallback: busca em estruturas comuns
            const possibleDirs = [
                path.resolve(ep.path, 'src', 'lib', 'components'),
                path.resolve(ep.path, 'src'),
                ep.path
            ];
            for (const dir of possibleDirs) {
                const walked = await walkComponents(dir);
                if (walked.length > 0) {
                    console.error(`[list-components] Encontrados ${walked.length} arquivos em ${dir}`);
                    results.push(...walked);
                    break;
                }
            }
        }
    }
    console.error(`[list-components] Total de arquivos encontrados: ${results.length}`);
    return Array.from(new Set(results));
}
async function walkComponents(dir, acc = []) {
    const entries = await readdirSafe(dir);
    for (const entry of entries) {
        const full = path.join(dir, entry);
        if (await statIsDirectory(full)) {
            await walkComponents(full, acc);
        }
        else if (/\.(component|directive|pipe)\.(ts|d\.ts)$/.test(entry) ||
            (/\.ts$/.test(entry) && !/\.(spec|test)\.ts$/.test(entry))) {
            // Inclui: .component.ts, .directive.ts, .pipe.ts e outros .ts (exceto specs)
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
        // Detecta se usa hostDirectives (componente wrapper de diretiva)
        const hasHostDirectives = /hostDirectives\s*:\s*\[/.test(metaBlock);
        const hasEmptyTemplate = /template\s*:\s*[`'"][\s]*[`'"]/m.test(metaBlock);
        const isDirectiveWrapper = hasHostDirectives && hasEmptyTemplate;
        infos.push({
            name: className,
            file: filePath,
            selector,
            standalone,
            type: 'component',
            isDirectiveWrapper
        });
    }
    // Tenta extrair diretivas com decorador @Directive
    const directiveRegex = /@Directive\s*\(\s*\{([\s\S]*?)\}\s*\)\s*export\s+class\s+(\w+)/g;
    while ((match = directiveRegex.exec(content)) !== null) {
        const metaBlock = match[1];
        const className = match[2];
        const selectorMatch = /selector\s*:\s*['\"]([^'\"]+)['\"]/m.exec(metaBlock);
        const selector = selectorMatch?.[1];
        const standaloneMatch = /standalone\s*:\s*(true|false)/m.exec(metaBlock);
        const standalone = standaloneMatch ? standaloneMatch[1] === 'true' : undefined;
        infos.push({ name: className, file: filePath, selector, standalone, type: 'directive' });
    }
    // Se não encontrou com @Component ou @Directive, tenta extrair classes Component/Directive (arquivos .d.ts)
    if (infos.length === 0) {
        // Suporta: export class, export declare class
        const classRegex = /export\s+(?:declare\s+)?class\s+(\w+(?:Component|Directive))\b/g;
        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            const type = className.endsWith('Directive') ? 'directive' : 'component';
            infos.push({ name: className, file: filePath, type });
        }
    }
    return infos;
}
