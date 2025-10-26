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

### 🎯 Configuração Multi-Path (Recomendado)

**Novidade!** Agora você pode configurar múltiplos caminhos de bibliotecas, permitindo analisar:
- ✅ Bibliotecas instaladas no `node_modules` (via npm/Nexus)
- ✅ Repositórios Git clonados localmente
- ✅ Múltiplos workspaces Angular/Nx
- ✅ Bibliotecas compiladas (pasta `dist/`)

#### Exemplo 1: Uma Única Biblioteca

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp\\build\\main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\projeto\\node_modules\\@company\\ui-lib"
      }
    }
  }
}
```

#### Exemplo 2: Múltiplas Bibliotecas (Variável de Ambiente)

Use `;` no Windows ou `:` no Linux/Mac para separar múltiplos paths:

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp\\build\\main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\projeto\\node_modules\\@company\\ui-lib;C:\\projeto\\node_modules\\@company\\forms-lib;C:\\repos-locais\\custom-lib"
      }
    }
  }
}
```

#### Exemplo 3: Múltiplas Bibliotecas (Argumentos CLI)

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\path\\to\\mcp\\build\\main.js",
        "--libs",
        "C:\\projeto\\node_modules\\@company\\ui-lib",
        "C:\\projeto\\node_modules\\@company\\forms-lib",
        "C:\\repos-locais\\custom-lib"
      ]
    }
  }
}
```

#### Exemplo 4: Workspace + Bibliotecas Externas

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp\\build\\main.js"],
      "env": {
        "MCP_WORKSPACE_ROOT": "C:\\workspace-angular",
        "LIB_COMPONENTS_PATHS": "C:\\outro-projeto\\node_modules\\@external\\lib"
      }
    }
  }
}
```

#### Exemplo 5: Linux/Mac

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": ["/path/to/mcp/build/main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "/home/user/projeto/node_modules/@company/ui-lib:/home/user/repos/custom-lib"
      }
    }
  }
}
```

**📁 Mais exemplos:** Veja [mcp-config-examples.json](./mcp-config-examples.json) para 10+ exemplos de configuração.

#### ⚙️ Como Funciona

**Ordem de Prioridade:**
1. ✅ Argumentos CLI (`--libs`)
2. ✅ Variável de ambiente (`LIB_COMPONENTS_PATHS`)
3. ✅ Workspace atual (fallback automático)

**Formatos Suportados:**
- 📦 **Workspace completo**: Pasta com `angular.json` ou `workspace.json`
- 📚 **Biblioteca específica**: Pasta com `package.json` e `src/` ou `dist/`
- 🔨 **Biblioteca compilada**: Pasta `dist/` com arquivos `.d.ts`
- 📦 **node_modules**: Pacotes instalados via npm/Nexus

**Detecção Automática:**
O MCP detecta automaticamente o tipo de estrutura e busca componentes nos lugares corretos!

#### 🔍 Verificando a Configuração

Ao iniciar, o MCP exibe logs mostrando:
- Quantos paths foram configurados
- Quais bibliotecas foram encontradas
- Onde cada biblioteca está localizada

```
============================================================
MCP Server 'lib-components' iniciando...
============================================================
[MCP] Usando paths configurados: 3 path(s)
  - C:\projeto\node_modules\@company\ui-lib
  - C:\projeto\node_modules\@company\forms-lib
  - C:\repos-locais\custom-lib
[MCP] Encontradas 3 biblioteca(s) nos paths configurados

✓ 3 biblioteca(s) disponível(is):
  • @company/ui-lib
    Root: C:\projeto\node_modules\@company\ui-lib
    Entry: index.d.ts
  • @company/forms-lib
    Root: C:\projeto\node_modules\@company\forms-lib
    Entry: public-api.d.ts
  • custom-lib
    Root: C:\repos-locais\custom-lib
    Entry: public-api.ts
============================================================
```

### Variáveis de Ambiente (Legado)

```bash
# Workspace root (opcional)
export LIB_COMPONENTS_WORKSPACE=/path/to/workspace
# ou
export MCP_WORKSPACE_ROOT=/path/to/workspace

# Múltiplos paths de bibliotecas (novo!)
export LIB_COMPONENTS_PATHS="/path/to/lib1:/path/to/lib2"
```

### Estrutura de Projeto Suportada

✨ **Suporta QUALQUER estrutura de projeto!** Não apenas `projects/`.

O MCP server detecta automaticamente bibliotecas em:
- 📁 `projects/` - Angular CLI padrão
- 📁 `libs/` - Nx workspaces
- 📁 `packages/` - Monorepos (Lerna, pnpm, yarn)
- 📁 `modules/` - Estruturas customizadas
- 📁 Qualquer pasta (busca recursiva)

**Exemplos de estruturas suportadas:**

```bash
# Angular CLI padrão
workspace/projects/my-lib/

# Nx workspace
workspace/libs/my-lib/

# Monorepo
workspace/packages/my-lib/

# Biblioteca na raiz
workspace/my-lib/

# Estrutura customizada
workspace/custom/nested/my-lib/
```

Para mais detalhes, veja [GENERIC-STRUCTURE-SUPPORT.md](./GENERIC-STRUCTURE-SUPPORT.md).

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

