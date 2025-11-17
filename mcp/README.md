# 🌟 Lyra - Library Retrieval Assistant

> **AI-powered MCP server that helps you discover, understand, and use Angular library components through natural language. Built with the Model Context Protocol for seamless integration with AI assistants.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.4.0-green.svg)](https://modelcontextprotocol.io/)
[![Angular](https://img.shields.io/badge/Angular-14%2B-red.svg)](https://angular.io/)

**[Portuguese (Brazil) Version](./README.pt-BR.md)**

---

> :exclamation: **Importante:** To use MCP Servers you must have High Privileges Access approved in Identity Central.

## 🎯 What is Lyra?

**Lyra** (Library Retrieval Assistant) is a Model Context Protocol (MCP) server that enables AI assistants (like GitHub Copilot, Claude, Cursor) to understand and interact with Angular component libraries. It automatically discovers components, their inputs/outputs, signals, and provides usage examples.

### Perfect for:
- 🏢 **Design Systems** - Document and query component libraries
- 📚 **Component Libraries** - Make your UI components AI-discoverable
- 🔄 **Monorepos** - Support for Nx, Angular CLI, and custom structures
- 🤖 **AI-Powered Development** - Let AI help you use your components correctly

---

## ✨ Key Features

### 🔍 **Smart Component Discovery**
- ✅ Auto-detects Angular components in multiple library structures
- ✅ Supports **Nx monorepos** with `tsconfig.base.json` path mappings
- ✅ Works with **Angular CLI** workspaces
- ✅ Handles compiled libraries (`.d.ts` files)

### 🎨 **Complete Component Information**
- ✅ **Inputs**: type, required/optional, default values, descriptions
- ✅ **Outputs**: type, event descriptions
- ✅ **Signals**: `input()`, `output()`, `model()` (Angular 17+)
- ✅ **Decorators**: `@Input()`, `@Output()` (Angular 14+)
- ✅ **Type Resolution**: Resolves imported interfaces, types, enums inline

### 🛠️ **MCP Tools Available**
- `list-components` - List all Angular components in the library
- `get-component` - Get detailed information about a specific component
- `get-documentation` - Search and retrieve markdown documentation (README, guides, examples)
- `get-library-info` - Get library metadata (version, dependencies)
- `find-library-by-name` - Search for a library by name
- `how-to-install` - Instructions for installing libraries from private Nexus registry

### 📋 **MCP Prompts Available**
- `no-styling-guidelines` - Guidelines to ensure AI assistants provide ONLY functional component usage without CSS styling suggestions

---

## 🚀 Quick Start

### 1️⃣ Installation

```bash
cd mcp
npm install
npm run build
```

### 2️⃣ Configuration

#### For **GitHub Copilot** (VS Code)

Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp/build/main.js",
        "--libs",
        "/path/to/your/angular/workspace"
      ]
    }
  }
}
```

#### For **Nx Monorepo with Path Mappings** (Recommended)

If your workspace has a `tsconfig.base.json` with path mappings:

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp/build/main.js",
        "--libs",
        "/path/to/monorepo/root"
      ]
    }
  }
}
```

The server will automatically detect paths like:
```json
{
  "paths": {
    "@company/ui/components/*": ["libs/ui/components/*/src/index.ts"],
    "@company/ui/blocks/*": ["libs/ui/blocks/*/src/index.ts"]
  }
}
```

### 3️⃣ Usage with AI Assistants

Once configured, you can ask your AI assistant:

```
💬 "List all components in the library"
💬 "Show me details about ButtonComponent"
💬 "What are the inputs and outputs of CardComponent?"
💬 "Create an example using the DataTableComponent"
💬 "Which components have event outputs?"
```

---

## 🏗️ Supported Project Structures

The server automatically detects libraries in various structures:

### ✅ Nx Monorepo (Recommended)
```
workspace/
├── tsconfig.base.json          # With path mappings
├── libs/
│   └── ui/
│       ├── components/
│       │   ├── button/src/index.ts
│       │   └── card/src/index.ts
│       └── blocks/
│           ├── form/src/index.ts
│           └── table/src/index.ts
```

### ✅ Angular CLI Workspace
```
workspace/
├── angular.json
└── projects/
    └── my-lib/
        └── src/public-api.ts
```

### ✅ Individual Library
```
my-lib/
├── package.json
├── ng-package.json
└── src/
    └── public-api.ts
```

### ✅ Compiled Library
```
dist/my-lib/
├── package.json
└── index.d.ts
```

---

## 🎯 Real-World Example: Lumina Design System

This MCP server was built for the **Lumina Design System**, an Nx monorepo with 38+ components and blocks.

**Configuration:**
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

**What it discovers:**
- ✅ 33+ blocks in `libs/ui/blocks/*`
- ✅ 5+ components in `libs/ui/components/*`
- ✅ All exported components (LudsCard, LudsButton, LudsTable, etc.)

---

## 🔧 Advanced Configuration

### Multiple Libraries

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": [
        "/path/to/mcp/build/main.js",
        "--libs",
        "/path/to/workspace1",
        "/path/to/workspace2",
        "/path/to/node_modules/@company/ui-lib"
      ]
    }
  }
}
```

### Environment Variables (Alternative)

```json
{
  "servers": {
    "libray-retrievel-assistent": {
      "command": "node",
      "args": ["/path/to/mcp/build/main.js"],
      "env": {
        "LIB_COMPONENTS_PATHS": "/path/to/lib1;/path/to/lib2"
      }
    }
  }
}
```

**Note**: On Windows use `;` as separator, on Unix/Mac use `:`

---

## 🧪 Testing & Debugging

### View Logs

**GitHub Copilot (VS Code):**
- Go to **View → Output**
- Select **"GitHub Copilot Chat"** from dropdown
- Look for lines starting with `[MCP]` or `[list-components]`

**Expected output:**
```
[MCP] Using configured paths: 1 path(s)
  - C:\workspace\lumina-design-system
[MCP] Found 38 library(ies) via tsconfig.base.json paths
[list-components] Found 38 libraries
  - luds/ui/blocks/card at C:\workspace\lumina-design-system\libs\ui\blocks\card
  - luds/ui/blocks/button at C:\workspace\lumina-design-system\libs\ui\blocks\button
  ...
```

### Common Issues

#### ❌ No libraries found
- ✅ Verify paths are absolute
- ✅ Check separator (`;` on Windows, `:` on Unix/Mac)
- ✅ Ensure `package.json` exists in library root
- ✅ Verify structure: must have `src/public-api.ts` OR `.d.ts` files

#### ❌ No components found
- ✅ Check for `.component.ts` or `.component.d.ts` files
- ✅ Verify entry point exports components
- ✅ Check component location: `src/lib/components/` or exported in `public-api.ts`

---

## 🎨 Angular Signals Support

Full support for Angular 17+ signal-based APIs:

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
  
  // Classic decorators (also supported)
  @Input() theme?: 'light' | 'dark';
  @Output() changed = new EventEmitter<string>();
}
```

The MCP server extracts and displays all this information with proper type resolution.

---

## 🤝 Compatible With

- ✅ **GitHub Copilot** (VS Code)
- ✅ **Cursor** IDE
- ✅ **Claude Desktop**
- ✅ **Any MCP-compatible AI assistant**

---

## 🛠️ Tech Stack

- **TypeScript 5.7+**
- **Model Context Protocol SDK 1.4.0**
- **Zod** for schema validation
- **Node.js 18+**

---

