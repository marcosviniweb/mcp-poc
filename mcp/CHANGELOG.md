# Changelog

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

