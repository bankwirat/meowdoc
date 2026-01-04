# Meowdoc Project Structure DSL
# Generated at 2026-01-04T17:12:22.219Z

File: out/analyzer.js
  Function: ownKeys (L19)
  Class: Analyzer (L43)
    Method: constructor (L44)
    Method: init (L48)
    Method: getLanguageForFile (L78)
    Method: getSymbols (L90)
      Function: traverse (L102)
    Method: getFunctionCalls (L241)
      Function: traverse (L253)

File: out/dumper.js
  Function: ownKeys (L19)
  Class: ViewStateDumper (L39)
    Method: save (L40)
    Method: generateDSL (L52)
    Method: serializeSymbols (L65)
    Method: generateMermaid (L80)
    Method: sanitizeId (L118)
    Method: findContainerSymbol (L123)

File: out/extension.js
  Function: ownKeys (L19)
  Function: activate (L40)
  Function: deactivate (L85)

File: out/treeProvider.js
  Function: ownKeys (L19)
  Class: FunctionTreeDataProvider (L42)
    Method: constructor (L43)
    Method: initializeAnalyzer (L53)
    Method: refresh (L63)
    Method: triggerDump (L67)
    Method: dumpView (L75)
      Function: processFile (L85)
      Function: traverse (L93)
    Method: setScope (L121)
    Method: setViewMode (L125)
    Method: getTreeItem (L130)
    Method: getChildren (L133)
    Method: folderContainsFunctions (L212)
    Method: getFolderContents (L242)
    Method: getSymbolsForFile (L281)
    Method: flattenSymbols (L290)
    Method: getAllFunctionsFlat (L300)
      Function: processFolder (L305)
    Method: shouldExclude (L346)
    Method: getAllClasses (L350)
      Function: processFolder (L352)
  Class: FunctionTreeItem (L390)
    Method: constructor (L391)

File: scripts/download-wasm.js

File: src/analyzer.ts
  Class: Analyzer (L23)
    Method: constructor (L28)
    Method: init (L30)
    Method: getLanguageForFile (L64)
    Method: getSymbols (L73)
      Function: traverse (L88)
    Method: getFunctionCalls (L226)
      Function: traverse (L241)

File: src/dumper.ts
  Class: ViewStateDumper (L11)
    Method: save (L13)
    Method: generateDSL (L30)
    Method: serializeSymbols (L47)
    Method: generateMermaid (L66)
    Method: sanitizeId (L112)
    Method: findContainerSymbol (L118)

File: src/extension.ts
  Function: activate (L4)
  Function: deactivate (L62)

File: src/treeProvider.ts
  Class: FunctionTreeDataProvider (L7)
    Method: constructor (L17)
    Method: initializeAnalyzer (L24)
    Method: refresh (L34)
    Method: triggerDump (L40)
    Method: dumpView (L49)
      Function: processFile (L63)
      Function: traverse (L71)
    Method: setScope (L99)
    Method: setViewMode (L105)
    Method: getTreeItem (L112)
    Method: getChildren (L116)
    Method: folderContainsFunctions (L226)
    Method: getFolderContents (L256)
    Method: getSymbolsForFile (L308)
    Method: flattenSymbols (L325)
    Method: getAllFunctionsFlat (L336)
      Function: processFolder (L343)
    Method: shouldExclude (L395)
    Method: getAllClasses (L400)
      Function: processFolder (L403)
  Class: FunctionTreeItem (L447)
    Method: constructor (L448)

File: test.abap

