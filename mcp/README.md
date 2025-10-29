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
      "args": ["<caminho-absoluto>/mcp/build/main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "<caminho-do-projeto>/node_modules/@company/ui-lib;<caminho-repos>/custom-lib"
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
        "<caminho-absoluto>/mcp/build/main.js",
        "--libs",
        "<caminho-do-projeto>/node_modules/@company/ui-lib",
        "<caminho-repos>/custom-lib"
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
      "args": ["<caminho-absoluto>/mcp/build/main.js"],
      "env": {
        "MCP_WORKSPACE_ROOT": "<caminho-workspace-angular>",
        "LIB_COMPONENTS_PATHS": "<caminho-outro-projeto>/node_modules/@external/lib"
      }
    }
  }
}
```

Ordem de prioridade: CLI `--libs` > env `LIB_COMPONENTS_PATHS` > workspace atual (fallback automático).

Formatos suportados: workspace completo (angular.json/workspace.json), biblioteca específica (package.json + src/), biblioteca compilada (dist/.d.ts), pacotes `node_modules`.

## 🤖 Configuração para GitHub Copilot no VS Code

O GitHub Copilot no Visual Studio Code suporta servidores MCP, permitindo que você estenda as capacidades do Copilot com ferramentas customizadas. Existem duas formas de configurar:

### 📁 Opção 1: Configuração por Repositório (Recomendado para Equipes)

Crie um arquivo `.vscode/mcp.json` na raiz do seu repositório. Isso permite compartilhar a configuração com toda a equipe:

```json
{
  "inputs": [],
  "servers": {
    "angular-lib-components": {
      "command": "node",
      "args": [
        "<caminho-absoluto>/mcp/build/main.js",
        "--libs",
        "${workspaceFolder}/node_modules/@company/ui-lib",
        "${workspaceFolder}/node_modules/@company/forms-lib"
      ]
    }
  }
}
```

**Ou usando variáveis de ambiente:**

```json
{
  "inputs": [],
  "servers": {
    "angular-lib-components": {
      "command": "node",
      "args": ["<caminho-absoluto>/mcp/build/main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "${workspaceFolder}/node_modules/@company/ui-lib;${workspaceFolder}/node_modules/@company/forms-lib"
      }
    }
  }
}
```

### 👤 Opção 2: Configuração Pessoal (Disponível em Todos os Workspaces)

Adicione ao seu `settings.json` do VS Code (Ctrl+Shift+P → "Preferences: Open User Settings (JSON)"):

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "angular-lib-components": {
      "command": "node",
      "args": ["<caminho-absoluto>/mcp/build/main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "<caminho-do-projeto>/ui-lib;<caminho-do-projeto>/forms-lib"
      }
    }
  }
}
```

### 🚀 Como Usar

1. **Iniciar o servidor**: Após configurar, um botão "Start" aparecerá no arquivo `.vscode/mcp.json`. Clique para iniciar o servidor.

2. **Abrir o Copilot Chat**: Clique no ícone do Copilot na barra lateral ou pressione `Ctrl+Alt+I`.

3. **Selecionar Agent**: Na caixa do Copilot Chat, selecione "Agent" no menu.

4. **Ver ferramentas disponíveis**: Clique no ícone de ferramentas (🔧) no canto superior da caixa de chat para ver os servidores MCP e ferramentas disponíveis.

### 🛠️ Ferramentas Disponíveis

O Copilot poderá usar automaticamente estas ferramentas:

- **list-components** - Lista todos os componentes Angular disponíveis
- **get-component** - Obtém detalhes completos de um componente (inputs, outputs, selector)
- **get-library-info** - Obtém informações da biblioteca (versão, dependências)
- **find-library-by-name** - Busca biblioteca por nome

### 💬 Exemplos de Prompts

Depois de configurado, você pode conversar naturalmente com o Copilot:

- "Mostre-me todos os componentes disponíveis na biblioteca"
- "Como uso o componente ButtonComponent?"
- "Quais são os inputs e outputs do FormFieldComponent?"
- "Qual a versão da biblioteca @company/ui-lib?"
- "Crie um exemplo de uso do componente ReusableIoComponent com todos os inputs"
- "Liste todos os componentes que têm output de eventos"

### ⚠️ Importante

- **Não use ambas as configurações**: Configurar o mesmo servidor em `.vscode/mcp.json` e `settings.json` pode causar conflitos.
- **Caminhos absolutos**: Use caminhos absolutos ou a variável `${workspaceFolder}` para evitar problemas.
- **Separadores**: No Windows use `;` para separar múltiplos paths, no Linux/Mac use `:`.





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
      "args": ["<caminho-absoluto>/mcp/build/main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "<caminho-do-projeto>/node_modules/@company/ui;<caminho-do-projeto>/node_modules/@company/forms"
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


