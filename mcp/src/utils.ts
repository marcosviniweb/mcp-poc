import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type DiscoveredLibrary = {
  name: string;
  root: string; // caminho absoluto do root do projeto
  sourceRoot?: string;
  publicApi: string; // caminho absoluto para public-api.ts
};

const __fileCache: Map<string, string | null> = new Map();

export async function readFileIfExists(filePath: string): Promise<string | null> {
  if (__fileCache.has(filePath)) return __fileCache.get(filePath)!;
  try {
    const data = await fs.readFile(filePath, 'utf8');
    __fileCache.set(filePath, data);
    return data;
  } catch {
    __fileCache.set(filePath, null);
    return null;
  }
}

export async function readJsonIfExists<T = any>(filePath: string): Promise<T | null> {
  const content = await readFileIfExists(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function getDefaultWorkspaceRoot(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '..', '..');
}

export async function resolveWorkspaceRoot(importMetaUrl: string): Promise<string> {
  const DEFAULT_WORKSPACE_ROOT = getDefaultWorkspaceRoot(importMetaUrl);
  const fromEnv = process.env.LIB_COMPONENTS_WORKSPACE || process.env.MCP_WORKSPACE_ROOT;
  if (fromEnv) {
    const angularJson = await readFileIfExists(path.resolve(fromEnv, 'angular.json'));
    if (angularJson !== null) return path.resolve(fromEnv);
    const workspaceJson = await readFileIfExists(path.resolve(fromEnv, 'workspace.json'));
    if (workspaceJson !== null) return path.resolve(fromEnv);
  }
  const argRoot = process.argv[2];
  if (argRoot) {
    const angularJson = await readFileIfExists(path.resolve(argRoot, 'angular.json'));
    if (angularJson !== null) return path.resolve(argRoot);
    const workspaceJson = await readFileIfExists(path.resolve(argRoot, 'workspace.json'));
    if (workspaceJson !== null) return path.resolve(argRoot);
  }
  const candidates = [
    DEFAULT_WORKSPACE_ROOT,
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..'),
  ];
  for (const root of candidates) {
    const angularJson = await readFileIfExists(path.resolve(root, 'angular.json'));
    if (angularJson !== null) return root;
    const workspaceJson = await readFileIfExists(path.resolve(root, 'workspace.json'));
    if (workspaceJson !== null) return root;
  }
  return DEFAULT_WORKSPACE_ROOT;
}

export async function readdirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

export async function statIsDirectory(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function discoverFromAngularJson(workspaceRoot: string): Promise<DiscoveredLibrary[]> {
  const angularPath = path.resolve(workspaceRoot, 'angular.json');
  const content = await readFileIfExists(angularPath);
  if (!content) return [];
  try {
    const json = JSON.parse(content);
    const projects = json.projects || {};
    const libs: DiscoveredLibrary[] = [];
    for (const [name, proj] of Object.entries<any>(projects)) {
      // Angular >=15 normalmente traz projectType
      const isLib = (proj.projectType === 'library') || true; // assume lib se não informado
      if (!isLib) continue;
      const root = path.resolve(workspaceRoot, proj.root || path.join('projects', name));
      const sourceRoot = proj.sourceRoot ? path.resolve(workspaceRoot, proj.sourceRoot) : path.resolve(root, 'src');
      const publicApi = path.resolve(sourceRoot, 'public-api.ts');
      libs.push({ name, root, sourceRoot, publicApi });
    }
    return libs;
  } catch {
    return [];
  }
}

async function findPublicApiFallback(workspaceRoot: string): Promise<DiscoveredLibrary[]> {
  // Caminha recursivamente procurando por public-api.ts dentro de projects/*/src
  const projectsDir = path.resolve(workspaceRoot, 'projects');
  const result: DiscoveredLibrary[] = [];
  const entries = await readdirSafe(projectsDir);
  for (const name of entries) {
    const projRoot = path.resolve(projectsDir, name);
    if (!(await statIsDirectory(projRoot))) continue;
    const sourceRoot = path.resolve(projRoot, 'src');
    const publicApi = path.resolve(sourceRoot, 'public-api.ts');
    if (await readFileIfExists(publicApi)) {
      result.push({ name, root: projRoot, sourceRoot, publicApi });
    }
  }
  return result;
}

export async function discoverLibraries(importMetaUrl: string): Promise<DiscoveredLibrary[]> {
  const root = await resolveWorkspaceRoot(importMetaUrl);
  const fromAngular = await discoverFromAngularJson(root);
  if (fromAngular.length > 0) return await withNgPackagrEntryFiles(root, fromAngular);
  const fromNx = await discoverFromNxWorkspace(root);
  if (fromNx.length > 0) return await withNgPackagrEntryFiles(root, fromNx);
  const fb = await findPublicApiFallback(root);
  return await withNgPackagrEntryFiles(root, fb);
}

// Nx: workspace.json e project.json
async function discoverFromNxWorkspace(workspaceRoot: string): Promise<DiscoveredLibrary[]> {
  const workspaceCfg = await readJsonIfExists<any>(path.resolve(workspaceRoot, 'workspace.json'));
  const libs: DiscoveredLibrary[] = [];
  if (workspaceCfg && workspaceCfg.projects) {
    for (const [name, proj] of Object.entries<any>(workspaceCfg.projects)) {
      const projRoot = typeof proj === 'string' ? path.resolve(workspaceRoot, proj) : path.resolve(workspaceRoot, proj.root || path.join('projects', name));
      const sourceRoot = typeof proj === 'string' ? path.resolve(projRoot, 'src') : (proj.sourceRoot ? path.resolve(workspaceRoot, proj.sourceRoot) : path.resolve(projRoot, 'src'));
      const publicApi = path.resolve(sourceRoot, 'public-api.ts');
      libs.push({ name, root: projRoot, sourceRoot, publicApi });
    }
    return libs;
  }
  // project.json por projeto
  const projectsDir = path.resolve(workspaceRoot, 'projects');
  const entries = await readdirSafe(projectsDir);
  for (const name of entries) {
    const projRoot = path.resolve(projectsDir, name);
    if (!(await statIsDirectory(projRoot))) continue;
    const projectJson = await readJsonIfExists<any>(path.resolve(projRoot, 'project.json'));
    if (!projectJson) continue;
    const sourceRoot = projectJson.sourceRoot ? path.resolve(workspaceRoot, projectJson.sourceRoot) : path.resolve(projRoot, 'src');
    const publicApi = path.resolve(sourceRoot, 'public-api.ts');
    libs.push({ name, root: projRoot, sourceRoot, publicApi });
  }
  return libs;
}

// ng-packagr: obter entryFile do root e dos entry points secundários
export type LibraryEntryPoint = { name: string; entryFile: string; kind: 'root' | 'secondary'; path: string };

export async function getLibraryEntryPoints(lib: DiscoveredLibrary): Promise<LibraryEntryPoint[]> {
  const result: LibraryEntryPoint[] = [];
  // root
  const rootNg = await readJsonIfExists<any>(path.resolve(lib.root, 'ng-package.json'));
  if (rootNg?.lib?.entryFile) {
    const entryFile = path.resolve(lib.root, rootNg.lib.entryFile);
    result.push({ name: 'root', entryFile, kind: 'root', path: path.resolve(lib.root) });
  } else if (await readFileIfExists(lib.publicApi)) {
    result.push({ name: 'root', entryFile: lib.publicApi, kind: 'root', path: path.resolve(lib.root) });
  }
  // secundários: procurar ng-package.json sob o root (exclui o do root)
  const stack: string[] = [lib.root];
  while (stack.length) {
    const dir = stack.pop()!;
    const entries = await readdirSafe(dir);
    for (const entry of entries) {
      const full = path.resolve(dir, entry);
      if (full === path.resolve(lib.root)) continue;
      if (await statIsDirectory(full)) {
        // checa ng-package.json
        const ep = await readJsonIfExists<any>(path.resolve(full, 'ng-package.json'));
        if (ep?.lib?.entryFile) {
          result.push({ name: path.basename(full), entryFile: path.resolve(full, ep.lib.entryFile), kind: 'secondary', path: full });
        } else {
          stack.push(full);
        }
      }
    }
  }
  return result;
}

async function withNgPackagrEntryFiles(workspaceRoot: string, libs: DiscoveredLibrary[]): Promise<DiscoveredLibrary[]> {
  // Ajusta publicApi com base no ng-packagr root entryFile quando disponível
  const adjusted: DiscoveredLibrary[] = [];
  for (const lib of libs) {
    const rootNg = await readJsonIfExists<any>(path.resolve(lib.root, 'ng-package.json'));
    if (rootNg?.lib?.entryFile) {
      adjusted.push({ ...lib, publicApi: path.resolve(lib.root, rootNg.lib.entryFile) });
    } else {
      adjusted.push(lib);
    }
  }
  return adjusted;
}


