import Parser from 'web-tree-sitter';
import * as fs from 'fs';
import * as path from 'path';

export type SymbolKind = 'class' | 'method' | 'function' | 'interface';

export interface SymbolDef {
    name: string;
    kind: SymbolKind;
    startPosition: Parser.Point;
    endPosition: Parser.Point;
    file: string;
    children: SymbolDef[];
}

export interface FunctionCall {
    name: string;
    startPosition: Parser.Point;
    endPosition: Parser.Point;
    file: string;
}

export class Analyzer {
    private languages: Map<string, Parser.Language> = new Map();
    private parser: Parser | undefined;
    private isInitialized = false;

    constructor() { }

    public async init(wasmDir: string): Promise<void> {
        if (this.isInitialized) return;

        await Parser.init();
        this.parser = new Parser();

        const langs = [
            { ext: 'ts', file: 'tree-sitter-typescript.wasm' },
            { ext: 'tsx', file: 'tree-sitter-tsx.wasm' },
            { ext: 'js', file: 'tree-sitter-javascript.wasm' },  // Use JS or TS for JS? 
            { ext: 'abap', file: 'tree-sitter-abap.wasm' }
        ];

        for (const lang of langs) {
            try {
                const wasmPath = path.join(wasmDir, lang.file);
                if (fs.existsSync(wasmPath)) {
                    const language = await Parser.Language.load(wasmPath);
                    this.languages.set(lang.ext, language);
                }
            } catch (e) {
                console.error(`Failed to load language ${lang.ext}:`, e);
            }
        }

        // Default language (typescript)
        const defaultLang = this.languages.get('ts');
        if (defaultLang) {
            this.parser.setLanguage(defaultLang);
        }

        this.isInitialized = true;
    }

    private getLanguageForFile(filePath: string): Parser.Language | undefined {
        const ext = path.extname(filePath).slice(1).toLowerCase();
        if (ext === 'ts') return this.languages.get('ts');
        if (ext === 'tsx') return this.languages.get('tsx');
        if (ext === 'js' || ext === 'jsx') return this.languages.get('js') || this.languages.get('ts');
        if (ext === 'abap') return this.languages.get('abap');
        return undefined;
    }

