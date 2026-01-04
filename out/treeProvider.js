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
exports.FunctionTreeItem = exports.FunctionTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const analyzer_1 = require("./analyzer");
const dumper_1 = require("./dumper");
class FunctionTreeDataProvider {
    constructor(context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentScope = undefined;
        this.viewMode = 'folder';
        this.extensionContext = context;
        this.analyzer = new analyzer_1.Analyzer();
        this.dumper = new dumper_1.ViewStateDumper();
        this.initializeAnalyzer();
    }
    async initializeAnalyzer() {
        const wasmDir = path.join(this.extensionContext.extensionPath, 'wasm');
        try {
            await this.analyzer.init(wasmDir);
            this.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Tree-sitter: ${error}`);
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
        this.triggerDump();
    }
    triggerDump() {
        if (this.dumpTimeout) {
            clearTimeout(this.dumpTimeout);
        }
        this.dumpTimeout = setTimeout(() => {
            this.dumpView();
        }, 1000); // Debounce for 1 second
    }
    async dumpView() {
        if (!vscode.workspace.workspaceFolders)
            return;
        // Decide root for dumping. If specific scope is set, dump that. Else dump all workspaces?
        // Ideally, we dump the context of the current view.
        // If multiple workspaces, we might need a better strategy, but usually user has 1.
        // We'll iterate all workspaces or the scoped folder.
        const rootPath = this.currentScope || vscode.workspace.workspaceFolders[0].uri.fsPath;
        // Collect all data
        const files = [];
        const processFile = async (filePath) => {
            try {
                const symbols = await this.analyzer.getSymbols(filePath);
                const calls = await this.analyzer.getFunctionCalls(filePath);
                files.push({ filePath, symbols, calls });
            }
            catch (e) { }
        };
        const traverse = async (dir) => {
            const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const dirent of dirents) {
                if (dirent.name === 'node_modules' || dirent.name.startsWith('.'))
                    continue;
                const fullPath = path.join(dir, dirent.name);
                if (dirent.isDirectory()) {
                    await traverse(fullPath);
                }
                else if (dirent.isFile() && /\.(ts|tsx|js|jsx|abap)$/.test(dirent.name)) {
                    await processFile(fullPath);
                }
            }
        };
        if (fs.existsSync(rootPath) && fs.lstatSync(rootPath).isDirectory()) {
            await traverse(rootPath);
        }
        else if (vscode.workspace.workspaceFolders) {
            // Traverse all roots if no scope or multiple
            for (const folder of vscode.workspace.workspaceFolders) {
                await traverse(folder.uri.fsPath);
            }
        }
        // Dump
        // We'll use the FIRST workspace folder as the place to store .meowdoc if multiple
        const dumpRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : rootPath;
        await this.dumper.save(dumpRoot, files);
    }
    setScope(scope) {
        this.currentScope = scope;
        this.refresh();
    }
    setViewMode(mode) {
        this.viewMode = mode;
        this.refresh();
        vscode.commands.executeCommand('setContext', 'meowdoc.viewMode', mode);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!vscode.workspace.workspaceFolders) {
            return [];
        }
        if (!element) {
            // Root Level: Scope Item
            const scopeLabel = this.currentScope ? `Scope: ${path.basename(this.currentScope)} ` : "Scope: All";
            const scopeItem = new FunctionTreeItem(scopeLabel, vscode.TreeItemCollapsibleState.None, 'scope', '', undefined);
            const viewModeLabel = `View Mode: ${this.viewMode.charAt(0).toUpperCase() + this.viewMode.slice(1)}`;
            const viewModeItem = new FunctionTreeItem(viewModeLabel, vscode.TreeItemCollapsibleState.None, 'viewMode', '', undefined);
            viewModeItem.command = {
                command: 'meowdoc.selectViewMode',
                title: 'Select View Mode'
            };
            scopeItem.command = {
                command: 'meowdoc.selectScope',
                title: 'Select Scope'
            };
            let contentItems = [];
            if (this.viewMode === 'flat') {
                if (this.currentScope) {
                    contentItems = await this.getAllFunctionsFlat(this.currentScope);
                }
                else {
                    // Flatten all workspace folders
                    const allItemsPromises = vscode.workspace.workspaceFolders.map(f => this.getAllFunctionsFlat(f.uri.fsPath));
                    const allItems = await Promise.all(allItemsPromises);
                    contentItems = allItems.flat();
                }
                // Sort flat items alphabetically
                contentItems.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
            }
            else if (this.viewMode === 'class') {
                // CLASS MODE: Flatten files, show Classes at root
                if (this.currentScope) {
                    contentItems = await this.getAllClasses(this.currentScope);
                }
                else {
                    const allItemsPromises = vscode.workspace.workspaceFolders.map(f => this.getAllClasses(f.uri.fsPath));
                    const allItems = await Promise.all(allItemsPromises);
                    contentItems = allItems.flat();
                }
                contentItems.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
            }
            else {
                // FOLDER MODE
                if (this.currentScope) {
                    // Scope is a specific folder
                    contentItems = await this.getFolderContents(this.currentScope);
                }
                else {
                    // Scope is All -> List workspace folders
                    const folderPromises = vscode.workspace.workspaceFolders.map(async (folder) => {
                        const hasFunctions = await this.folderContainsFunctions(folder.uri.fsPath);
                        if (hasFunctions) {
                            return new FunctionTreeItem(folder.name, vscode.TreeItemCollapsibleState.Expanded, 'folder', folder.uri.fsPath);
                        }
                        return null;
                    });
                    const folders = await Promise.all(folderPromises);
                    contentItems = folders.filter((item) => item !== null);
                }
            }
            return [scopeItem, viewModeItem, ...contentItems];
        }
        // Handle Folder Items
        if (element.type === 'folder') {
            return this.getFolderContents(element.filePath);
        }
        // Handle File Items
        if (element.type === 'file') {
            return this.getSymbolsForFile(element.filePath);
        }
        // Handle Symbol Items (for Class View hierarchy)
        if (element.type === 'symbol' && element.symbolDef && element.symbolDef.children) {
            return element.symbolDef.children.map(child => new FunctionTreeItem(child.name, vscode.TreeItemCollapsibleState.None, 'symbol', element.filePath, child));
        }
        return [];
    }
    async folderContainsFunctions(folderPath) {
        try {
            const dirents = await fs.promises.readdir(folderPath, { withFileTypes: true });
            for (const dirent of dirents) {
                if (this.shouldExclude(dirent.name))
                    continue;
                const fullPath = path.join(folderPath, dirent.name);
                if (dirent.isDirectory()) {
                    if (await this.folderContainsFunctions(fullPath)) {
                        return true;
                    }
                }
                else if (dirent.isFile() && (dirent.name.endsWith('.ts') || dirent.name.endsWith('.tsx') || dirent.name.endsWith('.js') || dirent.name.endsWith('.jsx') || dirent.name.endsWith('.abap'))) {
                    try {
                        const symbols = await this.analyzer.getSymbols(fullPath);
                        if (symbols.length > 0) {
                            return true;
                        }
                    }
                    catch (e) {
                        // ignore parsing errors
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error checking folder ${folderPath}: `, error);
        }
        return false;
    }
    async getFolderContents(folderPath) {
        try {
            const dirents = await fs.promises.readdir(folderPath, { withFileTypes: true });
            const items = [];
            for (const dirent of dirents) {
                if (this.shouldExclude(dirent.name))
                    continue;
                const fullPath = path.join(folderPath, dirent.name);
                if (dirent.isDirectory()) {
                    if (await this.folderContainsFunctions(fullPath)) {
                        items.push(new FunctionTreeItem(dirent.name, vscode.TreeItemCollapsibleState.Collapsed, 'folder', fullPath));
                    }
                }
                else if (dirent.isFile() && (dirent.name.endsWith('.ts') || dirent.name.endsWith('.tsx') || dirent.name.endsWith('.js') || dirent.name.endsWith('.jsx') || dirent.name.endsWith('.abap'))) {
                    try {
                        const symbols = await this.analyzer.getSymbols(fullPath);
                        if (symbols.length > 0) {
                            items.push(new FunctionTreeItem(dirent.name, vscode.TreeItemCollapsibleState.Collapsed, 'file', fullPath));
                        }
                    }
                    catch (e) {
                        // ignore parsing errors
                    }
                }
            }
            // Sort: Folders first, then files
            items.sort((a, b) => {
                if (a.type === b.type) {
                    return a.label.localeCompare(b.label);
                }
                return a.type === 'folder' ? -1 : 1;
            });
            return items;
        }
        catch (e) {
            console.error(`Error reading directory ${folderPath}: `, e);
            return [];
        }
    }
    async getSymbolsForFile(fileFsPath) {
        try {
            const symbols = await this.analyzer.getSymbols(fileFsPath);
            return this.flattenSymbols(symbols).map(sym => new FunctionTreeItem(sym.name, vscode.TreeItemCollapsibleState.None, 'symbol', fileFsPath, sym));
        }
        catch (e) {
            return [];
        }
    }
    flattenSymbols(symbols) {
        let flat = [];
        for (const sym of symbols) {
            flat.push(sym);
            if (sym.children) {
                flat = flat.concat(this.flattenSymbols(sym.children));
            }
        }
        return flat;
    }
    async getAllFunctionsFlat(folderPath) {
        const items = [];
        // Helper to find root for relative path: use workspace folder if possible
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(folderPath));
        const rootPath = workspaceFolder ? workspaceFolder.uri.fsPath : folderPath;
        const processFolder = async (currentPath) => {
            try {
                const dirents = await fs.promises.readdir(currentPath, { withFileTypes: true });
                for (const dirent of dirents) {
                    if (this.shouldExclude(dirent.name))
                        continue;
                    const fullPath = path.join(currentPath, dirent.name);
                    if (dirent.isDirectory()) {
                        await processFolder(fullPath);
                    }
                    else if (dirent.isFile() && (dirent.name.endsWith('.ts') || dirent.name.endsWith('.tsx') || dirent.name.endsWith('.js') || dirent.name.endsWith('.jsx') || dirent.name.endsWith('.abap'))) {
                        try {
                            const rootSymbols = await this.analyzer.getSymbols(fullPath);
                            const allSymbols = this.flattenSymbols(rootSymbols); // Reuse flatten helper
                            for (const sym of allSymbols) {
                                // Calculate dot-separated path relative to root
                                const relativePath = path.relative(rootPath, fullPath);
                                const parsedPath = path.parse(relativePath);
                                const dir = parsedPath.dir;
                                const name = parsedPath.name; // filename without extension
                                let dotPathParts = [];
                                if (dir) {
                                    dotPathParts.push(...dir.split(path.sep));
                                }
                                dotPathParts.push(name);
                                dotPathParts.push(sym.name);
                                const flatLabel = dotPathParts.join('.');
                                items.push(new FunctionTreeItem(flatLabel, vscode.TreeItemCollapsibleState.None, 'symbol', fullPath, sym));
                            }
                        }
                        catch (e) { }
                    }
                }
            }
            catch (e) {
                console.error(`Error processing folder ${currentPath} for flat view: `, e);
            }
        };
        await processFolder(folderPath);
        return items;
    }
    shouldExclude(name) {
        const excludes = ['node_modules', 'out', 'dist', 'build', '.git', '.DS_Store'];
        return excludes.includes(name) || name.startsWith('.');
    }
    async getAllClasses(folderPath) {
        const items = [];
        const processFolder = async (currentPath) => {
            try {
                const dirents = await fs.promises.readdir(currentPath, { withFileTypes: true });
                for (const dirent of dirents) {
                    if (this.shouldExclude(dirent.name))
                        continue;
                    const fullPath = path.join(currentPath, dirent.name);
                    if (dirent.isDirectory()) {
                        await processFolder(fullPath);
                    }
                    else if (dirent.isFile() && (dirent.name.endsWith('.ts') || dirent.name.endsWith('.tsx') || dirent.name.endsWith('.js') || dirent.name.endsWith('.jsx') || dirent.name.endsWith('.abap'))) {
                        try {
                            const rootSymbols = await this.analyzer.getSymbols(fullPath);
                            // Filter for Classes only
                            for (const sym of rootSymbols) {
                                if (sym.kind === 'class') {
                                    const classItem = new FunctionTreeItem(sym.name, vscode.TreeItemCollapsibleState.Expanded, // FORCE EXPAND
                                    'symbol', fullPath, sym);
                                    // Add relative path to description for context
                                    const relativePath = vscode.workspace.asRelativePath(fullPath);
                                    classItem.description = `${relativePath}`; // Override line number
                                    items.push(classItem);
                                }
                            }
                        }
                        catch (e) { }
                    }
                }
            }
            catch (e) {
                console.error(`Error processing folder ${currentPath} for class view: `, e);
            }
        };
        await processFolder(folderPath);
        return items;
    }
}
exports.FunctionTreeDataProvider = FunctionTreeDataProvider;
class FunctionTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, type, filePath, symbolDef) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.filePath = filePath;
        this.symbolDef = symbolDef;
        if (type !== 'scope' && type !== 'viewMode') {
            this.resourceUri = vscode.Uri.file(filePath);
        }
        if (type === 'symbol' && symbolDef) {
            if (symbolDef.kind === 'class') {
                this.iconPath = new vscode.ThemeIcon('symbol-class');
            }
            else if (symbolDef.kind === 'method') {
                this.iconPath = new vscode.ThemeIcon('symbol-method');
            }
            else {
                this.iconPath = new vscode.ThemeIcon('symbol-function');
            }
            this.description = `L${symbolDef.startPosition.row + 1} `;
            this.command = {
                command: 'vscode.open',
                title: 'Open Symbol',
                arguments: [
                    this.resourceUri,
                    {
                        selection: new vscode.Range(new vscode.Position(symbolDef.startPosition.row, symbolDef.startPosition.column), new vscode.Position(symbolDef.endPosition.row, symbolDef.endPosition.column))
                    }
                ]
            };
        }
        else if (type === 'file') {
            this.iconPath = vscode.ThemeIcon.File;
        }
        else if (type === 'folder') {
            this.iconPath = vscode.ThemeIcon.Folder;
        }
        else if (type === 'scope') {
            this.iconPath = new vscode.ThemeIcon('filter');
            this.contextValue = 'scope';
        }
        else if (type === 'viewMode') {
            this.iconPath = new vscode.ThemeIcon('eye');
            this.contextValue = 'viewMode';
        }
    }
}
exports.FunctionTreeItem = FunctionTreeItem;
//# sourceMappingURL=treeProvider.js.map