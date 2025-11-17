# 🚀 Servidor MCP para Componentes de Bibliotecas Angular

> **Servidor MCP que expõe componentes de bibliotecas Angular para assistentes de IA, com suporte a Signals (Angular 17+), mapeamento de paths e workspaces multi-biblioteca.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.4.0-green.svg)](https://modelcontextprotocol.io/)
[![Angular](https://img.shields.io/badge/Angular-14%2B-red.svg)](https://angular.io/)

**[🇺🇸 English Version](./README.md)**

---

> :exclamation: **Importante:** Para utilizar MCP Servers é necessário ter High Privileges Access solicitado Identity Central.

## 🎯 O que é isso?

Este é um **servidor Model Context Protocol (MCP)** que permite que assistentes de IA (como GitHub Copilot, Claude, Cursor) **entendam e interajam com bibliotecas de componentes Angular**. Ele descobre automaticamente componentes, seus inputs/outputs, signals e fornece exemplos de uso.

### Perfeito para:
- 🏢 **Design Systems** - Documente e consulte bibliotecas de componentes
- 📚 **Bibliotecas de Componentes** - Torne seus componentes UI descobríveis por IA
- 🔄 **Monorepos** - Suporte para Nx, Angular CLI e estruturas customizadas
- 🤖 **Desenvolvimento Assistido por IA** - Deixe a IA ajudar você a usar seus componentes corretamente

---

## ✨ Funcionalidades Principais

### 🔍 **Descoberta Inteligente de Componentes**
- ✅ Detecta automaticamente componentes Angular em múltiplas estruturas de biblioteca
- ✅ Suporta **monorepos Nx** com mapeamento de paths no `tsconfig.base.json`
- ✅ Funciona com workspaces **Angular CLI**
- ✅ Suporta bibliotecas compiladas (arquivos `.d.ts`)

### 🎨 **Informações Completas dos Componentes**
- ✅ **Inputs**: tipo, obrigatório/opcional, valores padrão, descrições
- ✅ **Outputs**: tipo, descrições de eventos
- ✅ **Signals**: `input()`, `output()`, `model()` (Angular 17+)
- ✅ **Decorators**: `@Input()`, `@Output()` (Angular 14+)
- ✅ **Resolução de Tipos**: Resolve interfaces, types e enums importados inline

### 🛠️ **Ferramentas MCP Disponíveis**
- `list-components` - Lista todos os componentes Angular da biblioteca
- `get-component` - Obtém informações detalhadas sobre um componente específico
- `get-library-info` - Obtém metadados da biblioteca (versão, dependências)
- `find-library-by-name` - Busca uma biblioteca por nome

---

## 🚀 Início Rápido

### 1️⃣ Instalação

```bash
cd mcp
npm install
npm run build
```

### 2️⃣ Configuração

#### Para **GitHub Copilot** (VS Code)

Crie `.vscode/mcp.json` na raiz do seu projeto:

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": [
        "/caminho/absoluto/para/mcp/build/main.js",
        "--libs",
        "/caminho/para/seu/workspace/angular"
      ]
    }
  }
}
```

#### Para **Monorepo Nx com Mapeamento de Paths** (Recomendado)

Se seu workspace tem um `tsconfig.base.json` com mapeamento de paths:

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": [
        "/caminho/absoluto/para/mcp/build/main.js",
        "--libs",
        "/caminho/para/raiz/do/monorepo"
      ]
    }
  }
}
```

O servidor detectará automaticamente paths como:
```json
{
  "paths": {
    "@empresa/ui/components/*": ["libs/ui/components/*/src/index.ts"],
    "@empresa/ui/blocks/*": ["libs/ui/blocks/*/src/index.ts"]
  }
}
```

### 3️⃣ Uso com Assistentes de IA

Uma vez configurado, você pode perguntar ao seu assistente de IA:

```
💬 "Liste todos os componentes da biblioteca"
💬 "Mostre detalhes sobre o ButtonComponent"
💬 "Quais são os inputs e outputs do CardComponent?"
💬 "Crie um exemplo usando o DataTableComponent"
💬 "Quais componentes têm outputs de eventos?"
```

---

## 🏗️ Estruturas de Projeto Suportadas

O servidor detecta automaticamente bibliotecas em várias estruturas:

### ✅ Monorepo Nx (Recomendado)
```
workspace/
├── tsconfig.base.json          # Com mapeamento de paths
├── libs/
│   └── ui/
│       ├── components/
│       │   ├── button/src/index.ts
│       │   └── card/src/index.ts
│       └── blocks/
│           ├── form/src/index.ts
│           └── table/src/index.ts
```

