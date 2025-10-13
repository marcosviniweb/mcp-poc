import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const PUBLIC_API_RELATIVE = path.join('projects', 'my-lib', 'src', 'public-api.ts');
export async function readFileIfExists(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    }
    catch {
        return null;
    }
}
export function getDefaultWorkspaceRoot(importMetaUrl) {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '..', '..');
}
export async function resolveWorkspaceRoot(importMetaUrl) {
    const DEFAULT_WORKSPACE_ROOT = getDefaultWorkspaceRoot(importMetaUrl);
    const fromEnv = process.env.LIB_COMPONENTS_WORKSPACE || process.env.MCP_WORKSPACE_ROOT;
    if (fromEnv) {
        const p = path.resolve(fromEnv, PUBLIC_API_RELATIVE);
        const exists = await readFileIfExists(p);
        if (exists !== null)
            return path.resolve(fromEnv);
    }
    const argRoot = process.argv[2];
    if (argRoot) {
        const p = path.resolve(argRoot, PUBLIC_API_RELATIVE);
        const exists = await readFileIfExists(p);
        if (exists !== null)
            return path.resolve(argRoot);
    }
    const candidates = [
        DEFAULT_WORKSPACE_ROOT,
        path.resolve(process.cwd()),
        path.resolve(process.cwd(), '..'),
        path.resolve(process.cwd(), '..', '..'),
    ];
    for (const root of candidates) {
        const p = path.resolve(root, PUBLIC_API_RELATIVE);
        const exists = await readFileIfExists(p);
        if (exists !== null)
            return root;
    }
    return DEFAULT_WORKSPACE_ROOT;
}
export async function readdirSafe(dir) {
    try {
        return await fs.readdir(dir);
    }
    catch {
        return [];
    }
}
export async function statIsDirectory(p) {
    try {
        const s = await fs.stat(p);
        return s.isDirectory();
    }
    catch {
        return false;
    }
}
