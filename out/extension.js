"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const treeProvider_1 = require("./treeProvider");
function activate(context) {
    console.log('Congratulations, your extension "meowdoc" is now active!');
    const treeProvider = new treeProvider_1.FunctionTreeDataProvider(context);
    vscode.window.registerTreeDataProvider('function-mapper-view', treeProvider);
    vscode.commands.registerCommand('meowdoc.selectScope', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return;
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
            { label: 'Folder', description: 'Group by folders', mode: 'folder' },
            { label: 'Class', description: 'Group by classes', mode: 'class' },
            { label: 'Flat', description: 'List all functions', mode: 'flat' }
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
function deactivate() { }
//# sourceMappingURL=extension.js.map