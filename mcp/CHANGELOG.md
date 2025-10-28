# Changelog

## [1.3.0] - 2024-10-26

### 🎯 Configuração Multi-Path para Análise de Bibliotecas

#### ✨ Novas Funcionalidades

- **Suporte a Múltiplos Caminhos de Bibliotecas**: Configure múltiplas fontes de bibliotecas simultaneamente
  - ✅ Bibliotecas instaladas no `node_modules` (via npm/Nexus)
  - ✅ Repositórios Git clonados localmente (código fonte completo)
  - ✅ Múltiplos workspaces Angular/Nx
  - ✅ Bibliotecas compiladas (pasta `dist/` com arquivos `.d.ts`)
  
- **Configuração Flexível**:
  - ✅ Via variável de ambiente: `LIB_COMPONENTS_PATHS`
  - ✅ Via argumentos CLI: `--libs path1 path2 path3`
  - ✅ Suporte a separadores: `;` (Windows) e `:` (Unix/Mac)
  - ✅ Ordem de prioridade: CLI > env var > workspace atual

- **Detecção Automática de Estrutura**:
  - ✅ Workspace completo (angular.json/workspace.json)
  - ✅ Biblioteca específica (package.json + src/)
  - ✅ Biblioteca compilada (dist/ com .d.ts)
  - ✅ Pacotes node_modules com escopo (@scope/package)

- **Suporte a Arquivos .d.ts**:
  - ✅ Análise de componentes em arquivos de definição TypeScript
  - ✅ Suporta declarações `export declare class`
  - ✅ Busca automática por entry points (index.d.ts, public-api.d.ts)

#### 🔧 Melhorias Implementadas

1. **utils.ts**
   - Nova função `parseLibraryPaths()`: Parseia múltiplos caminhos via CLI ou env var
   - Nova função `discoverLibraryFromPath()`: Detecta tipo de estrutura automaticamente
   - Nova função `findDtsEntryPoint()`: Busca arquivos .d.ts como entry points
   - Nova função `discoverLibrariesFromPaths()`: Descobre libs de múltiplos paths
   - Refatorada `discoverLibraries()`: Prioriza paths configurados, depois fallback
   - Logs informativos em cada etapa da descoberta

2. **scanner.ts**
   - Atualizada `walkComponents()`: Suporta `.component.d.ts` além de `.component.ts`
   - Melhorada `extractComponentInfo()`: Detecta `export declare class` em arquivos .d.ts

3. **main.ts**
   - Logs de inicialização melhorados com informações detalhadas
   - Exibe bibliotecas descobertas ao iniciar
   - Mensagens formatadas com separadores visuais

4. **Documentação**
   - README.md: Nova seção "Configuração Multi-Path" com 5 exemplos práticos
   - Novo arquivo `mcp-config-examples.json`: 10 exemplos de configuração prontos
   - Documentação de ordem de prioridade e formatos suportados
   - Exemplos para Windows e Linux/Mac

#### 📝 Arquivos Criados

- **mcp/mcp-config-examples.json**: Arquivo com 10 exemplos de configuração

#### 📝 Arquivos Modificados

- **mcp/src/utils.ts**: +170 linhas (novas funções de multi-path)
- **mcp/src/scanner.ts**: Suporte a .d.ts
- **mcp/src/main.ts**: Logs de inicialização melhorados
- **mcp/README.md**: Nova seção de configuração multi-path

#### 🎯 Casos de Uso Habilitados

Este update permite que projetos usem o MCP para:
1. Analisar libs instaladas via npm/Nexus no node_modules do projeto
2. Analisar repositórios Git locais com código fonte completo
3. Combinar múltiplas fontes de bibliotecas
4. Trabalhar com libs de diferentes projetos simultaneamente
5. Usar em ambientes de CI/CD com paths dinâmicos

## [1.2.0] - 2024-10-25

### 🎯 Suporte a Estruturas de Projeto Genéricas

#### ✨ Novas Funcionalidades

- **Busca Genérica de Bibliotecas**: O MCP server agora detecta bibliotecas em **qualquer estrutura de pastas**
  - ✅ `projects/` - Angular CLI padrão
  - ✅ `libs/` - Nx workspaces
  - ✅ `packages/` - Monorepos (Lerna, pnpm, yarn, npm)
  - ✅ `modules/`, `libraries/` - Estruturas customizadas
  - ✅ Raiz do workspace - Bibliotecas standalone
  - ✅ Estruturas aninhadas - Busca recursiva automática

#### 🔧 Melhorias Implementadas

1. **Busca Recursiva Inteligente**
   - Busca primeiro em pastas comuns (performance)
   - Fallback para busca recursiva em todo workspace
   - Limite de profundidade configurável (4 níveis)
   - Ignora automaticamente `node_modules/`, `dist/`, `.git/`

2. **Descoberta Aprimorada**
   - `discoverFromAngularJson()`: Busca em múltiplas pastas quando `proj.root` não definido
   - `discoverFromNxWorkspace()`: Suporta múltiplas convenções de pastas
   - `findLibrariesRecursively()`: Nova função de busca genérica
   - `find-library-by-name`: Usa descoberta automática em vez de path hardcoded

3. **Performance**
   - Cache de diretórios visitados
   - Busca prioritária em pastas comuns
   - Para busca ao encontrar biblioteca (não continua dentro)

#### 🚫 Removido

- ❌ Hardcoded `projects/` em múltiplos lugares
- ❌ Dependência de estrutura específica

#### 📝 Arquivos Modificados

1. **mcp/src/utils.ts**
   - Refatorada `discoverFromAngularJson()` - busca genérica
   - Refatorada `discoverFromNxWorkspace()` - suporte a múltiplas pastas
   - Nova função `findLibrariesRecursively()` - busca recursiva
   - Atualizada `findPublicApiFallback()` - usa busca recursiva

