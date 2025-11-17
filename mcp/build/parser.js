export function extractClassBody(source, className) {
    const classRegex = new RegExp(`export\\s+class\\s+${className}\\b[^{]*\\{`, 'm');
    const m = classRegex.exec(source);
    if (!m)
        return null;
    const startIdx = (m.index || 0) + (m[0]?.length || 0);
    let depth = 1;
    let i = startIdx;
    while (i < source.length) {
        const ch = source[i];
        if (ch === '{')
            depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                const body = source.slice(startIdx, i);
                return { body, start: startIdx };
            }
        }
        i++;
    }
    return null;
}
export function cleanWhitespace(s) {
    return s ? s.replace(/\s+/g, ' ').trim() : s;
}
export function extractLeadingComment(block, decoratorIndex) {
    const lookBehind = block.slice(Math.max(0, decoratorIndex - 300), decoratorIndex);
    const m = /\/\*\*([\s\S]*?)\*\//.exec(lookBehind);
    if (!m)
        return undefined;
    const text = m[1]
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .join(' ')
        .trim();
    return text || undefined;
}
export function parsePropertyLine(line) {
    // Suporta: nome, opcional ? ou !, opcional : tipo, opcional = valor
    const m = /([A-Za-z_]\w*)\s*([!?])?\s*(?::\s*([^=;]+))?\s*(?:=\s*([^;]+))?/.exec(line);
    if (!m)
        return {};
    const name = m[1];
    const optionalOrDefinite = m[2];
    const required = optionalOrDefinite === '?' ? false : true;
    const type = cleanWhitespace(m[3]);
    const defaultValue = cleanWhitespace(m[4]);
    return { name, type, required, defaultValue };
}
export function parseEventEmitterType(fragment) {
    if (!fragment)
        return undefined;
    const m = /EventEmitter\s*<\s*([^>]+)\s*>/.exec(fragment);
    return cleanWhitespace(m?.[1] || undefined);
}
export function generateSampleFromType(type) {
    if (!type)
        return undefined;
    const t = type.trim();
    if (/^string$/i.test(t))
        return '"texto"';
    if (/^number$/i.test(t))
        return '0';
    if (/^boolean$/i.test(t))
        return 'true';
    const union = t.match(/'(?:[^']+)'/g);
    if (union && union.length > 0)
        return union[0];
    return undefined;
}
/**
 * Parseia signal input do Angular 17+
 * Exemplos:
 * - readonly name = input<string>();
 * - readonly id = input.required<number>();
 * - readonly config = input<Config>({ default: 'value' });
 * - readonly checked = input<boolean, BooleanInput>(false, { alias: 'ludsCheckboxChecked' });
 */
export function parseSignalInput(line) {
    // Com alias: readonly name = input<Type, Transform>(defaultValue, { alias: 'customName' })
    const aliasRegex = /readonly\s+(\w+)\s*=\s*input(?:\.(required))?\s*<([^>]+)>\s*\([^)]*\{[^}]*alias\s*:\s*['\"]([^'\"]+)['\"]/;
    const aliasMatch = aliasRegex.exec(line);
    if (aliasMatch) {
        return {
            name: aliasMatch[1],
            alias: aliasMatch[4],
            required: aliasMatch[2] === 'required',
            type: cleanWhitespace(aliasMatch[3]?.split(',')[0]), // pega só o primeiro tipo genérico
        };
    }
    // readonly name = input<Type>(defaultValue)
    const signalRegex = /readonly\s+(\w+)\s*=\s*input(?:\.(required))?\s*<([^>]+)>\s*\(([^)]*)\)/;
    const match = signalRegex.exec(line);
    if (!match) {
        // Sem genérico: readonly name = input()
        const simpleRegex = /readonly\s+(\w+)\s*=\s*input(?:\.(required))?\s*\(\s*([^)]*)\s*\)/;
        const simpleMatch = simpleRegex.exec(line);
        if (simpleMatch) {
            return {
                name: simpleMatch[1],
                required: simpleMatch[2] === 'required',
                defaultValue: cleanWhitespace(simpleMatch[3]) || undefined,
            };
        }
        return {};
    }
    const name = match[1];
    const required = match[2] === 'required';
    const typeRaw = match[3];
    // Se tem vírgula, é um tipo com transform (ex: boolean, BooleanInput)
    const type = cleanWhitespace(typeRaw?.split(',')[0]);
    const defaultValue = cleanWhitespace(match[4]) || undefined;
    return { name, type, required, defaultValue };
}
/**
 * Parseia signal output do Angular 17+
 * Exemplo:
 * - readonly clicked = output<MouseEvent>();
 * - readonly checkedChange = output<boolean>({ alias: 'ludsCheckboxCheckedChange' });
 */
