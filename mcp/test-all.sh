#!/bin/bash

echo "=========================================="
echo "🧪 Teste do MCP Server - Signal Support"
echo "=========================================="
echo ""

echo "📋 1. Listando todos os componentes..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list-components","arguments":{}},"id":1}' | node build/main.js 2>&1 | tail -1 | grep -o '[A-Z][a-zA-Z]*Component' | sort | uniq
echo ""

echo "=========================================="
echo "🔵 2. Teste: SignalDemoComponent (signals + tipos importados)"
echo "=========================================="
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get-component","arguments":{"name":"SignalDemoComponent"}},"id":1}' | node build/main.js 2>&1 | tail -1 | grep -o "signal" | wc -l | xargs -I {} echo "{} signal inputs/outputs detectados"
echo ""

echo "=========================================="
echo "🟢 3. Teste: ButtonComponent (decorators tradicionais)"
echo "=========================================="
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get-component","arguments":{"name":"ButtonComponent"}},"id":1}' | node build/main.js 2>&1 | tail -1 | grep -o "decorator" | wc -l | xargs -I {} echo "{} decorator inputs/outputs detectados"
echo ""

echo "=========================================="
echo "📦 4. Teste: Resolução de tipos importados"
echo "=========================================="
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get-component","arguments":{"name":"SignalDemoComponent"}},"id":1}' | node build/main.js 2>&1 | tail -1 | grep -o "/\*.*\*/" | head -3
echo ""

echo "=========================================="
echo "✅ Testes concluídos!"
echo "=========================================="

