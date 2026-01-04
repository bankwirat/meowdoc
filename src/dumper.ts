import * as fs from 'fs';
import * as path from 'path';
import { SymbolDef, FunctionCall } from './analyzer';

export interface ParsedFile {
    filePath: string;
    symbols: SymbolDef[];
    calls: FunctionCall[];
}

export class ViewStateDumper {

    public async save(workspaceFolder: string, files: ParsedFile[]) {
        const meowdocDir = path.join(workspaceFolder, '.meowdoc');

        if (!fs.existsSync(meowdocDir)) {
            fs.mkdirSync(meowdocDir, { recursive: true });
        }

        const dslContent = this.generateDSL(workspaceFolder, files);
        const mermaidContent = this.generateMermaid(workspaceFolder, files);

        const dslPath = path.join(meowdocDir, 'llm.dsl');
        const mermaidPath = path.join(meowdocDir, 'function.mmd');

        await fs.promises.writeFile(dslPath, dslContent, 'utf8');
        await fs.promises.writeFile(mermaidPath, mermaidContent, 'utf8');
    }

    private generateDSL(rootPath: string, files: ParsedFile[]): string {
        let output = "# Meowdoc Project Structure DSL\n";
        output += `# Generated at ${new Date().toISOString()}\n\n`;

        // Sort files for consistent output
        files.sort((a, b) => a.filePath.localeCompare(b.filePath));

        for (const file of files) {
            const relPath = path.relative(rootPath, file.filePath);
            output += `File: ${relPath}\n`;
            output += this.serializeSymbols(file.symbols, 1);
            output += "\n";
        }

        return output;
    }

    private serializeSymbols(symbols: SymbolDef[], depth: number): string {
        let output = "";
        const indent = "  ".repeat(depth);
        const sortedSymbols = [...symbols].sort((a, b) => a.startPosition.row - b.startPosition.row);

        for (const sym of sortedSymbols) {
            let kindStr = sym.kind === 'class' ? 'Class' :
                sym.kind === 'method' ? 'Method' :
                    sym.kind === 'function' ? 'Function' : 'Symbol';

            output += `${indent}${kindStr}: ${sym.name} (L${sym.startPosition.row + 1})\n`;

            if (sym.children && sym.children.length > 0) {
                output += this.serializeSymbols(sym.children, depth + 1);
            }
        }
        return output;
    }

    private generateMermaid(rootPath: string, files: ParsedFile[]): string {
        let output = "sequenceDiagram\n";
        output += "    autonumber\n";

        // We need to map calls to "who called them"
        // Iterate every file, find every call, determine which Symbol it is inside.

        let edges: string[] = [];

        for (const file of files) {
            for (const call of file.calls) {
                const caller = this.findContainerSymbol(file.symbols, call.startPosition.row);
                // Use a cleaner name for global scope
                const callerName = caller ? caller.name : `Global_${path.basename(file.filePath)}`;

                // sanitize
                const safeCaller = this.sanitizeId(callerName);
                const safeCallee = this.sanitizeId(call.name);

                // Truncate label if too long to keep diagram readable
                let label = call.name;
                if (label.length > 50) {
                    label = label.substring(0, 47) + "...";
                }

                // Avoid adding empty edges
                if (safeCaller && safeCallee) {
                    edges.push(`    ${safeCaller}->>${safeCallee}: ${label}()`);
                }
            }
        }

        if (edges.length === 0) {
            output += "    Note right of User: No function calls detected (or not parsed yet)\n";
        } else {
            // Limit edges to prevent massive diagrams
            if (edges.length > 100) {
                output += `    Note right of User: Truncated ${edges.length} calls to 100 for performance\n`;
                edges = edges.slice(0, 100);
            }
            output += edges.join("\n");
        }

        return output;
    }

    private sanitizeId(str: string): string {
        // Replace all non-alphanumeric/underscore characters with underscore
        // This handles spaces, colons, parentheses, etc.
        return str.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    private findContainerSymbol(symbols: SymbolDef[], line: number): SymbolDef | undefined {
        let bestMatch: SymbolDef | undefined = undefined;

        for (const sym of symbols) {
            if (line >= sym.startPosition.row && line <= sym.endPosition.row) {
                // This symbol contains the line. 
                // Check if one of its children is a tighter match.
                const childMatch = this.findContainerSymbol(sym.children, line);
                if (childMatch) {
                    return childMatch;
                }
                return sym;
            }
        }
        return bestMatch;
    }
}
