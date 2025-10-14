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
    const m = /([A-Za-z_][\w]*)\s*(\?)?\s*:\s*([^=;]+)(?:=\s*([^;]+))?/.exec(line);
    if (!m)
        return {};
    const name = m[1];
    const required = !Boolean(m[2]);
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
export function buildUsageSnippet(info) {
    if (!info.selector)
        return undefined;
    const tag = info.selector;
    const inputs = info.inputs || [];
    const outputs = info.outputs || [];
    const bindings = [];
    for (const i of inputs) {
        const sample = generateSampleFromType(i.type) || '...';
        bindings.push(`[${i.alias || i.name}]=${sample}`);
    }
    for (const o of outputs) {
        bindings.push(`(${o.alias || o.name})="on${o.name[0].toUpperCase()}${o.name.slice(1)}($event)"`);
    }
    const space = bindings.length ? ' ' : '';
    return `<${tag}${space}${bindings.join(' ')}></${tag}>`;
}
