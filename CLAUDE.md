# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Project
```bash
# Run examples
node examples/usage-example.js
node examples/comment-example.js
node examples/advanced-example.js
```

### Testing
The project currently doesn't have automated tests configured. To add test capabilities:
```bash
npm install --save-dev jest
# Update package.json scripts section to include "test": "jest"
```

## Architecture Overview

CodeBridge is an AST-based code merging tool that processes JavaScript and HTML snippets by parsing them into Abstract Syntax Trees and intelligently merging them with original code.

### Core Components

**CodeBridge (code-bridge.js)**
- Main class handling both JavaScript and HTML processing
- Uses Babel for JavaScript AST manipulation (@babel/parser, @babel/traverse, @babel/generator)
- Uses parse5 for HTML parsing and serialization
- Supports comment-based command directives for method manipulation

### Key Architectural Patterns

**Comment Command System**
The tool uses special comment directives to control code transformation:
- `@access [private|public|protected]` - Modify method access level
- `@decorator [name]` - Add decorators to methods
- `@rename [newName]` - Rename methods
- `@delete` - Remove methods
- `@params [param1, param2, ...]` - Update method parameters

**AST Processing Flow**
1. Parse original code into AST
2. Parse snippet code into AST (with preprocessing for method-only snippets)
3. Extract comment commands from snippet
4. Merge AST nodes with command-based transformations
5. Generate final code from modified AST

### Method Processing Logic

The system handles method-only snippets by wrapping them in a temporary class structure, allowing for:
- Single method updates without full class context
- Preservation of original class structure
- Support for adding new methods to existing classes

### Error Handling

The processor includes detailed error reporting with:
- Line and column information for parsing errors
- Visual error indicators in console output
- Recovery strategies for malformed snippets

## Common Development Tasks

### Adding New Comment Commands
1. Update `extractCommands()` method in code-bridge.js
2. Add command handling logic in `processMethod()`
3. Update documentation with new command syntax

### Extending Language Support
Currently supports JavaScript and HTML. To add new languages:
1. Add appropriate parser dependency
2. Implement new `process[Language]()` method
3. Update `process()` method switch statement

### Debugging AST Transformations
- Use `console.log(JSON.stringify(ast, null, 2))` to inspect AST structure
- The `cloneDeep()` method helps prevent mutation issues
- Parser options include error recovery for better resilience

## Important Notes

- JavaScript parsing uses relaxed settings to handle various code styles
- The tool preserves comments and formatting where possible
- Method-only snippets are automatically wrapped for valid parsing
- All Babel plugins (jsx, typescript) are enabled by default for maximum compatibility

## Multi-Language Extension Support

CodeBridge can be extended to support additional languages. See `/docs/MULTI_LANGUAGE_EXTENSION.md` for:
- Python support using tree-sitter-python or LibCST
- Rust support using tree-sitter-rust or syn
- Integrated web page merging (HTML + CSS + JavaScript)
- Language-specific comment commands and AST manipulation strategies

### Recommended Approach
Use tree-sitter for universal parsing with consistent API across all languages, supplemented by language-specific libraries for precise format preservation.