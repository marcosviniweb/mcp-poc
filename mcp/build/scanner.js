import path from 'node:path';
import { collectExportChain } from './exports.js';
import { PUBLIC_API_RELATIVE, readFileIfExists, resolveWorkspaceRoot, readdirSafe, statIsDirectory } from './utils.js';
export async function listPotentialComponentFiles(importMetaUrl) {
    const WORKSPACE_ROOT = await resolveWorkspaceRoot(importMetaUrl);
    const publicApiPath = path.resolve(WORKSPACE_ROOT, PUBLIC_API_RELATIVE);
    const chain = await collectExportChain(publicApiPath, readFileIfExists);
    if (chain.length > 0)
        return chain;
    const componentsDir = path.resolve(WORKSPACE_ROOT, 'projects', 'my-lib', 'src', 'lib', 'components');
    return await walkComponents(componentsDir);
}
async function walkComponents(dir, acc = []) {
    const entries = await readdirSafe(dir);
    for (const entry of entries) {
        const full = path.join(dir, entry);
        if (await statIsDirectory(full)) {
            await walkComponents(full, acc);
        }
        else if (/\.component\.ts$/.test(entry)) {
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
    if (infos.length === 0) {
        const classRegex = /export\s+class\s+(\w+Component)\b/g;
        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            infos.push({ name: className, file: filePath });
        }
    }
    return infos;
}
