# MCP Server - Angular Library Components

Servidor MCP (Model Context Protocol) que expõe componentes Angular de bibliotecas para IAs, com suporte completo a **Signal Inputs/Outputs** (Angular 17+) e **resolução de tipos importados**.

## 🚀 Funcionalidades

### 🔍 Descoberta de Componentes
- ✅ Lista todos os componentes da biblioteca
- ✅ Suporta múltiplas bibliotecas no mesmo workspace
- ✅ Suporta secondary entry points
- ✅ Detecta componentes via decorators e signals

### 📋 Detalhes de Componentes
- ✅ **Inputs**: tipo, obrigatório/opcional, valor default, descrição
- ✅ **Outputs**: tipo, descrição
- ✅ **Kind**: 🟢 decorator ou 🔵 signal
- ✅ **Tipos Resolvidos**: exibe definição de tipos importados inline
- ✅ **Selector e Standalone**
- ✅ **Snippet de uso** gerado automaticamente

### 🔵 Angular 17+ Signals
- ✅ `input<T>()` - inputs opcionais
- ✅ `input.required<T>()` - inputs obrigatórios
- ✅ `input<T>(defaultValue)` - inputs com valor default
- ✅ `output<T>()` - outputs tipados

### 📦 Resolução de Tipos
- ✅ **Interfaces** - `interface Config { ... }`
- ✅ **Type Aliases** - `type Size = 'sm' | 'md' | 'lg'`
- ✅ **Enums** - `enum State { ... }`
- ✅ **Classes** - `class Model { ... }`

## 📦 Instalação

```bash
npm install
npm run build
```

## 🎯 Uso

### Listar Componentes

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list-components","arguments":{}},"id":1}' | node build/main.js
```

**Resposta:**
```
- ButtonComponent (lib-button)
- SignalDemoComponent (lib-signal-demo)
- ReusableIoComponent (lib-reusable-io)
```

### Obter Detalhes de Componente

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get-component","arguments":{"name":"SignalDemoComponent"}},"id":1}' | node build/main.js
```

**Resposta:**
```
Nome: SignalDemoComponent
Selector: lib-signal-demo
Standalone: true
Inputs:
  - title?: string = 'Default Title' [🔵 signal]
  - count: number [🔵 signal]
  - theme?: ThemeConfig /* interface ThemeConfig { ... } */ [🔵 signal]
  - validationState?: ValidationState /* enum ValidationState { ... } */ [🟢 decorator]
Outputs:
  - clicked: MouseEvent [🔵 signal]
  - themeChanged: ThemeConfig [🟢 decorator]
Uso:
<lib-signal-demo [title]="..." [count]="0" ...></lib-signal-demo>
```

## 🛠️ Ferramentas MCP

### 1. `list-components`
Lista todos os componentes da biblioteca.

**Parâmetros:**
- `libraryName` (opcional): Nome da biblioteca
- `entryPoint` (opcional): Nome do entry point secundário

### 2. `get-component`
Obtém detalhes completos de um componente.

**Parâmetros:**
- `name` (obrigatório): Nome da classe do componente
- `libraryName` (opcional): Nome da biblioteca
- `entryPoint` (opcional): Nome do entry point secundário

### 3. `get-library-info`
Obtém informações da biblioteca (versão, dependências).

**Parâmetros:**
- `libraryName` (opcional): Nome da biblioteca

### 4. `find-library-by-name`
Busca biblioteca específica por nome.

**Parâmetros:**
- `libraryName` (obrigatório): Nome da biblioteca

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Workspace root (opcional)
export LIB_COMPONENTS_WORKSPACE=/path/to/workspace
# ou
export MCP_WORKSPACE_ROOT=/path/to/workspace
```

### Estrutura de Projeto Suportada

```
workspace/
├── angular.json          # Angular CLI workspace
├── workspace.json        # Nx workspace
└── projects/
    └── my-lib/
        ├── ng-package.json
        ├── package.json
        └── src/
            ├── public-api.ts
            └── lib/
                └── components/
```

## 📚 Exemplos

### Componente com Decorators (Angular tradicional)

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lib-button',
  standalone: true
})
export class ButtonComponent {
  @Input() label?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Output() clicked = new EventEmitter<Event>();
}
```

**Resultado MCP:**
```
Inputs:
  - label?: string [🟢 decorator]
  - variant: 'primary' | 'secondary' = 'primary' [🟢 decorator]
Outputs:
  - clicked: Event [🟢 decorator]
```

### Componente com Signals (Angular 17+)

```typescript
import { Component, input, output } from '@angular/core';
import { ThemeConfig } from './types';

@Component({
  selector: 'lib-demo',
  standalone: true
})
export class DemoComponent {
  readonly title = input<string>('Default');
  readonly count = input.required<number>();
  readonly config = input<ThemeConfig>();
  
  readonly clicked = output<MouseEvent>();
  readonly valueChanged = output<number>();
}
```

**Resultado MCP:**
```
Inputs:
  - title?: string = 'Default' [🔵 signal]
  - count: number [🔵 signal]
  - config?: ThemeConfig /* interface ThemeConfig { ... } */ [🔵 signal]
Outputs:
  - clicked: MouseEvent [🔵 signal]
  - valueChanged: number [🔵 signal]
```

### Componente Misto (Decorators + Signals)

```typescript
import { Component, Input, input, output } from '@angular/core';

@Component({
  selector: 'lib-mixed',
  standalone: true
})
export class MixedComponent {
  // Decorator input
  @Input() oldStyleProp?: string;
  
  // Signal inputs
  readonly newStyleProp = input<string>();
  readonly count = input.required<number>();
  
  // Signal output
  readonly clicked = output<void>();
}
```

**Resultado MCP:**
```
Inputs:
  - oldStyleProp?: string [🟢 decorator]
  - newStyleProp?: string [🔵 signal]
  - count: number [🔵 signal]
Outputs:
  - clicked: void [🔵 signal]
```

## 🧪 Testes

Execute os testes automatizados:

```bash
cd mcp
bash test-all.sh
```

## 📖 Documentação Adicional

- [SIGNAL-SUPPORT.md](./SIGNAL-SUPPORT.md) - Documentação detalhada sobre signals
- [CHANGELOG.md](./CHANGELOG.md) - Histórico de mudanças

## 🏗️ Arquitetura

```
mcp/src/
├── main.ts              # Entry point, define ferramentas MCP
├── scanner.ts           # Descobre arquivos de componentes
├── parser.ts            # Extrai inputs/outputs (decorators + signals)
├── docs.ts              # Parseia decoradores e comentários JSDoc
├── exports.ts           # Segue cadeia de re-exports
├── import-resolver.ts   # Resolve tipos importados
├── utils.ts             # Utilitários (I/O, descoberta de libs)
└── types.ts             # Definições TypeScript
```

## 🔄 Compatibilidade

- ✅ Angular 14, 15, 16 (decorators)
- ✅ Angular 17+ (signals)
- ✅ Nx workspaces
- ✅ Angular CLI workspaces
- ✅ Standalone components
- ✅ Module-based components

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Implemente suas mudanças
4. Execute os testes: `npm run build && bash test-all.sh`
5. Commit: `git commit -am 'feat: adiciona nova funcionalidade'`
6. Push: `git push origin feature/nova-funcionalidade`
7. Abra um Pull Request

## 📝 Licença

ISC

## 🙏 Agradecimentos

- Equipe Angular pela API de Signals
- Model Context Protocol (MCP) pela especificação

