import * as vscode from 'vscode';
import { FunctionTreeDataProvider } from './treeProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "meowdoc" is now active!');

    const treeProvider = new FunctionTreeDataProvider(context);
    vscode.window.registerTreeDataProvider('function-mapper-view', treeProvider);

    vscode.commands.registerCommand('meowdoc.selectScope', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const items = [
            { label: 'All', description: 'Show all workspace folders', path: undefined },
            ...workspaceFolders.map(f => ({ label: f.name, description: f.uri.fsPath, path: f.uri.fsPath }))
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select Scope'
        });

        if (selected) {
            treeProvider.setScope(selected.path);
        }
    });

    vscode.commands.registerCommand('meowdoc.selectViewMode', async () => {
        const items = [
            { label: 'Folder', description: 'Group by folders', mode: 'folder' as const },
            { label: 'Class', description: 'Group by classes', mode: 'class' as const },
            { label: 'Flat', description: 'List all functions', mode: 'flat' as const }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select View Mode'
        });

        if (selected) {
            treeProvider.setViewMode(selected.mode);
        }
    });

    vscode.commands.executeCommand('setContext', 'meowdoc.viewMode', 'folder');

    vscode.commands.registerCommand('meowdoc.setView.folder', () => treeProvider.setViewMode('folder'));
    vscode.commands.registerCommand('meowdoc.setView.class', () => treeProvider.setViewMode('class'));
    vscode.commands.registerCommand('meowdoc.setView.flat', () => treeProvider.setViewMode('flat'));

    // Refresh tree on file save
    // Use a FileSystemWatcher to detect all changes (create, delete, change)
    // We strictly catch source files to avoid loops with the generated .meowdoc files
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,abap}');

    watcher.onDidCreate(() => treeProvider.refresh());
    watcher.onDidChange(() => treeProvider.refresh());
    watcher.onDidDelete(() => treeProvider.refresh());

    context.subscriptions.push(watcher);
}

export function deactivate() { }
