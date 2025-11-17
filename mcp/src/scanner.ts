import path from 'node:path';
import { ComponentInfo } from './types.js';
import { collectExportChain } from './exports.js';
import { readFileIfExists, resolveWorkspaceRoot, readdirSafe, statIsDirectory, discoverLibraries, getLibraryEntryPoints } from './utils.js';

export async function listPotentialComponentFiles(importMetaUrl: string, libraryName?: string, entryPointName?: string): Promise<string[]> {
  const WORKSPACE_ROOT = await resolveWorkspaceRoot(importMetaUrl);
  const discovered = await discoverLibraries(importMetaUrl);
  let targetLib = discovered;
  if (libraryName) targetLib = discovered.filter((l) => l.name === libraryName);
  if (targetLib.length === 0 && libraryName) return []; 
  if (targetLib.length === 0 && discovered.length > 0) targetLib = discovered.slice(0, 1); // fallback: primeira
  const results: string[] = [];
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
      const componentsDir = path.resolve(ep.path, 'src','lib','components');
      const walked = await walkComponents(componentsDir);
      results.push(...walked);
    }
  }
  return Array.from(new Set(results));
}

async function walkComponents(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await readdirSafe(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (await statIsDirectory(full)) {
      await walkComponents(full, acc);
    } else if (/\.(component|directive|pipe)\.(ts|d\.ts)$/.test(entry) || 
               (/\.ts$/.test(entry) && !/\.(spec|test)\.ts$/.test(entry))) {
      // Inclui: .component.ts, .directive.ts, .pipe.ts e outros .ts (exceto specs)
      acc.push(full);
    }
  }
  return acc;
}

export async function extractComponentInfo(filePath: string): Promise<ComponentInfo[]> {
  const content = await readFileIfExists(filePath);
  if (!content) return [];
  const infos: ComponentInfo[] = [];
  
  // Tenta extrair componentes com decorador @Component
  const componentRegex = /@Component\s*\(\s*\{([\s\S]*?)\}\s*\)\s*export\s+class\s+(\w+)/g;
  let match: RegExpExecArray | null;
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