export function parseSignalOutput(line) {
    // Com alias: readonly name = output<Type>({ alias: 'customName' })
    const aliasRegex = /readonly\s+(\w+)\s*=\s*output\s*<([^>]+)>\s*\(\s*\{[^}]*alias\s*:\s*['\"]([^'\"]+)['\"]/;
    const aliasMatch = aliasRegex.exec(line);
    if (aliasMatch) {
        return {
            name: aliasMatch[1],
            alias: aliasMatch[3],
            type: cleanWhitespace(aliasMatch[2]),
        };
    }
    // readonly name = output<Type>()
    const signalRegex = /readonly\s+(\w+)\s*=\s*output\s*<([^>]+)>\s*\(\s*\)/;
    const match = signalRegex.exec(line);
    if (!match) {
        // Sem genérico: readonly name = output()
        const simpleRegex = /readonly\s+(\w+)\s*=\s*output\s*\(\s*\)/;
        const simpleMatch = simpleRegex.exec(line);
        if (simpleMatch) {
            return { name: simpleMatch[1] };
        }
        return {};
    }
    return { name: match[1], type: cleanWhitespace(match[2]) };
}
/**
 * Gera exemplo de uso para diretivas compostas (ex: Card com Header, Body, Footer)
 */
function buildCompositeDirectiveExample(info) {
    const selector = info.selector?.replace(/[\[\]]/g, '') || '';
    const inputs = info.inputs || [];
    const outputs = info.outputs || [];
    // Detecta se é uma diretiva "raiz" de um conjunto (Card, FormField, Listbox, etc.)
    const isRootDirective = /^luds(Card|FormField|Listbox|Menu|Popover|Dialog|Tabs|Accordion)$/i.test(info.name);
    if (!isRootDirective)
        return undefined;
    // Exemplos específicos para diretivas compostas conhecidas
    if (info.name === 'LudsCard') {
        const variantBinding = inputs.find(i => i.name === 'variant' || i.alias === 'variant');
        const sizeBinding = inputs.find(i => i.name === 'size' || i.alias === 'size');
        return `<!-- Exemplo completo de Card com todas as partes -->
<div ludsCard ${variantBinding ? '[variant]="\'high-contrast\'"' : ''} ${sizeBinding ? '[size]="\'medium\'"' : ''}>
  <!-- Barra de ações no topo (opcional) -->
  <div ludsCardHeaderBar>
    <button ludsButton>Ação</button>
  </div>
  
  <!-- Container principal do card -->
  <div ludsCardContainer>
    <!-- Cabeçalho com ícone (opcional) -->
    <div ludsCardHeader>
      <div ludsCardIcon>
        <ng-icon name="phosphorCard"></ng-icon>
      </div>
    </div>
    
    <!-- Corpo principal com título e descrição -->
    <div ludsCardBody>
      <h3 ludsCardTitle>Título do Card</h3>
      <p ludsCardDescription>Descrição detalhada do conteúdo.</p>
      <span ludsCardOptionalText>Informação adicional</span>
    </div>
    
    <!-- Ações laterais (opcional) -->
    <div ludsCardAction>
      <button ludsButton>Ver mais</button>
    </div>
  </div>
  
  <!-- Rodapé com ações finais (opcional) -->
  <div ludsCardFooter>
    <button ludsButton>Confirmar</button>
    <button ludsButton>Cancelar</button>
  </div>
</div>

<!-- 💡 DICA: Todas as partes são opcionais. Use apenas o que precisar! -->`;
    }
    return undefined;
}
export function buildUsageSnippet(info) {
    if (!info.selector)
        return undefined;
    const selector = info.selector;
    const inputs = info.inputs || [];
    const outputs = info.outputs || [];
    const bindings = [];
    for (const i of inputs) {
        const sample = generateSampleFromType(i.resolvedType || i.type) || '...';
        const bindingName = i.alias || i.name;
        bindings.push(`[${bindingName}]="${sample}"`);
    }
    for (const o of outputs) {
        const bindingName = o.alias || o.name;
        bindings.push(`(${bindingName})="on${o.name[0].toUpperCase()}${o.name.slice(1)}($event)"`);
    }
    // Verifica se há exemplo composto específico para esta diretiva
    const compositeExample = buildCompositeDirectiveExample(info);
    if (compositeExample) {
        return `<!-- HTML -->
<div class="exemplo-container">
  ${compositeExample.split('\n').join('\n  ')}
</div>

<!-- CSS (aplicado apenas no container, NÃO no componente) -->
<style>
  .exemplo-container {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #f9f9f9;
    margin: 1rem 0;
  }
</style>`;
    }
    // Determina se deve usar como diretiva (atributo) ou como elemento
    // 1. Se é uma diretiva pura (@Directive) → sempre atributo
    // 2. Se selector tem [ ou ] → sempre atributo
    // 3. Se é componente wrapper vazio (hostDirectives + template vazio) → usa como elemento
    const isDirective = info.type === 'directive' || selector.startsWith('[') || selector.includes('[');
    const useAsElement = info.type === 'component' && !isDirective;
    let componentCode = '';
    if (useAsElement) {
        // Para componentes (incluindo wrappers), usa o selector como elemento
        const space = bindings.length ? '\n  ' : '';
        componentCode = bindings.length
            ? `<${selector}${space}${bindings.join('\n  ')}\n>\n  Conteúdo\n</${selector}>`
            : `<${selector}>\n  Conteúdo\n</${selector}>`;
    }
    else {
        // Para diretivas puras, usa como atributo em elemento host
        const hostElement = selector.includes('button') || selector.includes('Button') ? 'button' : 'div';
        const directiveSelector = selector.replace(/[\[\]]/g, ''); // Remove [ e ]
        const space = bindings.length ? ' ' : '';
        componentCode = `<${hostElement}\n  ${directiveSelector}${space}\n  ${bindings.join('\n  ')}\n>\n  Conteúdo\n</${hostElement}>`;
    }
    // Envolve o componente em um container estilizado para melhor apresentação
    const wrappedExample = `<!-- HTML -->
<div class="exemplo-container">
  ${componentCode.split('\n').join('\n  ')}
</div>

<!-- CSS (aplicado apenas no container, NÃO no componente) -->
<style>
  .exemplo-container {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #f9f9f9;
    margin: 1rem 0;
  }
</style>`;
    return wrappedExample;
}