### ✅ Workspace Angular CLI
```
workspace/
├── angular.json
└── projects/
    └── my-lib/
        └── src/public-api.ts
```

### ✅ Biblioteca Individual
```
my-lib/
├── package.json
├── ng-package.json
└── src/
    └── public-api.ts
```

### ✅ Biblioteca Compilada
```
dist/my-lib/
├── package.json
└── index.d.ts
```

---

## 🎯 Exemplo Real: Lumina Design System

Este servidor MCP foi construído para o **Lumina Design System**, um monorepo Nx com mais de 38 componentes e blocks.

**Configuração:**
```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": [
        "C:\\workspace\\mcp-poc\\mcp\\build\\main.js",
        "--libs",
        "C:\\workspace\\lumina-design-system"
      ]
    }
  }
}
```

**O que ele descobre:**
- ✅ 33+ blocks em `libs/ui/blocks/*`
- ✅ 5+ componentes em `libs/ui/components/*`
- ✅ Todos os componentes exportados (LudsCard, LudsButton, LudsTable, etc.)

---

## 🔧 Configuração Avançada

### Múltiplas Bibliotecas

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": [
        "/caminho/para/mcp/build/main.js",
        "--libs",
        "/caminho/para/workspace1",
        "/caminho/para/workspace2",
        "/caminho/para/node_modules/@empresa/ui-lib"
      ]
    }
  }
}
```

### Variáveis de Ambiente (Alternativa)

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": ["/caminho/para/mcp/build/main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "/caminho/para/lib1;/caminho/para/lib2"
      }
    }
  }
}
```

**Nota**: No Windows use `;` como separador, no Unix/Mac use `:`

---

## 🧪 Testes & Debugging

### Visualizar Logs

**GitHub Copilot (VS Code):**
- Vá em **View → Output**
- Selecione **"GitHub Copilot Chat"** no dropdown
- Procure por linhas começando com `[MCP]` ou `[list-components]`

**Saída esperada:**
```
[MCP] Usando paths configurados: 1 path(s)
  - C:\workspace\lumina-design-system
[MCP] Encontradas 38 biblioteca(s) via tsconfig.base.json paths
[list-components] Encontradas 38 bibliotecas
  - luds/ui/blocks/card em C:\workspace\lumina-design-system\libs\ui\blocks\card
  - luds/ui/blocks/button em C:\workspace\lumina-design-system\libs\ui\blocks\button
  ...
```

### Problemas Comuns

#### ❌ Nenhuma biblioteca encontrada
- ✅ Verifique se os paths são absolutos
- ✅ Confira o separador (`;` no Windows, `:` no Unix/Mac)
- ✅ Certifique-se que `package.json` existe na raiz da biblioteca
- ✅ Verifique a estrutura: deve ter `src/public-api.ts` OU arquivos `.d.ts`

#### ❌ Nenhum componente encontrado
- ✅ Verifique se existem arquivos `.component.ts` ou `.component.d.ts`
- ✅ Confirme que o entry point exporta os componentes
- ✅ Confira a localização: `src/lib/components/` ou exportados no `public-api.ts`

---

## 🎨 Suporte a Angular Signals

Suporte completo para APIs baseadas em signals do Angular 17+:

```typescript
import { Component, input, output, model } from '@angular/core';

@Component({ 
  selector: 'lib-demo', 
  standalone: true 
})
export class DemoComponent {
  // Signal inputs
  readonly title = input<string>('Default');
  readonly count = input.required<number>();
  
  // Signal outputs
  readonly clicked = output<MouseEvent>();
  
  // Two-way binding
  readonly value = model<string>();
  
  // Decorators clássicos (também suportados)
  @Input() theme?: 'light' | 'dark';
  @Output() changed = new EventEmitter<string>();
}
```

O servidor MCP extrai e exibe todas essas informações com resolução adequada de tipos.

---

## 📚 Documentação

- **[Guia Completo](./mcp/README.md)** - Documentação completa
- **[Changelog](./mcp/CHANGELOG.md)** - Histórico de versões

---

## 🤝 Compatível Com

- ✅ **GitHub Copilot** (VS Code)
- ✅ **Cursor** IDE
- ✅ **Claude Desktop**
- ✅ **Qualquer assistente de IA compatível com MCP**

---

## 🛠️ Stack Tecnológica

- **TypeScript 5.7+**
- **Model Context Protocol SDK 1.4.0**
- **Zod** para validação de schemas
- **Node.js 18+**

---
