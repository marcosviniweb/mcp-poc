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
      
      // Se proj.root existe, usa ele; senão, tenta encontrar a biblioteca
      let root: string = path.resolve(workspaceRoot, name); // inicializa com fallback
      if (proj.root) {
        root = path.resolve(workspaceRoot, proj.root);
      } else {
        // Busca em pastas comuns
        const commonFolders = ['projects', 'libs', 'packages', 'modules'];
        for (const folder of commonFolders) {
          const candidate = path.resolve(workspaceRoot, folder, name);
          if (await statIsDirectory(candidate)) {
            root = candidate;
            break;
          }
        }
      }
      
      const sourceRoot = proj.sourceRoot ? path.resolve(workspaceRoot, proj.sourceRoot) : path.resolve(root, 'src');
      const publicApi = path.resolve(sourceRoot, 'public-api.ts');
      libs.push({ name, root, sourceRoot, publicApi });
    }
    return libs;
  } catch {
    return [];
  }
}

/**
 * Busca recursivamente por bibliotecas Angular em todo o workspace
 * Suporta qualquer estrutura: projects/, libs/, packages/, ou raiz
 */
async function findLibrariesRecursively(
  workspaceRoot: string,
  maxDepth: number = 4
): Promise<DiscoveredLibrary[]> {
  const result: DiscoveredLibrary[] = [];
  const visited = new Set<string>();
  
  // Pastas comuns de bibliotecas para priorizar
  const commonLibFolders = ['projects', 'libs', 'packages', 'modules', 'libraries'];
  
  async function search(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth || visited.has(dir)) return;
    visited.add(dir);
    
    // Ignora node_modules e outras pastas desnecessárias
    const basename = path.basename(dir);
    if (basename === 'node_modules' || basename === 'dist' || basename === '.git' || basename.startsWith('.')) {
      return;
    }
    
    // Verifica se é uma biblioteca (tem public-api.ts ou ng-package.json)
    const srcDir = path.resolve(dir, 'src');
    const publicApi = path.resolve(srcDir, 'public-api.ts');
    const ngPackage = path.resolve(dir, 'ng-package.json');
    
    if (await readFileIfExists(publicApi)) {
      const name = path.basename(dir);
      result.push({ name, root: dir, sourceRoot: srcDir, publicApi });
      return; // Não continua procurando dentro de uma lib encontrada
    } else if (await readFileIfExists(ngPackage)) {
      // Tem ng-package.json mas sem public-api.ts na estrutura padrão
      const name = path.basename(dir);
      result.push({ name, root: dir, sourceRoot: srcDir, publicApi });
      return;
    }
    
    // Continua buscando recursivamente
    const entries = await readdirSafe(dir);
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry);
      if (await statIsDirectory(fullPath)) {
        await search(fullPath, depth + 1);
      }
    }
  }
  
  // Primeiro busca nas pastas comuns (mais rápido)
  for (const folder of commonLibFolders) {
    const folderPath = path.resolve(workspaceRoot, folder);
    if (await statIsDirectory(folderPath)) {
      await search(folderPath, 1);
    }
  }
  
  // Se não encontrou nada, busca a partir da raiz (mais lento)
  if (result.length === 0) {
    await search(workspaceRoot, 0);
  }
  
  return result;
}

async function findPublicApiFallback(workspaceRoot: string): Promise<DiscoveredLibrary[]> {
  return await findLibrariesRecursively(workspaceRoot);
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
      let projRoot: string = path.resolve(workspaceRoot, name); // inicializa com fallback
      
      if (typeof proj === 'string') {
        projRoot = path.resolve(workspaceRoot, proj);
      } else if (proj.root) {
        projRoot = path.resolve(workspaceRoot, proj.root);
      } else {
        // Busca em pastas comuns
        const commonFolders = ['projects', 'libs', 'packages', 'modules'];
        for (const folder of commonFolders) {
          const candidate = path.resolve(workspaceRoot, folder, name);
          if (await statIsDirectory(candidate)) {
            projRoot = candidate;
            break;
          }
        }
      }
      
      const sourceRoot = typeof proj === 'string' 
        ? path.resolve(projRoot, 'src') 
        : (proj.sourceRoot ? path.resolve(workspaceRoot, proj.sourceRoot) : path.resolve(projRoot, 'src'));
      const publicApi = path.resolve(sourceRoot, 'public-api.ts');
      libs.push({ name, root: projRoot, sourceRoot, publicApi });
    }
    return libs;
  }
  
  // project.json por projeto - busca em múltiplas pastas comuns
  const commonFolders = ['projects', 'libs', 'packages', 'modules'];
  for (const folder of commonFolders) {
    const folderPath = path.resolve(workspaceRoot, folder);
    if (!(await statIsDirectory(folderPath))) continue;
    
    const entries = await readdirSafe(folderPath);
    for (const name of entries) {
      const projRoot = path.resolve(folderPath, name);
      if (!(await statIsDirectory(projRoot))) continue;
      const projectJson = await readJsonIfExists<any>(path.resolve(projRoot, 'project.json'));
      if (!projectJson) continue;
      const sourceRoot = projectJson.sourceRoot ? path.resolve(workspaceRoot, projectJson.sourceRoot) : path.resolve(projRoot, 'src');
      const publicApi = path.resolve(sourceRoot, 'public-api.ts');
      libs.push({ name, root: projRoot, sourceRoot, publicApi });
    }
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


