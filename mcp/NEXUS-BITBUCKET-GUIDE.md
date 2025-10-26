# Guia: Usando MCP com Bibliotecas do Nexus/Bitbucket

Este guia mostra como configurar o MCP Server para analisar bibliotecas Angular instaladas via Nexus (que vêm do Bitbucket) no seu projeto.

## 🎯 Cenário

Você tem:
- Um projeto Angular que consome várias bibliotecas internas da empresa
- As bibliotecas estão publicadas no Nexus
- Você instala elas via npm: `npm install @company/lib-name`
- As bibliotecas ficam em `node_modules/@company/`
- Você quer que a LLM do Cursor entenda como usar essas libs

## ✅ Solução

Configure o MCP para apontar diretamente para essas libs no `node_modules` do seu projeto!

## 📝 Passo a Passo

### 1. Identifique as Bibliotecas no seu Projeto

Abra a pasta `node_modules` do seu projeto e identifique as libs:

```
C:\seu-projeto\node_modules\
├── @company\
│   ├── ui-components\      ← Biblioteca 1
│   ├── form-controls\      ← Biblioteca 2
│   ├── data-grid\          ← Biblioteca 3
│   └── layout\             ← Biblioteca 4
```

### 2. Configure o mcp.json do Cursor

Edite o arquivo: `C:\Users\[seu-usuario]\.cursor\mcp.json`

#### Opção A: Todas as Libs de uma Vez (Recomendado)

Se todas as suas libs estão no mesmo escopo `@company`:

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\workspace\\sistemas\\poc-mcp-server\\poc-mcp-lib\\mcp\\build\\main.js"
      ],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\seu-projeto\\node_modules\\@company\\ui-components;C:\\seu-projeto\\node_modules\\@company\\form-controls;C:\\seu-projeto\\node_modules\\@company\\data-grid;C:\\seu-projeto\\node_modules\\@company\\layout"
      }
    }
  }
}
```

#### Opção B: Libs Específicas via CLI

Se você quer ter mais controle:

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\workspace\\sistemas\\poc-mcp-server\\poc-mcp-lib\\mcp\\build\\main.js",
        "--libs",
        "C:\\seu-projeto\\node_modules\\@company\\ui-components",
        "C:\\seu-projeto\\node_modules\\@company\\form-controls",
        "C:\\seu-projeto\\node_modules\\@company\\data-grid"
      ]
    }
  }
}
```

#### Opção C: Mix de node_modules + Repos Locais

Se você também tem alguns repos clonados localmente:

```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\workspace\\sistemas\\poc-mcp-server\\poc-mcp-lib\\mcp\\build\\main.js"
      ],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\seu-projeto\\node_modules\\@company\\ui-components;C:\\repos\\minha-lib-local"
      }
    }
  }
}
```

### 3. Substitua os Caminhos Reais

**IMPORTANTE:** Substitua os caminhos de exemplo pelos caminhos reais do seu ambiente:

- `C:\\workspace\\sistemas\\poc-mcp-server\\poc-mcp-lib\\mcp\\build\\main.js`
  → Caminho onde você clonou este MCP server
  
- `C:\\seu-projeto\\node_modules\\@company\\ui-components`
  → Caminho real do seu projeto
  
**Exemplo real:**
```json
{
  "mcpServers": {
    "lib-components": {
      "command": "node",
      "args": [
        "C:\\Users\\engma\\workspace\\poc-mcp-lib\\mcp\\build\\main.js"
      ],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\projects\\meu-app\\node_modules\\@minhaempresa\\biblioteca-ui;C:\\projects\\meu-app\\node_modules\\@minhaempresa\\biblioteca-forms"
      }
    }
  }
}
```

### 4. Reinicie o Cursor

Depois de salvar o `mcp.json`:
1. Feche completamente o Cursor
2. Abra novamente
3. Aguarde o MCP Server inicializar

### 5. Verifique os Logs

Abra o Developer Tools do Cursor:
- Menu: `Help` → `Toggle Developer Tools`
- Vá para a aba `Console`
- Procure por mensagens começando com `[MCP]`

Você deve ver algo como:

```
============================================================
MCP Server 'lib-components' iniciando...
============================================================
[MCP] Usando paths configurados: 2 path(s)
  - C:\projects\meu-app\node_modules\@minhaempresa\biblioteca-ui
  - C:\projects\meu-app\node_modules\@minhaempresa\biblioteca-forms
[MCP] Encontradas 2 biblioteca(s) nos paths configurados

✓ 2 biblioteca(s) disponível(is):
  • @minhaempresa/biblioteca-ui
    Root: C:\projects\meu-app\node_modules\@minhaempresa\biblioteca-ui
    Entry: index.d.ts
  • @minhaempresa/biblioteca-forms
    Root: C:\projects\meu-app\node_modules\@minhaempresa\biblioteca-forms
    Entry: public-api.d.ts
============================================================
Servidor pronto. Aguardando requisições...
============================================================
```

## 🧪 Testando

Agora converse com o Cursor AI e teste:

### Perguntas de Teste:

**1. Listar componentes:**
```
"Quais componentes estão disponíveis nas bibliotecas?"
```

**2. Detalhes de um componente específico:**
```
"Como usar o ButtonComponent da biblioteca ui?"
ou
"Quais são os inputs do FormFieldComponent?"
```

