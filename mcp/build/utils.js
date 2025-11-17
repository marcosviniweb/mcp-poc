import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
const __fileCache = new Map();
export async function readFileIfExists(filePath) {
    if (__fileCache.has(filePath))
        return __fileCache.get(filePath);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        __fileCache.set(filePath, data);
        return data;
    }
    catch {
        __fileCache.set(filePath, null);
        return null;
    }
}
export async function readJsonIfExists(filePath) {
    const content = await readFileIfExists(filePath);
    if (!content)
        return null;
    try {
        return JSON.parse(content);
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
        const angularJson = await readFileIfExists(path.resolve(fromEnv, 'angular.json'));
        if (angularJson !== null)
            return path.resolve(fromEnv);
        const workspaceJson = await readFileIfExists(path.resolve(fromEnv, 'workspace.json'));
        if (workspaceJson !== null)
            return path.resolve(fromEnv);
    }
    const argRoot = process.argv[2];
    if (argRoot) {
        const angularJson = await readFileIfExists(path.resolve(argRoot, 'angular.json'));
        if (angularJson !== null)
            return path.resolve(argRoot);
        const workspaceJson = await readFileIfExists(path.resolve(argRoot, 'workspace.json'));
        if (workspaceJson !== null)
            return path.resolve(argRoot);
    }
    const candidates = [
        DEFAULT_WORKSPACE_ROOT,
        path.resolve(process.cwd()),
        path.resolve(process.cwd(), '..'),
        path.resolve(process.cwd(), '..', '..'),
    ];
    for (const root of candidates) {
        const angularJson = await readFileIfExists(path.resolve(root, 'angular.json'));
        if (angularJson !== null)
            return root;
        const workspaceJson = await readFileIfExists(path.resolve(root, 'workspace.json'));
        if (workspaceJson !== null)
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
async function discoverFromAngularJson(workspaceRoot) {
    const angularPath = path.resolve(workspaceRoot, 'angular.json');
    const content = await readFileIfExists(angularPath);
    if (!content)
        return [];
    try {
        const json = JSON.parse(content);
        const projects = json.projects || {};
        const libs = [];
        for (const [name, proj] of Object.entries(projects)) {
            // Angular >=15 normalmente traz projectType
            const isLib = (proj.projectType === 'library') || true; // assume lib se não informado
            if (!isLib)
                continue;
            // Se proj.root existe, usa ele; senão, tenta encontrar a biblioteca
            let root = path.resolve(workspaceRoot, name); // inicializa com fallback
            if (proj.root) {
                root = path.resolve(workspaceRoot, proj.root);
            }
            else {
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
    }
    catch {
        return [];
    }
}
/**
 * Busca recursivamente por bibliotecas Angular em todo o workspace
 * Suporta qualquer estrutura: projects/, libs/, packages/, ou raiz
 */
async function findLibrariesRecursively(workspaceRoot, maxDepth = 4) {
    const result = [];
    const visited = new Set();
    // Pastas comuns de bibliotecas para priorizar
    const commonLibFolders = ['projects', 'libs', 'packages', 'modules', 'libraries'];
    async function search(dir, depth) {
        if (depth > maxDepth || visited.has(dir))
            return;
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
        }
        else if (await readFileIfExists(ngPackage)) {
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
async function findPublicApiFallback(workspaceRoot) {
    return await findLibrariesRecursively(workspaceRoot);
}
/**
 * Parseia múltiplos caminhos de bibliotecas separados por ; (Windows) ou : (Unix)
 * Suporta tanto variável de ambiente quanto argumentos CLI
 */
export function parseLibraryPaths() {
    const paths = [];
    const delimiter = path.delimiter;
    // Debug: mostra todos os argumentos recebidos
    console.error(`[MCP] process.argv: ${JSON.stringify(process.argv)}`);
    // 1. Verifica argumentos CLI: --libs path1 path2 path3
    const libsArgIndex = process.argv.indexOf('--libs');
    console.error(`[MCP] --libs encontrado no índice: ${libsArgIndex}`);
    if (libsArgIndex !== -1) {
        // Coleta todos os argumentos após --libs até encontrar outro flag ou fim
        for (let i = libsArgIndex + 1; i < process.argv.length; i++) {
            const arg = process.argv[i];
            console.error(`[MCP] Processando argumento[${i}]: ${arg}`);
            if (arg.startsWith('--'))
                break;
            // Se contém separador específico da plataforma, divide
            if (arg.includes(delimiter)) {
                const split = arg.split(delimiter);
                console.error(`[MCP] Dividindo por delimiter: ${JSON.stringify(split)}`);
                paths.push(...split);
            }
            else {
                paths.push(arg);
            }
        }
    }
    // 2. Verifica variável de ambiente
    const envPaths = process.env.LIB_COMPONENTS_PATHS;
    if (envPaths) {
        console.error(`[MCP] Variável de ambiente LIB_COMPONENTS_PATHS: ${envPaths}`);
        // Usa o delimitador de path específico da plataforma
        // - Windows: ';' (não quebra em 'C:\')
        // - Unix-like: ':'
        paths.push(...envPaths.split(delimiter));
    }
    // Remove paths vazios e normaliza
    const normalized = paths
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => path.resolve(p));
    console.error(`[MCP] Paths finais normalizados: ${JSON.stringify(normalized)}`);
    return normalized;
}
/**
 * Descobre bibliotecas através do tsconfig.base.json paths
 * Suporta padrões como:
 * - "@luds/ui/blocks/*": ["libs/ui/blocks/*\/src/index.ts"]
 * - "@luds/ui/components/*": ["libs/ui/components/*\/src/index.ts"]
 */
async function discoverLibrariesFromTsConfig(workspaceRoot) {
    const tsconfigPath = path.resolve(workspaceRoot, 'tsconfig.base.json');
    const tsconfig = await readJsonIfExists(tsconfigPath);
    if (!tsconfig?.compilerOptions?.paths) {
        return [];
    }
    const libs = [];
    const paths = tsconfig.compilerOptions.paths;
    for (const [alias, mappings] of Object.entries(paths)) {
        // Processa apenas aliases com wildcard que apontam para componentes/blocks
        if (!alias.includes('*'))
            continue;
        if (!alias.includes('/components/') && !alias.includes('/blocks/'))
            continue;
        for (const mapping of mappings) {
            // Remove o wildcard e pega o diretório base
            // Ex: "libs/ui/blocks/*/src/index.ts" -> "libs/ui/blocks"
            const basePath = mapping.split('/*')[0];
            const fullBasePath = path.resolve(workspaceRoot, basePath);
            // Verifica se o diretório existe
            if (!await statIsDirectory(fullBasePath))
                continue;
            // Lista todos os subdiretórios (cada um é uma biblioteca/componente)
            const entries = await readdirSafe(fullBasePath);
            for (const entry of entries) {
                const libRoot = path.resolve(fullBasePath, entry);
                if (!await statIsDirectory(libRoot))
                    continue;
                // Reconstrói o caminho do entry point
                // Ex: libs/ui/blocks/card/src/index.ts
                const entryPath = mapping.replace('*', entry);
                const fullEntryPath = path.resolve(workspaceRoot, entryPath);
                // Verifica se o entry point existe
                if (!await readFileIfExists(fullEntryPath))
                    continue;
                const name = `${alias.split('/').slice(0, -1).join('/')}/${entry}`.replace('@', '');
                const sourceRoot = path.dirname(fullEntryPath);
                libs.push({
                    name,
                    root: libRoot,
                    sourceRoot,
                    publicApi: fullEntryPath
                });
            }
        }
    }
    return libs;
}
/**
 * Descobre bibliotecas a partir de um path específico
 * Detecta automaticamente se é: workspace completo, lib específica, ou dist/
 */
async function discoverLibraryFromPath(libPath) {
    // Verifica se existe
    if (!await statIsDirectory(libPath)) {
        console.error(`[MCP] Caminho não encontrado ou não é um diretório: ${libPath}`);
        return [];
    }
    // Caso 1: É um workspace completo (tem angular.json, workspace.json ou tsconfig.base.json com paths)
    const angularJson = await readFileIfExists(path.resolve(libPath, 'angular.json'));
    if (angularJson) {
        const libs = await discoverFromAngularJson(libPath);
        if (libs.length > 0)
            return libs;
    }
    const workspaceJson = await readFileIfExists(path.resolve(libPath, 'workspace.json'));
    if (workspaceJson) {
        const libs = await discoverFromNxWorkspace(libPath);
        if (libs.length > 0)
            return libs;
    }
    // Tenta descobrir através do tsconfig.base.json (Nx monorepo)
    const tsconfigBase = await readFileIfExists(path.resolve(libPath, 'tsconfig.base.json'));
    if (tsconfigBase) {
        const libs = await discoverLibrariesFromTsConfig(libPath);
        if (libs.length > 0) {
            console.error(`[MCP] Encontradas ${libs.length} biblioteca(s) via tsconfig.base.json paths`);
            return libs;
        }
    }
    // Caso 2: É uma biblioteca específica (tem package.json e src/ ou dist/)
    const packageJson = await readFileIfExists(path.resolve(libPath, 'package.json'));
    if (packageJson) {
        try {
            const pkg = JSON.parse(packageJson);
            const name = pkg.name || path.basename(libPath);
            // Verifica src/public-api.ts (código fonte)
            const srcPublicApi = path.resolve(libPath, 'src', 'public-api.ts');
            if (await readFileIfExists(srcPublicApi)) {
                return [{
                        name,
                        root: libPath,
                        sourceRoot: path.resolve(libPath, 'src'),
                        publicApi: srcPublicApi
                    }];
            }
            // Verifica dist/ (biblioteca compilada) - busca index.d.ts ou public-api.d.ts
            const distDir = path.resolve(libPath, 'dist');
            if (await statIsDirectory(distDir)) {
                // Busca recursivamente por index.d.ts ou public-api.d.ts
                const dtsFiles = await findDtsEntryPoint(distDir);
                if (dtsFiles.length > 0) {
                    return [{
                            name,
                            root: libPath,
                            sourceRoot: distDir,
                            publicApi: dtsFiles[0]
                        }];
                }
            }
            // Caso 3: É um node_modules/@scope/lib - busca diretamente por .d.ts
            const dtsFiles = await findDtsEntryPoint(libPath);
            if (dtsFiles.length > 0) {
                return [{
                        name,
                        root: libPath,
                        sourceRoot: libPath,
                        publicApi: dtsFiles[0]
                    }];
            }
        }
        catch (err) {
            console.error(`[MCP] Erro ao processar package.json em ${libPath}:`, err);
        }
    }
    // Caso 4: Busca recursiva (fallback)
    const libs = await findLibrariesRecursively(libPath, 3);
    return libs;
}
/**
 * Busca por arquivos .d.ts que servem como entry point (index.d.ts ou public-api.d.ts)
 */
async function findDtsEntryPoint(dir, maxDepth = 2) {
    const results = [];
    async function search(currentDir, depth) {
        if (depth > maxDepth)
            return;
        const entries = await readdirSafe(currentDir);
        // Prioriza index.d.ts e public-api.d.ts na raiz
        for (const name of ['index.d.ts', 'public-api.d.ts', 'public_api.d.ts']) {
            const candidate = path.resolve(currentDir, name);
            if (await readFileIfExists(candidate)) {
                results.push(candidate);
                return;
            }
        }
        // Busca em subdiretórios
        for (const entry of entries) {
            const fullPath = path.resolve(currentDir, entry);
            if (await statIsDirectory(fullPath)) {
                const basename = path.basename(fullPath);
                // Ignora pastas desnecessárias
                if (basename !== 'node_modules' && !basename.startsWith('.')) {
                    await search(fullPath, depth + 1);
                }
            }
        }
    }
    await search(dir, 0);
    return results;
}
/**
 * Descobre bibliotecas de múltiplos paths configurados
 */
async function discoverLibrariesFromPaths(paths) {
    const allLibs = [];
    for (const libPath of paths) {
        const libs = await discoverLibraryFromPath(libPath);
        allLibs.push(...libs);
    }
    return allLibs;
}
export async function discoverLibraries(importMetaUrl) {
    // 1. Prioridade: Paths configurados via CLI ou env var
    const configuredPaths = parseLibraryPaths();
    if (configuredPaths.length > 0) {
        console.error(`[MCP] Usando paths configurados: ${configuredPaths.length} path(s)`);
        configuredPaths.forEach(p => console.error(`  - ${p}`));
        const libs = await discoverLibrariesFromPaths(configuredPaths);
        if (libs.length > 0) {
            console.error(`[MCP] Encontradas ${libs.length} biblioteca(s) nos paths configurados`);
            return await withNgPackagrEntryFiles('', libs);
        }
        console.error(`[MCP] Nenhuma biblioteca encontrada nos paths configurados`);
    }
    // 2. Fallback: Workspace atual (comportamento original)
    console.error(`[MCP] Buscando bibliotecas no workspace atual...`);
    const root = await resolveWorkspaceRoot(importMetaUrl);
    console.error(`[MCP] Workspace root: ${root}`);
    // Tenta tsconfig.base.json primeiro (Nx monorepo)
    const fromTsConfig = await discoverLibrariesFromTsConfig(root);
    if (fromTsConfig.length > 0) {
        console.error(`[MCP] Encontradas ${fromTsConfig.length} biblioteca(s) via tsconfig.base.json`);
        return fromTsConfig;
    }
    const fromAngular = await discoverFromAngularJson(root);
    if (fromAngular.length > 0) {
        console.error(`[MCP] Encontradas ${fromAngular.length} biblioteca(s) via angular.json`);
        return await withNgPackagrEntryFiles(root, fromAngular);
    }
    const fromNx = await discoverFromNxWorkspace(root);
    if (fromNx.length > 0) {
        console.error(`[MCP] Encontradas ${fromNx.length} biblioteca(s) via workspace.json`);
        return await withNgPackagrEntryFiles(root, fromNx);
    }
    const fb = await findPublicApiFallback(root);
    console.error(`[MCP] Encontradas ${fb.length} biblioteca(s) via busca recursiva`);
    return await withNgPackagrEntryFiles(root, fb);
}
// Nx: workspace.json e project.json
async function discoverFromNxWorkspace(workspaceRoot) {
    const workspaceCfg = await readJsonIfExists(path.resolve(workspaceRoot, 'workspace.json'));
    const libs = [];
    if (workspaceCfg && workspaceCfg.projects) {
        for (const [name, proj] of Object.entries(workspaceCfg.projects)) {
            let projRoot = path.resolve(workspaceRoot, name); // inicializa com fallback
            if (typeof proj === 'string') {
                projRoot = path.resolve(workspaceRoot, proj);
            }
            else if (proj.root) {
                projRoot = path.resolve(workspaceRoot, proj.root);
            }
            else {
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
        if (!(await statIsDirectory(folderPath)))
            continue;
        const entries = await readdirSafe(folderPath);
        for (const name of entries) {
            const projRoot = path.resolve(folderPath, name);
            if (!(await statIsDirectory(projRoot)))
                continue;
            const projectJson = await readJsonIfExists(path.resolve(projRoot, 'project.json'));
            if (!projectJson)
                continue;
            const sourceRoot = projectJson.sourceRoot ? path.resolve(workspaceRoot, projectJson.sourceRoot) : path.resolve(projRoot, 'src');
            const publicApi = path.resolve(sourceRoot, 'public-api.ts');
            libs.push({ name, root: projRoot, sourceRoot, publicApi });
        }
    }
    return libs;
}
export async function getLibraryEntryPoints(lib) {
    const result = [];
    // root
    const rootNg = await readJsonIfExists(path.resolve(lib.root, 'ng-package.json'));
    if (rootNg?.lib?.entryFile) {
        const entryFile = path.resolve(lib.root, rootNg.lib.entryFile);
        result.push({ name: 'root', entryFile, kind: 'root', path: path.resolve(lib.root) });
    }
    else if (await readFileIfExists(lib.publicApi)) {
        result.push({ name: 'root', entryFile: lib.publicApi, kind: 'root', path: path.resolve(lib.root) });
    }
    // secundários: procurar ng-package.json sob o root (exclui o do root)
    const stack = [lib.root];
    while (stack.length) {
        const dir = stack.pop();
        const entries = await readdirSafe(dir);
        for (const entry of entries) {
            const full = path.resolve(dir, entry);
            if (full === path.resolve(lib.root))
                continue;
            if (await statIsDirectory(full)) {
                // checa ng-package.json
                const ep = await readJsonIfExists(path.resolve(full, 'ng-package.json'));
                if (ep?.lib?.entryFile) {
                    result.push({ name: path.basename(full), entryFile: path.resolve(full, ep.lib.entryFile), kind: 'secondary', path: full });
                }
                else {
                    stack.push(full);
                }
            }
        }
    }
    return result;
}
async function withNgPackagrEntryFiles(workspaceRoot, libs) {
    // Ajusta publicApi com base no ng-packagr root entryFile quando disponível
    const adjusted = [];
    for (const lib of libs) {
        const rootNg = await readJsonIfExists(path.resolve(lib.root, 'ng-package.json'));
        if (rootNg?.lib?.entryFile) {
            adjusted.push({ ...lib, publicApi: path.resolve(lib.root, rootNg.lib.entryFile) });
        }
        else {
            adjusted.push(lib);
        }
    }
    return adjusted;
}