    public async getSymbols(filePath: string): Promise<SymbolDef[]> {
        if (!this.parser || !this.isInitialized) {
            throw new Error("Analyzer not initialized. Call init() first.");
        }

        const lang = this.getLanguageForFile(filePath);
        if (!lang) {
            return [];
        }

        this.parser.setLanguage(lang);
        const sourceCode = fs.readFileSync(filePath, 'utf8');
        const tree = this.parser.parse(sourceCode);
        const isAbap = filePath.endsWith('.abap');

        const traverse = (node: Parser.SyntaxNode): SymbolDef[] => {
            const symbols: SymbolDef[] = [];

            // Iterate over children to find symbols in this scope
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (!child) continue;

                let symbol: SymbolDef | undefined;

                if (isAbap) {
                    if (child.type === 'form_definition') {
                        // Heuristic for FORM name
                        let name = "unnamed_form";
                        for (let j = 0; j < child.childCount; j++) {
                            const grandchild = child.child(j);
                            if (grandchild && grandchild.type === 'name') {
                                name = grandchild.text;
                                break;
                            }
                            if (j === 1 && grandchild) name = grandchild.text;
                        }
                        symbol = {
                            name: name,
                            kind: 'function',
                            startPosition: child.startPosition,
                            endPosition: child.endPosition,
                            file: filePath,
                            children: []
                        };
                    }
                } else {
                    // TS/JS/TSX
                    if (child.type === 'class_declaration') {
                        const nameNode = child.childForFieldName('name');
                        if (nameNode) {
                            symbol = {
                                name: nameNode.text,
                                kind: 'class',
                                startPosition: child.startPosition,
                                endPosition: child.endPosition,
                                file: filePath,
                                children: [] // Will be populated by recursive call on class body
                            };
                            // For classes, we want to scan the body for methods
                            const bodyNode = child.childForFieldName('body');
                            if (bodyNode) {
                                symbol.children = traverse(bodyNode);
                            }
                        }
                    } else if (child.type === 'function_declaration') {
                        const nameNode = child.childForFieldName('name');
                        if (nameNode) {
                            symbol = {
                                name: nameNode.text,
                                kind: 'function',
                                startPosition: child.startPosition,
                                endPosition: child.endPosition,
                                file: filePath,
                                children: []
                            };
                            const bodyNode = child.childForFieldName('body');
                            if (bodyNode) {
                                symbol.children = traverse(bodyNode);
                            }
                        }
                    } else if (child.type === 'method_definition') {
                        const nameNode = child.childForFieldName('name');
                        if (nameNode) {
                            symbol = {
                                name: nameNode.text,
                                kind: 'method',
                                startPosition: child.startPosition,
                                endPosition: child.endPosition,
                                file: filePath,
                                children: []
                            };
                            const bodyNode = child.childForFieldName('body');
                            if (bodyNode) {
                                symbol.children = traverse(bodyNode);
                            }
                        }

                    } else if (child.type === 'variable_declarator') {
                        const nameNode = child.childForFieldName('name');
                        const valueNode = child.childForFieldName('value');
                        if (nameNode && valueNode && (valueNode.type === 'arrow_function' || valueNode.type === 'function_expression')) {
                            symbol = {
                                name: nameNode.text,
                                kind: 'function',
                                startPosition: child.startPosition,
                                endPosition: child.endPosition,
                                file: filePath,
                                children: []
                            };
                            const bodyNode = valueNode.childForFieldName('body');
                            if (bodyNode) { // Arrow functions might have expression body
                                if (bodyNode.type === 'statement_block') {
                                    symbol.children = traverse(bodyNode);
                                } else {
                                    // Single expression body, unlikely to have declared functions inside but possible in theory? 
                                    // skipping for now for simplicity unless block
                                }
                            }
                        }
                    } else {
                        // Recursively search non-symbol nodes (like export statements, blocks not belonging to caught symbols yet)
                        // But wait, if we recursed into class_declaration body above, we don't want to double recurse if we are at root.
                        // The logic "Recursively search" is tricky.
                        // If we are at a Block, we scan its children.
                        // If we found a symbol, we scanned its body specifically to populate ITS children.
                        // If we did NOT find a symbol, we might still need to look inside (e.g. export statement, or plain block).

                        // Better approach might be:
                        // If it IS a symbol, crate it and recurse body.
                        // If it is NOT a symbol, recurse children and append THEIR symbols to CURRENT scope.
                    }
                }

                if (symbol) {
                    symbols.push(symbol);
                } else {
                    // If this node wasn't a symbol itself, maybe it contains symbols (e.g. export keyword, or clean block)
                    // Does child have children?
                    if (child.childCount > 0) {
                        // Be careful not to re-traverse class bodies if we already handled them.
                        // But we ONLY handled 'body' field of class/function.
                        // This 'else' path is for nodes that are NOT class/function/method.
                        symbols.push(...traverse(child));
                    }
                }
            }
            return symbols;
        };

        return traverse(tree.rootNode);
    }

    public async getFunctionCalls(filePath: string): Promise<FunctionCall[]> {
        if (!this.parser || !this.isInitialized) {
            throw new Error("Analyzer not initialized");
        }

        const lang = this.getLanguageForFile(filePath);
        if (!lang) return [];

        this.parser.setLanguage(lang);

        const sourceCode = fs.readFileSync(filePath, 'utf8');
        const tree = this.parser.parse(sourceCode);
        const calls: FunctionCall[] = [];
        const isAbap = filePath.endsWith('.abap');

        const traverse = (node: Parser.SyntaxNode) => {
            if (isAbap) {
                if (node.type === 'perform_statement') {
                    // Heuristic for PERFORM name
                    let name = "unknown_perform";
                    for (let i = 0; i < node.childCount; i++) {
                        const child = node.child(i);
                        // Usually 1st or 2nd child is the name
                        if (child && (child.type === 'name' || child.type === 'identifier')) { // Adjust based on grammar
                            name = child.text;
                            break;
                        }

                        if (i === 1 && child) name = child.text;
                    }

                    calls.push({
                        name: name,
                        startPosition: node.startPosition,
                        endPosition: node.endPosition,
                        file: filePath
                    });
                }
            } else {
                if (node.type === 'call_expression') {
                    const functionNode = node.childForFieldName('function');
                    if (functionNode) {
                        calls.push({
                            name: functionNode.text,
                            startPosition: node.startPosition,
                            endPosition: node.endPosition,
                            file: filePath
                        });
                    }
                }
            }

            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    traverse(child);
                }
            }
        };

        traverse(tree.rootNode);
        return calls;
    }
}
