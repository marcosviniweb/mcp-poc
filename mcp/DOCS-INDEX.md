# 📚 Índice de Documentação

Guia completo de toda a documentação do MCP Server lib-components.

## 🚀 Para Começar

### 1. [README.md](./README.md)
**Documentação principal do projeto**
- Visão geral das funcionalidades
- Configuração multi-path (NOVO!)
- Exemplos de uso
- Ferramentas MCP disponíveis
- Arquitetura do sistema

### 2. [QUICK-START-MULTI-PATH.md](./QUICK-START-MULTI-PATH.md)
**Guia rápido para testar a funcionalidade multi-path**
- 4 formas diferentes de teste
- Exemplos de configuração para mcp.json
- Como verificar se funcionou
- Troubleshooting básico
- Comandos para testar via Cursor

### 3. [NEXUS-BITBUCKET-GUIDE.md](./NEXUS-BITBUCKET-GUIDE.md)
**Guia específico para bibliotecas via Nexus/Bitbucket** ⭐ RECOMENDADO
- Passo a passo completo para o cenário do usuário
- Como configurar libs do node_modules
- Exemplos reais e práticos
- Troubleshooting específico
- Dicas e boas práticas

## 📖 Documentação Técnica

### 4. [SIGNAL-SUPPORT.md](./SIGNAL-SUPPORT.md)
**Documentação detalhada sobre suporte a Angular Signals**
- Como funciona a detecção de signals
- Exemplos de código
- Comparação decorator vs signal
- Casos de uso

### 5. [GENERIC-STRUCTURE-SUPPORT.md](./GENERIC-STRUCTURE-SUPPORT.md)
**Documentação sobre suporte a estruturas genéricas de projeto**
- Como funciona a descoberta de bibliotecas
- Estruturas suportadas
- Algoritmo de busca recursiva

### 6. [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)
**Resumo completo da implementação multi-path v1.3.0**
- Funcionalidades implementadas
- Arquivos modificados e criados
- Detalhes técnicos do fluxo
- Estatísticas da implementação
- Checklist completo

## 📋 Referência

### 7. [CHANGELOG.md](./CHANGELOG.md)
**Histórico completo de mudanças**
- v1.3.0 - Multi-path support
- v1.2.0 - Generic structure support
- Versões anteriores

### 8. [mcp-config-examples.json](./mcp-config-examples.json)
**10+ exemplos de configuração prontos**
- Uma única biblioteca
- Múltiplas bibliotecas (env e CLI)
- Workspace + libs externas
- Dist folder
- Pacotes com escopo
- Fontes mistas
- Exemplos Unix/Mac
- Nx workspace
- Monorepo

### 9. [RESUMO-MELHORIAS.md](./RESUMO-MELHORIAS.md)
**Resumo de melhorias anteriores**
- Histórico de evoluções do projeto

## 🎯 Qual Documentação Ler?

### Se você é novo no projeto:
1. ✅ Comece com [README.md](./README.md)
2. ✅ Depois [QUICK-START-MULTI-PATH.md](./QUICK-START-MULTI-PATH.md)
3. ✅ Se usar libs do Nexus: [NEXUS-BITBUCKET-GUIDE.md](./NEXUS-BITBUCKET-GUIDE.md)

### Se você quer entender os signals:
1. ✅ [SIGNAL-SUPPORT.md](./SIGNAL-SUPPORT.md)

### Se você quer entender como funciona por baixo:
1. ✅ [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)
2. ✅ [GENERIC-STRUCTURE-SUPPORT.md](./GENERIC-STRUCTURE-SUPPORT.md)

### Se você quer apenas exemplos de configuração:
1. ✅ [mcp-config-examples.json](./mcp-config-examples.json)

### Se você quer ver o histórico de mudanças:
1. ✅ [CHANGELOG.md](./CHANGELOG.md)

## 📝 Estrutura dos Arquivos

```
mcp/
├── README.md                          # 📘 Documentação principal
├── DOCS-INDEX.md                      # 📚 Este arquivo (índice)
├── QUICK-START-MULTI-PATH.md         # 🚀 Quick start
├── NEXUS-BITBUCKET-GUIDE.md          # ⭐ Guia para Nexus/Bitbucket
├── IMPLEMENTATION-SUMMARY.md         # 🔧 Detalhes da implementação
├── CHANGELOG.md                       # 📋 Histórico de mudanças
├── SIGNAL-SUPPORT.md                 # 🔵 Documentação de signals
├── GENERIC-STRUCTURE-SUPPORT.md      # 🏗️ Estruturas suportadas
├── RESUMO-MELHORIAS.md               # 📊 Resumo de melhorias
├── mcp-config-examples.json          # 💾 Exemplos de configuração
├── package.json                      # 📦 Configuração do projeto
├── tsconfig.json                     # ⚙️ Configuração TypeScript
├── src/                              # 💻 Código fonte
│   ├── main.ts                       # Entry point
│   ├── utils.ts                      # Utilitários (multi-path aqui!)
│   ├── scanner.ts                    # Scanner de componentes
│   ├── parser.ts                     # Parser de inputs/outputs
│   ├── docs.ts                       # Parser de documentação
│   ├── exports.ts                    # Resolver de exports
│   ├── import-resolver.ts            # Resolver de imports
│   └── types.ts                      # Definições de tipos
└── build/                            # 🏭 Código compilado
    └── main.js                       # Entry point compilado
```

## 🎓 Tutoriais por Caso de Uso

### Caso 1: Projeto Angular usando libs via npm/Nexus
**Documentação:** [NEXUS-BITBUCKET-GUIDE.md](./NEXUS-BITBUCKET-GUIDE.md)

### Caso 2: Desenvolvendo libs localmente
**Documentação:** [README.md](./README.md) seção "Configuração Multi-Path"

### Caso 3: Nx Workspace com múltiplas libs
**Documentação:** [mcp-config-examples.json](./mcp-config-examples.json) exemplo #9

### Caso 4: Monorepo com packages/
**Documentação:** [mcp-config-examples.json](./mcp-config-examples.json) exemplo #10

### Caso 5: Libs compiladas (apenas dist/)
**Documentação:** [mcp-config-examples.json](./mcp-config-examples.json) exemplo #5

## 🔗 Links Externos

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Angular Signals Documentation](https://angular.io/guide/signals)
- [Cursor AI](https://cursor.sh/)

## 💬 Suporte

Encontrou um problema ou tem dúvidas?

1. Verifique o [CHANGELOG.md](./CHANGELOG.md) para mudanças recentes
2. Consulte o [QUICK-START-MULTI-PATH.md](./QUICK-START-MULTI-PATH.md) seção Troubleshooting
3. Veja os exemplos em [mcp-config-examples.json](./mcp-config-examples.json)
4. Leia o [NEXUS-BITBUCKET-GUIDE.md](./NEXUS-BITBUCKET-GUIDE.md) se usar Nexus

## 🚀 Contribuindo

Ao contribuir com documentação:

1. Atualize o [CHANGELOG.md](./CHANGELOG.md)
2. Adicione exemplos em [mcp-config-examples.json](./mcp-config-examples.json) se aplicável
3. Atualize este índice se criar novos arquivos de documentação
4. Mantenha o [README.md](./README.md) como fonte única de verdade

---

**Última atualização:** 2024-10-26 (v1.3.0 - Multi-path Support)