**3. Informações da biblioteca:**
```
"Qual a versão da biblioteca ui-components?"
ou
"Quais as dependências da biblioteca forms?"
```

**4. Pedindo código:**
```
"Me mostre um exemplo de uso do DataGridComponent"
ou
"Como implementar um formulário usando o FormFieldComponent?"
```

## 🔄 Mantendo Atualizado

Quando você atualizar as bibliotecas no seu projeto:

```bash
npm install @company/ui-components@latest
```

O MCP automaticamente verá a nova versão porque está lendo diretamente do `node_modules`!

**Não precisa reconfigurar nada.** 🎉

## 📦 Adicionando Novas Bibliotecas

Quando instalar uma nova biblioteca:

1. Instale normalmente:
```bash
npm install @company/nova-lib
```

2. Adicione o path no `mcp.json`:
```json
{
  "env": {
    "LIB_COMPONENTS_PATHS": "...(libs existentes)...;C:\\seu-projeto\\node_modules\\@company\\nova-lib"
  }
}
```

3. Reinicie o Cursor

## 🐛 Troubleshooting

### Problema: "Nenhuma biblioteca encontrada"

**Causa:** Caminhos incorretos ou estrutura não reconhecida

**Solução:**
1. Verifique se os paths existem e estão corretos
2. Verifique se há `package.json` em cada lib
3. Verifique se há arquivos `.d.ts` na lib

**Como verificar:**
```bash
# Windows
dir "C:\seu-projeto\node_modules\@company\ui-components"

# Deve mostrar:
# - package.json
# - index.d.ts (ou public-api.d.ts)
# - Pastas com componentes
```

### Problema: "Componentes não aparecem"

**Causa:** A lib não tem arquivos `.component.d.ts` exportados

**Solução:**
1. Verifique se a lib tem componentes:
```bash
dir /s "C:\seu-projeto\node_modules\@company\ui-components\*.d.ts"
```

2. Verifique se o `index.d.ts` exporta os componentes
3. Pode ser que a lib não seja uma lib de componentes Angular

### Problema: Separador no Windows

**Causa:** Usar `:` em vez de `;` no Windows

**Solução:**
```json
// ❌ ERRADO (Windows)
"LIB_COMPONENTS_PATHS": "C:\\path1:C:\\path2"

// ✅ CORRETO (Windows)
"LIB_COMPONENTS_PATHS": "C:\\path1;C:\\path2"
```

## 💡 Dicas

### 1. Use Caminhos Absolutos
Sempre use caminhos absolutos completos para evitar problemas.

### 2. Escape Barras no JSON
No Windows, use `\\` em vez de `\`:
```json
"C:\\projeto\\node_modules"  // ✅ Correto
"C:\projeto\node_modules"    // ❌ Errado (escapes inválidos)
```

### 3. Verifique o package.json das Libs
Algumas libs podem ter estrutura diferente. Abra o `package.json` e veja:
```json
{
  "name": "@company/ui-components",
  "main": "index.js",
  "types": "index.d.ts"  // ← Entry point dos tipos
}
```

### 4. Use Repos Locais para Análise Mais Rica
Se você tem acesso aos repos no Bitbucket, clone localmente:

```bash
git clone https://bitbucket.org/company/ui-components.git C:\repos\ui-components
```

Depois adicione no config:
```json
{
  "LIB_COMPONENTS_PATHS": "C:\\repos\\ui-components;..."
}
```

Vantagens:
- ✅ Código fonte completo (não apenas .d.ts)
- ✅ Comentários JSDoc preservados
- ✅ Exemplos e documentação inline
- ✅ Você pode fazer mudanças e testar localmente

## 🎯 Exemplo Completo Real

Digamos que você trabalha na "SeraSoft" e tem estas libs:

```
node_modules/
├── @serasoft/
│   ├── design-system/
│   ├── formularios/
│   ├── tabelas/
│   └── layouts/
```

**Configuração:**

```json
{
  "mcpServers": {
    "serasoft-libs": {
      "command": "node",
      "args": [
        "C:\\Users\\engma\\workspace\\poc-mcp-lib\\mcp\\build\\main.js"
      ],
      "env": {
        "LIB_COMPONENTS_PATHS": "C:\\projects\\meu-app\\node_modules\\@serasoft\\design-system;C:\\projects\\meu-app\\node_modules\\@serasoft\\formularios;C:\\projects\\meu-app\\node_modules\\@serasoft\\tabelas;C:\\projects\\meu-app\\node_modules\\@serasoft\\layouts"
      }
    }
  }
}
```

**Uso no Cursor:**

Usuário: "Quais componentes de formulário estão disponíveis?"

Cursor (via MCP): "Encontrei os seguintes componentes na biblioteca @serasoft/formularios:
- InputTextComponent
- SelectComponent
- DatePickerComponent
- FormGroupComponent
..."

Usuário: "Como usar o DatePickerComponent?"

Cursor (via MCP): "O DatePickerComponent tem os seguintes inputs:
- value: Date | null
- format: string (default: 'dd/MM/yyyy')
- minDate?: Date
- maxDate?: Date
..."

## 🎉 Pronto!

Agora a LLM do Cursor consegue entender e ajudar você a usar as bibliotecas da sua empresa! 🚀

