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
exports.ViewStateDumper = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ViewStateDumper {
    async save(workspaceFolder, files) {
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
    generateDSL(rootPath, files) {
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
    serializeSymbols(symbols, depth) {
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
    generateMermaid(rootPath, files) {
        let output = "sequenceDiagram\n";
        output += "    autonumber\n";
        // We need to map calls to "who called them"
        // Iterate every file, find every call, determine which Symbol it is inside.
        let edges = [];
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
        }
        else {
            // Limit edges to prevent massive diagrams
            if (edges.length > 100) {
                output += `    Note right of User: Truncated ${edges.length} calls to 100 for performance\n`;
                edges = edges.slice(0, 100);
            }
            output += edges.join("\n");
        }
        return output;
    }
    sanitizeId(str) {
        // Replace all non-alphanumeric/underscore characters with underscore
        // This handles spaces, colons, parentheses, etc.
        return str.replace(/[^a-zA-Z0-9_]/g, '_');
    }
    findContainerSymbol(symbols, line) {
        let bestMatch = undefined;
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
exports.ViewStateDumper = ViewStateDumper;
//# sourceMappingURL=dumper.js.map