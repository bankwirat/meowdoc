

## Automatic Installation

To build and install the extension for all available editors (VS Code, Cursor, Antigravity) at once:

```bash
./install.sh
```

## Manual Installation

1.  **Package the Extension**:
    You need `vsce` (Visual Studio Code Extensions) to package the extension.
    ```bash
    bun run package
    ```
    This will create a `meowdoc-0.0.1.vsix` file in the project root.

2.  **Install the .vsix file**:
    -   **VS Code / Cursor / Antigravity**:
        -   Open the Command Palette (`Cmd+Shift+P`).
        -   Type "Extensions: Install from VSIX...".
        -   Select the generated `meowdoc-0.0.1.vsix` file.
    -   **CommandLine**:
        ```bash
        code --install-extension meowdoc-0.0.1.vsix
        # OR for Cursor
        cursor --install-extension meowdoc-0.0.1.vsix
        # OR for Antigravity
        antigravity --install-extension meowdoc-0.0.1.vsix
        ```

## Updating

To update the extension after making changes:

1.  **Re-package**:
    ```bash
    bun run package
    ```

2.  **Re-install**:
    Use the `--force` flag to overwrite the existing installation:
    ```bash
    code --install-extension meowdoc-0.0.1.vsix --force
    # OR for Cursor
    cursor --install-extension meowdoc-0.0.1.vsix --force
    # OR for Antigravity
    antigravity --install-extension meowdoc-0.0.1.vsix --force
    ```
    
3.  **Reload**:
    Reload your editor window (`Cmd+R`).
