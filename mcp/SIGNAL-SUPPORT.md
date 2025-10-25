# Suporte a Signal Inputs/Outputs e Resolução de Tipos

## 🎯 Resumo das Melhorias

Este documento descreve as melhorias implementadas no MCP server para suportar:
1. **Signal inputs/outputs** do Angular 17+
2. **Resolução de tipos importados** (interfaces, types, enums, classes)

## 🔵 Signal Inputs/Outputs (Angular 17+)

### O que são Signals?

A partir do Angular 17, a equipe introduziu uma nova forma de definir inputs e outputs usando signals:

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-example',
  // ...
})
export class ExampleComponent {
  // Signal inputs
  readonly name = input<string>('default');        // opcional com default
  readonly id = input.required<number>();          // obrigatório
  readonly config = input<AppConfig>();            // opcional sem default
  
  // Signal outputs
  readonly clicked = output<MouseEvent>();
  readonly valueChanged = output<string>();
}
```

### Detecção Automática

O MCP server agora detecta automaticamente:

- ✅ `input<T>()` - inputs opcionais
- ✅ `input.required<T>()` - inputs obrigatórios
- ✅ `input<T>(defaultValue)` - inputs com valor default
- ✅ `output<T>()` - outputs tipados

### Indicadores Visuais

Os componentes agora exibem indicadores que diferenciam decorators de signals:

- 🟢 **decorator** - inputs/outputs tradicionais com `@Input()` / `@Output()`
- 🔵 **signal** - inputs/outputs modernos com `input()` / `output()`

## 📦 Resolução de Tipos Importados

### Tipos Suportados

O MCP server agora resolve e exibe definições de tipos importados:

1. **Interfaces**
```typescript
import { ThemeConfig } from './types';

@Input() theme?: ThemeConfig;
// Resultado: ThemeConfig /* interface ThemeConfig { primary: string; ... } */
```

2. **Type Aliases**
```typescript
import { SizeOption } from './types';

readonly size = input<SizeOption>('md');
// Resultado: SizeOption /* type SizeOption = 'xs' | 'sm' | 'md' | 'lg' | 'xl' */
```

3. **Enums**
```typescript
import { ValidationState } from './types';

@Input() state?: ValidationState;
// Resultado: ValidationState /* enum ValidationState { Valid = 'valid', ... } */
```

4. **Classes**
```typescript
import { CustomClass } from './models';

readonly model = input<CustomClass>();
// Resultado: CustomClass /* class CustomClass */
```

### Como Funciona

1. **Extração de Imports**: O parser identifica todos os imports do arquivo
2. **Resolução de Caminhos**: Segue imports relativos (`.ts`, `index.ts`, etc.)
3. **Busca de Definições**: Encontra a definição do tipo no arquivo importado
4. **Cache**: Mantém cache de tipos resolvidos para performance

## 📋 Exemplo Completo

### Componente com Signals e Tipos Importados

```typescript
import { Component, input, output, Input, Output, EventEmitter } from '@angular/core';
import { ThemeConfig, SizeOption, ValidationState } from './types';

@Component({
  selector: 'lib-demo',
  standalone: true,
  template: `<div>Demo</div>`
})
export class DemoComponent {
  // Signal inputs
  readonly title = input<string>('Default');
  readonly count = input.required<number>();
  readonly theme = input<ThemeConfig>();
  readonly size = input<SizeOption>('md');
  
  // Decorator inputs (misturado)
  @Input() validationState?: ValidationState;
  
  // Signal outputs
  readonly clicked = output<MouseEvent>();
  readonly valueChanged = output<{ old: number; new: number }>();
  
  // Decorator outputs (misturado)
  @Output() themeChanged = new EventEmitter<ThemeConfig>();
}
```

### Resultado do MCP Server

```
Nome: DemoComponent
Selector: lib-demo
Standalone: true
Inputs:
  - validationState?: ValidationState /* enum ValidationState { ... } */ [🟢 decorator]
  - title?: string = 'Default' [🔵 signal]
  - count: number [🔵 signal]
  - theme?: ThemeConfig /* interface ThemeConfig { ... } */ [🔵 signal]
  - size?: SizeOption /* type SizeOption = ... */ = 'md' [🔵 signal]
Outputs:
  - themeChanged: ThemeConfig /* interface ThemeConfig { ... } */ [🟢 decorator]
  - clicked: MouseEvent [🔵 signal]
  - valueChanged: { old: number; new: number } [🔵 signal]
```

## 🧪 Testando

### 1. Listar Componentes

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list-components","arguments":{}},"id":1}' | node build/main.js
```

### 2. Obter Detalhes de Componente

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get-component","arguments":{"name":"SignalDemoComponent"}},"id":1}' | node build/main.js
```

### 3. Componentes de Teste

- **ButtonComponent** - usa decorators tradicionais
- **SignalDemoComponent** - usa signals e tipos importados
- **ReusableIoComponent** - usa decorators com getters/setters

## 🔧 Arquivos Modificados

### Novos Arquivos
- `mcp/src/import-resolver.ts` - resolução de tipos importados

### Arquivos Atualizados
- `mcp/src/types.ts` - adiciona `kind`, `resolvedType`, `imports`
- `mcp/src/parser.ts` - adiciona `parseSignalInput()`, `parseSignalOutput()`
- `mcp/src/docs.ts` - integra signal parsing e type resolution
- `mcp/src/main.ts` - exibe `kind` e tipos resolvidos na resposta

### Componentes de Teste
- `projects/my-lib/src/lib/components/signal-demo/` - componente de teste
- `projects/my-lib/src/lib/components/signal-demo/types.ts` - tipos customizados

## ⚡ Performance

- **Cache de arquivos**: Evita leituras duplicadas
- **Cache de tipos**: Resolve cada tipo apenas uma vez
- **Parsing incremental**: Processa apenas o necessário

## 🚀 Próximos Passos

Possíveis melhorias futuras:

1. Suporte a `model()` inputs (Angular 17.2+)
2. Resolução de tipos de bibliotecas npm (node_modules)
3. Suporte a generics complexos
4. Validação de tipos em tempo real
5. Testes automatizados

## 📚 Referências

- [Angular Signals](https://angular.io/guide/signals)
- [Signal Inputs](https://angular.io/guide/signal-inputs)
- [Signal Outputs](https://angular.io/guide/signal-outputs)

