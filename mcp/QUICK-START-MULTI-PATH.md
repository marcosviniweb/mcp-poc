# Quick Start - Configuração Multi-Path

Este guia mostra como testar rapidamente as novas funcionalidades de multi-path do MCP Server.

## 🚀 Teste Rápido

### 1. Testando com o Workspace Atual (Comportamento Original)

```bash
node build/main.js
```

**Resultado Esperado:**
```
============================================================
MCP Server 'lib-components' iniciando...
============================================================
[MCP] Buscando bibliotecas no workspace atual...
[MCP] Workspace root: C:\workspace\sistemas\poc-mcp-server\poc-mcp-lib
[MCP] Encontradas 1 biblioteca(s) via angular.json

✓ 1 biblioteca(s) disponível(is):
  • my-lib
    Root: C:\workspace\sistemas\poc-mcp-server\poc-mcp-lib\projects\my-lib
    Entry: public-api.ts
============================================================
```

### 2. Testando com Path Específico via CLI

```bash
node build/main.js --libs "C:\workspace\sistemas\poc-mcp-server\poc-mcp-lib\projects\my-lib"
```

**Resultado Esperado:**
```
[MCP] Usando paths configurados: 1 path(s)
  - C:\workspace\sistemas\poc-mcp-server\poc-mcp-lib\projects\my-lib
[MCP] Encontradas 1 biblioteca(s) nos paths configurados
```

### 3. Testando com Variável de Ambiente

**Windows (PowerShell):**
```powershell
$env:LIB_COMPONENTS_PATHS="C:\workspace\sistemas\poc-mcp-server\poc-mcp-lib\projects\my-lib"
node build/main.js
```

**Windows (CMD):**
```cmd
set LIB_COMPONENTS_PATHS=C:\workspace\sistemas\poc-mcp-server\poc-mcp-lib\projects\my-lib
node build/main.js
```

**Linux/Mac:**
```bash
export LIB_COMPONENTS_PATHS="/path/to/lib1:/path/to/lib2"
node build/main.js
```

### 4. Testando Múltiplas Bibliotecas

Crie múltiplas libs no seu workspace ou aponte para diferentes paths:

```bash
node build/main.js --libs "C:\path\lib1" "C:\path\lib2" "C:\path\lib3"
```

## 📝 Configurando no mcp.json do Cursor

### Exemplo 1: Uma Biblioteca do node_modules

Edite `C:\Users\[seu-usuario]\.cursor\mcp.json`:

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\workspace\\sistemas\\poc-mcp-server\\poc-mcp-lib\\mcp\\build\\main.js"
      ],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\seu-projeto\\node_modules\\@company\\ui-lib"
      }
    }
  }
}
```

### Exemplo 2: Múltiplas Bibliotecas

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\workspace\\sistemas\\poc-mcp-server\\poc-mcp-lib\\mcp\\build\\main.js"
      ],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\projeto\\node_modules\\@company\\ui-lib;C:\\projeto\\node_modules\\@company\\forms;C:\\repos\\custom-lib"
      }
    }
  }
}
```

### Exemplo 3: Via Argumentos CLI

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\workspace\\sistemas\\poc-mcp-server\\poc-mcp-lib\\mcp\\build\\main.js",
        "--libs",
        "C:\\projeto\\node_modules\\@company\\ui-lib",
        "C:\\repos\\custom-lib"
      ]
    }
  }
}
```

## 🔍 Verificando se Funcionou

Após configurar, reinicie o Cursor e abra o painel de MCP (ou Developer Tools).

Procure pelos logs do MCP Server:

```
============================================================
MCP Server 'lib-components' iniciando...
============================================================
[MCP] Usando paths configurados: 2 path(s)
  - C:\projeto\node_modules\@company\ui-lib
  - C:\repos\custom-lib
[MCP] Encontradas 2 biblioteca(s) nos paths configurados

✓ 2 biblioteca(s) disponível(is):
  • @company/ui-lib
    Root: C:\projeto\node_modules\@company\ui-lib
    Entry: index.d.ts
  • custom-lib
    Root: C:\repos\custom-lib
    Entry: public-api.ts
============================================================
```

## 🧪 Testando Comandos MCP

Após configurar, teste os comandos via chat do Cursor:

### Listar Componentes
```
"Quais componentes estão disponíveis?"
ou
"Liste todos os componentes"
```

### Detalhes de um Componente
```
"Como usar o ButtonComponent?"
ou
"Quais são os inputs do ButtonComponent?"
```

### Informações da Biblioteca
```
"Qual a versão da biblioteca ui-lib?"
ou
"Quais as dependências da biblioteca?"
```

## 📦 Estruturas Suportadas

O MCP detecta automaticamente:

### 1. Workspace Angular/Nx Completo
```
my-workspace/
├── angular.json  (ou workspace.json)
├── projects/
│   └── my-lib/
│       ├── src/
│       │   └── public-api.ts
│       └── package.json
```

### 2. Biblioteca Específica (Código Fonte)
```
my-lib/
├── package.json
├── src/
│   └── public-api.ts
└── ng-package.json
```

### 3. Biblioteca Compilada (node_modules)
```
node_modules/
└── @company/
    └── ui-lib/
        ├── package.json
        ├── index.d.ts  (ou public-api.d.ts)
        └── *.component.d.ts
```

### 4. Biblioteca com Dist
```
my-lib/
├── package.json
└── dist/
    ├── index.d.ts
    └── components/
        └── *.component.d.ts
```

## 🐛 Troubleshooting

### Nenhuma biblioteca encontrada

Verifique:
1. Os paths estão corretos e existem?
2. Usou separador correto? (`;` no Windows, `:` no Unix)
3. Os paths têm estrutura válida (package.json + src/ ou dist/)?

### Componentes não aparecem

Verifique:
1. A biblioteca tem arquivos `.component.ts` ou `.component.d.ts`?
2. O entry point (public-api.ts) exporta os componentes?
3. Os logs mostram que a biblioteca foi encontrada?

### Logs não aparecem

No Cursor:
1. Abra Developer Tools (Help > Toggle Developer Tools)
2. Vá na aba Console
3. Procure por mensagens com `[MCP]`

## 📚 Mais Exemplos

Veja o arquivo `mcp-config-examples.json` para 10+ exemplos de configuração prontos para diferentes cenários.

## 🎯 Próximos Passos

1. Configure o MCP apontando para as libs do seu projeto no node_modules
2. Teste os comandos via chat do Cursor
3. Ajuste os paths conforme necessário
4. Adicione mais bibliotecas ao path conforme precisar

Para dúvidas, consulte o README.md principal.

