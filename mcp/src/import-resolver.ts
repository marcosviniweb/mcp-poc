import path from 'node:path';
import { readFileIfExists } from './utils.js';
import { ImportInfo } from './types.js';

const __typeCache = new Map<string, string | null>();

/**
 * Extrai todos os imports de um arquivo TypeScript
 */
export function extractImports(source: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"](.*?)['"]/g;
  let match: RegExpExecArray | null;
  
  while ((match = namedImportRegex.exec(source)) !== null) {
    const names = match[1];
    const from = match[2];
    
    const items = names.split(',').map(n => n.trim());
    for (const item of items) {
      const isType = item.startsWith('type ');
      const name = isType ? item.replace(/^type\s+/, '') : item;
      const cleanName = name.split(/\s+as\s+/)[0].trim();
      if (cleanName) {
        imports.push({ name: cleanName, from, isType });
      }
    }
  }
  
  const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](.*?)['"]/g;
  while ((match = namespaceRegex.exec(source)) !== null) {
    imports.push({ name: match[1], from: match[2], isType: false });
  }
  
  const defaultRegex = /import\s+(\w+)\s+from\s+['"](.*?)['"]/g;
  while ((match = defaultRegex.exec(source)) !== null) {
    imports.push({ name: match[1], from: match[2], isType: false });
  }
  
  return imports;
}

/**
 * Resolve o caminho de um import relativo
 */
export async function resolveImportPath(baseFile: string, importPath: string): Promise<string | null> {
  if (importPath.startsWith('.')) {
    const baseDir = path.dirname(baseFile);
    const tryPaths = [
      path.resolve(baseDir, `${importPath}.ts`),
      path.resolve(baseDir, `${importPath}.d.ts`),
      path.resolve(baseDir, importPath, 'index.ts'),
      path.resolve(baseDir, importPath, 'index.d.ts'),
    ];
    
    for (const p of tryPaths) {
      const content = await readFileIfExists(p);
      if (content !== null) return p;
    }
  }
  return null;
}

/**
 * Busca a definição de um tipo em um arquivo
 */
export function findTypeDefinition(source: string, typeName: string): string | null {
  const interfaceRegex = new RegExp(`interface\\s+${typeName}\\s*\\{([^}]+)\\}`, 's');
  const interfaceMatch = interfaceRegex.exec(source);
  if (interfaceMatch) {
    return `interface ${typeName} { ${interfaceMatch[1].trim()} }`;
  }
  
  const typeAliasRegex = new RegExp(`type\\s+${typeName}\\s*=\\s*([^;]+);`, 's');
  const typeMatch = typeAliasRegex.exec(source);
  if (typeMatch) {
    return `type ${typeName} = ${typeMatch[1].trim()}`;
  }
  
  const enumRegex = new RegExp(`enum\\s+${typeName}\\s*\\{([^}]+)\\}`, 's');
  const enumMatch = enumRegex.exec(source);
  if (enumMatch) {
    return `enum ${typeName} { ${enumMatch[1].trim()} }`;
  }
  
  const classRegex = new RegExp(`class\\s+${typeName}\\b`);
  if (classRegex.test(source)) {
    return `class ${typeName}`;
  }
  
  return null;
}

/**
 * Resolve um tipo importado e retorna sua definição
 */
export async function resolveImportedType(
  baseFile: string,
  typeName: string,
  imports: ImportInfo[]
): Promise<string | null> {
  const cacheKey = `${baseFile}:${typeName}`;
  if (__typeCache.has(cacheKey)) {
    return __typeCache.get(cacheKey)!;
  }
  
  const importInfo = imports.find(i => i.name === typeName);
  if (!importInfo) {
    __typeCache.set(cacheKey, null);
    return null;
  }
  
  const resolvedPath = await resolveImportPath(baseFile, importInfo.from);
  if (!resolvedPath) {
    __typeCache.set(cacheKey, null);
    return null;
  }
  
  const content = await readFileIfExists(resolvedPath);
  if (!content) {
    __typeCache.set(cacheKey, null);
    return null;
  }
  
  const definition = findTypeDefinition(content, typeName);
  __typeCache.set(cacheKey, definition);
  return definition;
}

export async function enrichTypeInfo(
  baseFile: string,
  type: string | undefined,
  imports: ImportInfo[]
): Promise<string | undefined> {
  if (!type) return type;
  
  const baseTypeMatch = /^([A-Z]\w+)/.exec(type.trim());
  if (!baseTypeMatch) return type;
  
  const baseType = baseTypeMatch[1];
  
  const primitives = ['String', 'Number', 'Boolean', 'Date', 'Array', 'Object', 'Function', 'Promise', 'EventEmitter'];
  if (primitives.includes(baseType)) return type;
  
  const resolved = await resolveImportedType(baseFile, baseType, imports);
  if (resolved) {
    return `${type} /* ${resolved} */`;
  }
  
  return type;
}

