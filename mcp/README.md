# MCP Server - Angular Library Components (Guia Único Consolidado)

Servidor MCP (Model Context Protocol) que expõe componentes Angular de bibliotecas para IAs, com suporte a Angular Signals (17+) e resolução de tipos importados. Este guia consolida toda a documentação relevante em um único arquivo.

## 🚀 Visão Geral e Funcionalidades

- ✅ Descoberta de componentes em múltiplas bibliotecas e workspaces
- ✅ Suporte a secondary entry points
- ✅ Detalhes completos de componentes
  - Inputs: tipo, obrigatório/opcional, default, descrição
  - Outputs: tipo, descrição
  - Kind: 🟢 decorator (Input/Output) e 🔵 signal (input/output)
  - Tipos importados resolvidos inline (interface, type, enum, class)
- ✅ Configuração Multi-Path (CLI/env) para analisar bibliotecas de diferentes fontes
- ✅ Suporte a `.d.ts` (bibliotecas compiladas)

## 📦 Instalação

```bash
npm install
npm run build
```

## 💼 Funcionalidades

### 🔧 Tools Disponíveis
- **list-components**: Lista todos os componentes Angular da biblioteca
- **get-component**: Obtém detalhes completos de um componente (inputs, outputs, selector, uso)
- **get-library-info**: Obtém informações da biblioteca (versão, dependências, peer dependencies)
- **find-library-by-name**: Busca biblioteca por nome e retorna versão e dependências


## ⚙️ Configuração Multi-Path (Recomendado)

Três formas principais de apontar bibliotecas:

1) Variável de ambiente (Windows usa `;`, Unix/Mac usa `:`)

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp\\build\\main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\proj\\node_modules\\@company\\ui-lib;C:\\repos\\custom-lib"
      }
    }
  }
}
```

2) Argumentos CLI `--libs` (lista de paths):

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\path\\to\\mcp\\build\\main.js",
        "--libs",
        "C:\\proj\\node_modules\\@company\\ui-lib",
        "C:\\repos\\custom-lib"
      ]
    }
  }
}
```

3) Workspace + libs externas via env:

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

Ordem de prioridade: CLI `--libs` > env `LIB_COMPONENTS_PATHS` > workspace atual (fallback automático).

Formatos suportados: workspace completo (angular.json/workspace.json), biblioteca específica (package.json + src/), biblioteca compilada (dist/.d.ts), pacotes `node_modules`.




## 🔵 Suporte a Angular Signals e Resolução de Tipos

Exemplo resumido:

```typescript
import { Component, input, output, Input, Output, EventEmitter } from '@angular/core';

@Component({ selector: 'lib-demo', standalone: true })
export class DemoComponent {
  // Signals
  readonly title = input<string>('Default');
  readonly count = input.required<number>();
  
  // Decorators
  @Input() validationState?: 'valid' | 'invalid';
  
  // Outputs
  readonly clicked = output<MouseEvent>();
  @Output() themeChanged = new EventEmitter<string>();
}
```

Resultado (resumo): inputs/outputs listados com `kind` (decorator/signal) e tipos resolvidos inline. Suporta interfaces, types, enums e classes importadas.

## 🏗️ Estruturas de Projeto Suportadas

O servidor detecta automaticamente bibliotecas em diferentes estruturas:

```bash
# Angular CLI padrão
workspace/projects/my-lib/

# Nx workspace
workspace/libs/my-lib/

# Monorepo
workspace/packages/my-lib/

# Biblioteca na raiz
workspace/my-lib/

# Estrutura customizada (busca recursiva)
workspace/custom/nested/my-lib/
```

Identificação de biblioteca: presença de `src/public-api.ts` ou `ng-package.json` (ou `.d.ts` em libs compiladas).

## 🧭 Cenário Nexus/Bitbucket (Resumo)

Para bibliotecas instaladas via Nexus no `node_modules` do projeto, aponte diretamente para os diretórios das libs:

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp\\build\\main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\seu-projeto\\node_modules\\@company\\ui;C:\\seu-projeto\\node_modules\\@company\\forms"
      }
    }
  }
}
```

Vantagem: o MCP lê diretamente os `.d.ts` publicados; ao atualizar a versão das libs no projeto, o MCP reflete automaticamente.

## 🐛 Troubleshooting Essencial

- **Nenhuma biblioteca encontrada**: verifique paths, separador correto (`;` no Windows, `:` no Unix), estrutura válida (package.json + src/ ou dist/.d.ts)
- **Componentes não aparecem**: confirme se há `.component.ts`/`.component.d.ts` e se o entry point exporta os componentes
- **Separador no Windows**: evite `:`; use `;`
- **Logs**: abra Developer Tools do Cursor e procure por `[MCP]`

## 🧱 Arquitetura (alto nível)

```
mcp/src/
├── main.ts              # Entry point, define ferramentas MCP
├── scanner.ts           # Descobre arquivos de componentes
├── parser.ts            # Extrai inputs/outputs (decorators + signals)
├── docs.ts              # Parse de docs/comments
├── exports.ts           # Segue cadeia de re-exports
├── import-resolver.ts   # Resolve tipos importados
├── utils.ts             # Utilitários (multi-path, descoberta de libs)
└── types.ts             # Definições TypeScript
```

## 🔄 Compatibilidade

- Angular 14, 15, 16 (decorators)
- Angular 17+ (signals)
- Nx e Angular CLI workspaces
- Standalone e module-based components

## 📋 Changelog e Suporte

- Histórico de mudanças: ver `mcp/CHANGELOG.md`
- Dúvidas: verificar troubleshooting acima e exemplos de configuração

---

## 🧭 Consolidação: Itens Mesclados, Duplicações e Menos Importantes

Este guia consolida o conteúdo de múltiplos arquivos. O que foi mesclado e o que ficou de fora:

### Duplicações Mescladas

- Configuração Multi-Path (README, QUICK-START-MULTI-PATH): unificado em "Configuração Multi-Path" + "Quick Start" acima
- Exemplos de comandos (`list-components`, `get-component`) (README, QUICK-START, SIGNAL-SUPPORT): centralizados em "Uso"
- Estruturas suportadas (README, GENERIC-STRUCTURE-SUPPORT): resumidas em "Estruturas de Projeto Suportadas"
- Suporte a Signals e tipos (README, SIGNAL-SUPPORT): condensado em "Suporte a Angular Signals"
- Cenário Nexus/Bitbucket (NEXUS-BITBUCKET-GUIDE): resumido em "Cenário Nexus/Bitbucket"


