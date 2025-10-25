import path from 'node:path';
import { readFileIfExists } from './utils.js';
const __typeCache = new Map();
/**
 * Extrai todos os imports de um arquivo TypeScript
 */
export function extractImports(source) {
    const imports = [];
    // import { A, B, type C } from './path'
    const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"](.*?)['"]/g;
    let match;
    while ((match = namedImportRegex.exec(source)) !== null) {
        const names = match[1];
        const from = match[2];
        // Parseia cada item importado
        const items = names.split(',').map(n => n.trim());
        for (const item of items) {
            const isType = item.startsWith('type ');
            const name = isType ? item.replace(/^type\s+/, '') : item;
            // Remove alias "as"
            const cleanName = name.split(/\s+as\s+/)[0].trim();
            if (cleanName) {
                imports.push({ name: cleanName, from, isType });
            }
        }
    }
    // import * as Name from './path'
    const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](.*?)['"]/g;
    while ((match = namespaceRegex.exec(source)) !== null) {
        imports.push({ name: match[1], from: match[2], isType: false });
    }
    // import DefaultImport from './path'
    const defaultRegex = /import\s+(\w+)\s+from\s+['"](.*?)['"]/g;
    while ((match = defaultRegex.exec(source)) !== null) {
        imports.push({ name: match[1], from: match[2], isType: false });
    }
    return imports;
}
/**
 * Resolve o caminho de um import relativo
 */
export async function resolveImportPath(baseFile, importPath) {
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
            if (content !== null)
                return p;
        }
    }
    return null;
}
/**
 * Busca a definição de um tipo em um arquivo
 */
export function findTypeDefinition(source, typeName) {
    // interface TypeName { ... }
    const interfaceRegex = new RegExp(`interface\\s+${typeName}\\s*\\{([^}]+)\\}`, 's');
    const interfaceMatch = interfaceRegex.exec(source);
    if (interfaceMatch) {
        return `interface ${typeName} { ${interfaceMatch[1].trim()} }`;
    }
    // type TypeName = ...
    const typeAliasRegex = new RegExp(`type\\s+${typeName}\\s*=\\s*([^;]+);`, 's');
    const typeMatch = typeAliasRegex.exec(source);
    if (typeMatch) {
        return `type ${typeName} = ${typeMatch[1].trim()}`;
    }
    // enum TypeName { ... }
    const enumRegex = new RegExp(`enum\\s+${typeName}\\s*\\{([^}]+)\\}`, 's');
    const enumMatch = enumRegex.exec(source);
    if (enumMatch) {
        return `enum ${typeName} { ${enumMatch[1].trim()} }`;
    }
    // class TypeName { ... } (simplificado)
    const classRegex = new RegExp(`class\\s+${typeName}\\b`);
    if (classRegex.test(source)) {
        return `class ${typeName}`;
    }
    return null;
}
/**
 * Resolve um tipo importado e retorna sua definição
 */
export async function resolveImportedType(baseFile, typeName, imports) {
    const cacheKey = `${baseFile}:${typeName}`;
    if (__typeCache.has(cacheKey)) {
        return __typeCache.get(cacheKey);
    }
    // Encontra o import desse tipo
    const importInfo = imports.find(i => i.name === typeName);
    if (!importInfo) {
        __typeCache.set(cacheKey, null);
        return null;
    }
    // Resolve o caminho do import
    const resolvedPath = await resolveImportPath(baseFile, importInfo.from);
    if (!resolvedPath) {
        __typeCache.set(cacheKey, null);
        return null;
    }
    // Lê o arquivo e busca a definição
    const content = await readFileIfExists(resolvedPath);
    if (!content) {
        __typeCache.set(cacheKey, null);
        return null;
    }
    const definition = findTypeDefinition(content, typeName);
    __typeCache.set(cacheKey, definition);
    return definition;
}
/**
 * Enriquece um tipo com informações resolvidas dos imports
 */
export async function enrichTypeInfo(baseFile, type, imports) {
    if (!type)
        return type;
    // Extrai o tipo base (remove genéricos, arrays, etc)
    const baseTypeMatch = /^([A-Z]\w+)/.exec(type.trim());
    if (!baseTypeMatch)
        return type;
    const baseType = baseTypeMatch[1];
    // Tipos primitivos não precisam ser resolvidos
    const primitives = ['String', 'Number', 'Boolean', 'Date', 'Array', 'Object', 'Function', 'Promise', 'EventEmitter'];
    if (primitives.includes(baseType))
        return type;
    // Tenta resolver
    const resolved = await resolveImportedType(baseFile, baseType, imports);
    if (resolved) {
        return `${type} /* ${resolved} */`;
    }
    return type;
}
