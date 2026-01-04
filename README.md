# Meowdoc (Function Mapper)

A VS Code extension that lists all functions in your workspace and their relations using `web-tree-sitter`. This provides a fast, syntax-aware overview of your TypeScript/JavaScript codebase without relying on heavy language servers.

## Features

- **Scope Selection**: Filter the view to a specific workspace folder for focused navigation.
- **Function List**: View a tree of all files and their function definitions in the "Function Mapper" side panel.
- **Jump to Definition**: Click on any function in the list to navigate directly to its definition in the code.
- **Syntax Aware**: Uses `tree-sitter` for accurate parsing of function declarations, methods, and arrow functions.
- **WASM Powered**: Runs entirely within VS Code using WebAssembly, ensuring compatibility and performance.

## Supported Languages

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- ABAP (`.abap`) (Support for `FORM` definitions)

## Development Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    # OR
    bun install
    ```

2.  **Download WASM Grammars**:
    The extension relies on `tree-sitter` WASM files. Run the script to download them:
    ```bash
    node scripts/download-wasm.js
    ```

3.  **Compile**:
    ```bash
    bun run compile
    ```

4.  **Run**:
    Press `F5` in VS Code to open the **Extension Development Host**.

## Architecture

-   **`src/extension.ts`**: Entry point, registers the Tree Data Provider.
-   **`src/treeProvider.ts`**: Implements the VS Code Tree View API.
-   **`src/analyzer.ts`**: Handles file reading and `web-tree-sitter` parsing logic.
-   **`wasm/`**: Contains the downloaded Tree-sitter language definitions.

## Known Issues

-   Call graph/relations feature is currently a work-in-progress.
-   Only top-level functions and class methods are currently indexed reliably.