2. **mcp/src/main.ts**
   - Refatorado `find-library-by-name` - usa `discoverLibraries()` em vez de path hardcoded
   - Adicionado campo `Caminho` na resposta

3. **mcp/GENERIC-STRUCTURE-SUPPORT.md** - Nova documentação completa

4. **mcp/README.md** - Atualizado com informações de suporte genérico

#### 🧪 Testes

- ✅ Estrutura `projects/` continua funcionando
- ✅ Compatível com workspaces existentes
- ✅ Sem breaking changes

#### 📚 Documentação

- [GENERIC-STRUCTURE-SUPPORT.md](./GENERIC-STRUCTURE-SUPPORT.md) - Guia completo de estruturas suportadas

---

## [1.1.0] - 2024-10-24

### ✨ Novas Funcionalidades

#### 🔵 Suporte a Signal Inputs/Outputs (Angular 17+)

- **Signal Inputs**: Detecta `input<T>()` e `input.required<T>()`
  - Extrai tipo genérico
  - Identifica se é obrigatório ou opcional
  - Captura valores default
  - Mantém comentários JSDoc

- **Signal Outputs**: Detecta `output<T>()`
  - Extrai tipo do evento
  - Mantém comentários JSDoc

- **Indicadores Visuais**: 
  - 🟢 `decorator` - para @Input() / @Output()
  - 🔵 `signal` - para input() / output()

#### 📦 Resolução de Tipos Importados

- **Tipos Suportados**:
  - ✅ Interfaces
  - ✅ Type Aliases
  - ✅ Enums
  - ✅ Classes

- **Funcionalidades**:
  - Extrai imports do arquivo
  - Resolve caminhos relativos (.ts, index.ts, etc)
  - Busca definição do tipo no arquivo importado
  - Exibe definição inline no resultado
  - Cache de tipos para performance

#### 🔀 Suporte a Componentes Mistos

- Permite misturar decorators e signals no mesmo componente
- Detecta e categoriza cada input/output individualmente
- Mantém compatibilidade total com componentes existentes

### 📝 Arquivos Criados

1. **mcp/src/import-resolver.ts**
   - `extractImports()` - parseia imports do arquivo
   - `resolveImportPath()` - resolve caminhos relativos
   - `findTypeDefinition()` - busca definições de tipos
   - `resolveImportedType()` - resolve e retorna definição completa
   - `enrichTypeInfo()` - enriquece tipos com informações resolvidas

2. **projects/my-lib/src/lib/components/signal-demo/**
   - `signal-demo.component.ts` - componente de teste com signals
   - `types.ts` - tipos customizados para testes
   - `index.ts` - barrel export

3. **mcp/SIGNAL-SUPPORT.md** - documentação completa
4. **mcp/test-all.sh** - script de testes automatizados

### 🔧 Arquivos Modificados

1. **mcp/src/types.ts**
   - Adicionado tipo `ImportInfo`
   - Adicionado campo `kind?: 'decorator' | 'signal'` em inputs/outputs
   - Adicionado campo `resolvedType?: string` em inputs/outputs
   - Adicionado campo `imports?: ImportInfo[]` em ComponentInfo

2. **mcp/src/parser.ts**
   - Função `parseSignalInput()` - parseia signal inputs
   - Função `parseSignalOutput()` - parseia signal outputs
   - Suporte a `input.required<T>()`
   - Suporte a valores default em signals

3. **mcp/src/docs.ts**
   - Integração com `extractImports()` para resolver tipos
   - Parsing de signal inputs linha por linha
   - Parsing de signal outputs linha por linha
   - Enriquecimento de tipos com `enrichTypeInfo()`
   - Preservação de comentários JSDoc para signals

4. **mcp/src/main.ts**
   - Exibição de `kind` (🟢 decorator / 🔵 signal)
   - Exibição de tipos resolvidos quando disponível
   - Formatação melhorada da resposta

5. **projects/my-lib/src/lib/components/index.ts**
   - Adicionado export do SignalDemoComponent

### 🧪 Testes

- ✅ 4 componentes detectados
- ✅ Signal inputs/outputs detectados corretamente
- ✅ Decorator inputs/outputs funcionando normalmente
- ✅ Componentes mistos (decorators + signals) funcionando
- ✅ Resolução de tipos importados (interface, type, enum)
- ✅ Valores default detectados
- ✅ Campos obrigatórios/opcionais identificados
- ✅ Compilação TypeScript sem erros
- ✅ Sem erros de linting

### 📊 Estatísticas

- **Componentes de teste**: 4 (MyLib, Button, ReusableIo, SignalDemo)
- **Signal inputs/outputs**: 14 detectados
- **Decorator inputs/outputs**: 9+ detectados
- **Tipos importados resolvidos**: 3 (ThemeConfig, SizeOption, ValidationState)

### 🚀 Performance

- Cache de arquivos lidos
- Cache de tipos resolvidos
- Parsing incremental
- Sem impacto em componentes existentes

### 🔄 Compatibilidade

- ✅ Totalmente compatível com componentes usando decorators
- ✅ Suporta Angular 17+ com signals
- ✅ Funciona com componentes mistos
- ✅ Não quebra funcionalidade existente

### 📚 Documentação

- README atualizado com exemplos
- Documentação completa em SIGNAL-SUPPORT.md
- Scripts de teste automatizados
- Exemplos de uso com cada tipo de componente

---

## [1.0.0] - 2024-10-23

### Versão Inicial

- Suporte a @Input() e @Output() decorators
- Listagem de componentes
- Detalhes de componentes
- Informações de bibliotecas
- Suporte a múltiplas bibliotecas
- Suporte a secondary entry points

