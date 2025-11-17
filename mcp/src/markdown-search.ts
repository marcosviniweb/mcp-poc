import path from 'node:path';
import { readFileIfExists, readdirSafe, statIsDirectory } from './utils.js';

/**
 * Busca arquivos markdown recursivamente em um diretório
 * @param dir Diretório raiz para buscar
 * @param componentName Nome do componente para filtrar (opcional)
 * @param searchTerm Termo para buscar no conteúdo (opcional)
 * @returns Array com caminhos completos dos arquivos .md encontrados
 */
export async function findMarkdownFiles(
  dir: string,
  componentName?: string,
  searchTerm?: string
): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string, depth: number = 0): Promise<void> {
    if (depth > 5) return; // Limitar profundidade

    try {
      const entries = await readdirSafe(currentDir);

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);

        if (await statIsDirectory(fullPath)) {
          // SEMPRE entrar em subpastas para busca profunda
          await walk(fullPath, depth + 1);
        } else if (/\.(md|markdown)$/i.test(entry)) {
          // Aplicar filtros apenas nos arquivos .md encontrados
          let shouldInclude = true;
          
          // Filtro 1: Se componentName fornecido, verificar se o caminho contém o nome
          if (componentName && shouldInclude) {
            const searchName = componentName.toLowerCase();
            const relativePath = fullPath.toLowerCase();
            // Aceitar se o nome do componente estiver no caminho completo (pasta ou arquivo)
            shouldInclude = relativePath.includes(searchName);
          }
          
          // Filtro 2: Se searchTerm fornecido, verificar conteúdo do arquivo
          if (searchTerm && shouldInclude) {
            const content = await readFileIfExists(fullPath);
            shouldInclude = !!(content && content.toLowerCase().includes(searchTerm.toLowerCase()));
          }
          
          if (shouldInclude) {
            results.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Ignorar erros de permissão ou pasta inválida
    }
  }

  await walk(dir);
  return results;
}

/**
 * Encontra a raiz do workspace a partir das libs descobertas
 * @param libs Array de bibliotecas descobertas
 * @returns Set com as raízes de workspace encontradas
 */
export async function findWorkspaceRoots(libs: Array<{ root: string; name: string; publicApi: string }>): Promise<Set<string>> {
  const workspaceRoots = new Set<string>();

  for (const lib of libs) {
    // Tentar encontrar a raiz do workspace (onde está apps/, libs/, etc.)
    let current = lib.root;
    for (let i = 0; i < 5; i++) {
      const parent = path.dirname(current);
      if (parent === current) break; // Chegou na raiz do sistema
      current = parent;

      // Verificar se tem estrutura típica de workspace (apps/, libs/, etc.)
      try {
        const entries = await readdirSafe(current);
        if (entries.includes('apps') || entries.includes('libs')) {
          workspaceRoots.add(current);
          break;
        }
      } catch (err) {
        continue;
      }
    }
  }

  // Se não encontrou workspace roots, usar a raiz das libs mesmo
  if (workspaceRoots.size === 0 && libs.length > 0) {
    workspaceRoots.add(path.dirname(path.dirname(libs[0].root)));
  }

  return workspaceRoots;
}

/**
 * Retorna os caminhos possíveis onde a documentação pode estar
 * @param workspaceRoot Raiz do workspace
 * @returns Array com caminhos possíveis
 */
export function getPossibleDocsPaths(workspaceRoot: string): string[] {
  return [
    path.join(workspaceRoot, 'apps', 'docs', 'src'),
    path.join(workspaceRoot, 'apps', 'docs'),
    path.join(workspaceRoot, 'docs'),
    path.join(workspaceRoot, 'documentation'),
  ];
}
