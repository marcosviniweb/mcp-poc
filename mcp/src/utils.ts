import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type DiscoveredLibrary = {
  name: string;
  root: string; // caminho absoluto do root do projeto
  sourceRoot?: string;
  publicApi: string; // caminho absoluto para public-api.ts
};

export async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
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
  }
  const argRoot = process.argv[2];
  if (argRoot) {
    const angularJson = await readFileIfExists(path.resolve(argRoot, 'angular.json'));
    if (angularJson !== null) return path.resolve(argRoot);
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
  if (fromAngular.length > 0) return fromAngular;
  return await findPublicApiFallback(root);
}


