const parse5 = require('parse5');
const babel = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

class CodeBridge {
  constructor() {
    this.htmlParser = parse5;
    this.jsParser = babel;
  }

  /**
   * HTML 코드를 파싱하고 처리합니다.
   */
  processHTML(originalCode, snippetCode) {
    const originalAst = this.htmlParser.parse(originalCode);
    const snippetAst = this.htmlParser.parse(snippetCode);

    // HTML AST를 순회하면서 필요한 요소를 찾고 수정
    this.traverseHTML(originalAst, snippetAst);

    return this.htmlParser.serialize(snippetAst);
  }

  /**
   * HTML AST를 순회하면서 노드를 처리합니다.
   */
  traverseHTML(originalAst, snippetAst) {
    const traverse = (node) => {
      if (node.childNodes) {
        node.childNodes.forEach(child => traverse(child));
      }
    };

    traverse(originalAst);
    traverse(snippetAst);
  }

  /**
   * JavaScript 코드를 파싱하고 처리합니다.
   */
  processJS(originalCode, snippetCode) {
    try {
      const parserOptions = {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        strictMode: false,
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        errorRecovery: true,
        tokens: true
      };

      const originalAst = this.jsParser.parse(originalCode, parserOptions);

      // 스니펫이 메서드만 포함하는 경우를 처리
      const processedSnippet = this.preprocessMethodSnippet(snippetCode);
      
      const snippetAst = this.jsParser.parse(processedSnippet, parserOptions);

      // JavaScript AST 처리
      this.mergeJSNodes(originalAst, snippetAst);

      return generate(snippetAst, {
        retainLines: true,
        compact: false,
        comments: true,
        concise: false,
        quotes: 'single'
      }).code;
    } catch (error) {
      console.error('JavaScript 파싱 오류:', error.message);
      if (error.loc) {
        console.error(`오류 위치: 라인 ${error.loc.line}, 열 ${error.loc.column}`);
        const lines = snippetCode.split('\n');
        const errorLine = lines[error.loc.line - 1];
        console.error('문제의 코드:', errorLine);
        console.error(' '.repeat(error.loc.column) + '^');
      }
      throw error;
    }
  }

  /**
   * JavaScript AST 노드들을 병합합니다.
   */
  /**
   * 메서드만 포함된 스니펫을 전처리합니다.
   */
  preprocessMethodSnippet(snippetCode) {
    // 특별한 주석 명령어 처리
    const commands = this.extractCommands(snippetCode);
    
    // 메서드 정의만 있는지 확인
    const isMethodOnly = snippetCode.trim().match(/^[a-zA-Z0-9_]+\s*\([^)]*\)\s*{/);
    
    if (isMethodOnly) {
      // 메서드를 클래스 내부에 래핑
      let wrappedCode = snippetCode;
      
      // 접근 제어자 추가
      if (commands.access) {
        wrappedCode = `${commands.access} ${wrappedCode}`;
      }
      
      // 데코레이터 추가
      if (commands.decorators && commands.decorators.length > 0) {
        const decorators = commands.decorators.map(d => `@${d}`).join('\n');
        wrappedCode = `${decorators}\n${wrappedCode}`;
      }
      
      return `class TemporaryClass { ${wrappedCode} }`;
    }
    
    return snippetCode;
  }

  /**
   * 주석에서 특별 명령어를 추출합니다.
   */
  extractCommands(code) {
    const commands = {
      access: null,
      decorators: [],
      rename: null,
      delete: false,
      updateParams: null
    };

    const commandRegex = /\/\/\s*@([a-zA-Z]+)(?:\s+(.+))?/g;
    let match;

    while ((match = commandRegex.exec(code)) !== null) {
      const [, command, value] = match;
      
      switch (command.toLowerCase()) {
        case 'access':
          commands.access = value; // public, private, protected
          break;
        case 'decorator':
          commands.decorators.push(value);
          break;
        case 'rename':
          commands.rename = value;
          break;
        case 'delete':
          commands.delete = true;
          break;
        case 'params':
          commands.updateParams = value;
          break;
      }
    }

    return commands;
  }

  /**
   * 메서드 이름을 추출합니다.
   */
  extractMethodName(methodNode) {
    if (t.isIdentifier(methodNode.key)) {
      return methodNode.key.name;
    }
    if (t.isStringLiteral(methodNode.key)) {
      return methodNode.key.value;
    }
    return null;
  }

  mergeJSNodes(originalAst, snippetAst) {
    const originalNodes = new Map();
    const self = this;  // this 바인딩을 위해 저장

    // 원본 코드의 노드 수집
    traverse(originalAst, {
      ClassDeclaration(path) {
        originalNodes.set(path.node.id.name, path.node);
      },
      FunctionDeclaration(path) {
        originalNodes.set(path.node.id.name, path.node);
      }
    });

    // 스니펫 코드에 노드 병합
    traverse(snippetAst, {
      ClassDeclaration(path) {
        const originalNode = originalNodes.get(path.node.id.name);
        if (originalNode) {
          self.mergeClassMethods(path.node, originalNode);
        }
      }
    });
  }

  /**
   * 클래스 메서드를 병합합니다.
   */
  mergeClassMethods(snippetNode, originalNode) {
    const methodMap = new Map();
    const commands = new Map();
    
    // 원본 메서드 수집
    originalNode.body.body.forEach(method => {
      if (t.isClassMethod(method)) {
        const methodName = this.extractMethodName(method);
        if (methodName) {
          methodMap.set(methodName, this.cloneDeep(method));
        }
      }
    });

    // 스니펫의 메서드와 명령어 처리
    snippetNode.body.body.forEach(method => {
      if (t.isClassMethod(method)) {
        const methodName = this.extractMethodName(method);
        if (!methodName) return;

        // 주석에서 명령어 추출
        const methodCommands = this.extractMethodCommands(method);
        commands.set(methodName, methodCommands);

        if (methodCommands.delete) {
          // 메서드 삭제
          methodMap.delete(methodName);
        } else {
          // 메서드 수정 또는 추가
          const processedMethod = this.processMethod(
            methodMap.get(methodName) || method,
            method,
            methodCommands
          );
          
          if (methodCommands.rename) {
            // 메서드 이름 변경
            methodMap.delete(methodName);
            methodMap.set(methodCommands.rename, processedMethod);
          } else {
            methodMap.set(methodName, processedMethod);
          }
        }
      }
    });

    // 모든 메서드를 snippetNode에 적용
    snippetNode.body.body = Array.from(methodMap.values());
  }

  /**
   * 메서드의 주석에서 명령어를 추출합니다.
   */
  extractMethodCommands(method) {
    const commands = {
      access: null,
      decorators: [],
      rename: null,
      delete: false,
      updateParams: null
    };

    if (!method.leadingComments) return commands;

    method.leadingComments.forEach(comment => {
      if (comment.type === 'CommentLine') {
        const commentText = comment.value.trim();
        const commandMatch = commentText.match(/@([a-zA-Z]+)(?:\s+(.+))?/);
        
        if (commandMatch) {
          const [, command, value = ''] = commandMatch;
          switch (command.toLowerCase()) {
            case 'access':
              commands.access = value;
              break;
            case 'decorator':
              if (value) commands.decorators.push(value);
              break;
            case 'rename':
              if (value) commands.rename = value;
              break;
            case 'delete':
              commands.delete = true;
              break;
            case 'params':
              if (value) commands.updateParams = value;
              break;
          }
        }
      }
    });

    return commands;
  }

  /**
   * 메서드를 처리하여 수정된 버전을 반환합니다.
   */
  processMethod(originalMethod, newMethod, commands) {
    const processedMethod = this.cloneDeep(newMethod);

    // 접근 제어자 처리
    if (commands.access) {
      if (t.isClassMethod(processedMethod)) {
        switch (commands.access.toLowerCase()) {
          case 'private':
            processedMethod.key.name = `#${processedMethod.key.name}`;
            break;
          case 'public':
          case 'protected':
            processedMethod.accessibility = commands.access;
            break;
        }
      }
    }

    // 데코레이터 처리
    if (commands.decorators && commands.decorators.length > 0) {
      processedMethod.decorators = commands.decorators.map(decorator => {
        const decoratorName = decorator.trim();
        return t.decorator(t.identifier(decoratorName));
      });
    }

    // 매개변수 업데이트
    if (commands.updateParams) {
      const params = commands.updateParams.split(',')
        .map(param => param.trim())
        .filter(param => param.length > 0)
        .map(param => t.identifier(param));
      processedMethod.params = params;
    }

    // 메서드 본문 업데이트
    if (newMethod.body && t.isBlockStatement(newMethod.body)) {
      processedMethod.body = newMethod.body;
    }

    return processedMethod;
  }

  /**
   * AST 노드의 깊은 복사본을 생성합니다.
   */
  cloneDeep(node) {
    return JSON.parse(JSON.stringify(node));
  }

  /**
   * Script 태그 내의 JavaScript 코드를 처리합니다.
   */
  processScriptTags(html) {
    const ast = this.htmlParser.parse(html);
    const scripts = [];

    // Script 태그 찾기
    const findScripts = (node) => {
      if (node.tagName === 'script') {
        scripts.push(node);
      }
      if (node.childNodes) {
        node.childNodes.forEach(child => findScripts(child));
      }
    };

    findScripts(ast);

    // 각 Script 태그의 내용 처리
    scripts.forEach(script => {
      if (script.childNodes.length > 0) {
        const jsCode = script.childNodes[0].value;
        const processedCode = this.processJS(jsCode, jsCode);
        script.childNodes[0].value = processedCode;
      }
    });

    return this.htmlParser.serialize(ast);
  }

  /**
   * 파일 확장자에 따라 적절한 처리 방법을 선택합니다.
   */
  process(originalCode, snippetCode, fileType) {
    switch (fileType) {
      case 'html':
        return this.processHTML(originalCode, snippetCode);
      case 'js':
      case 'javascript':
        return this.processJS(originalCode, snippetCode);
      case 'css':
        return this.processCSS(originalCode, snippetCode);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * CSS 코드 처리
   */
  processCSS(originalCode, snippetCode) {
    console.log('🎨 CSS 코드 처리 시작');
    
    if (!snippetCode || snippetCode.trim() === '') {
      console.log('📝 빈 CSS 스니펫, 원본 반환');
      return originalCode;
    }

    try {
      // CSS는 단순 병합으로 처리 (덮어쓰기)
      // 향후 CSS 파서를 추가할 수 있음
      const processed = this.mergeCSS(originalCode, snippetCode);
      console.log('✅ CSS 처리 완료');
      return processed;
    } catch (error) {
      console.error('CSS 처리 오류:', error.message);
      // 오류 발생시 향상된 스니펫 반환
      return snippetCode;
    }
  }

  /**
   * CSS 병합 로직
   */
  mergeCSS(originalCSS, newCSS) {
    // 기본적으로 새로운 CSS로 대체
    // 실제 프로젝트에서는 더 정교한 병합 로직 필요
    
    if (!originalCSS || originalCSS.trim() === '') {
      return newCSS;
    }

    // 선택자 기반 병합 (간단한 구현)
    const originalSelectors = this.extractCSSSelectors(originalCSS);
    const newSelectors = this.extractCSSSelectors(newCSS);
    
    let merged = originalCSS;
    
    for (const [selector, rules] of Object.entries(newSelectors)) {
      if (originalSelectors[selector]) {
        // 기존 선택자 교체
        const selectorRegex = new RegExp(`${this.escapeRegex(selector)}\\s*\\{[^}]*\\}`, 'g');
        merged = merged.replace(selectorRegex, `${selector} {\n${rules}\n}`);
      } else {
        // 새 선택자 추가
        merged += `\n\n${selector} {\n${rules}\n}`;
      }
    }
    
    return merged;
  }

  /**
   * CSS 선택자 추출
   */
  extractCSSSelectors(css) {
    const selectors = {};
    const regex = /([^{}]+)\{([^}]*)\}/g;
    let match;
    
    while ((match = regex.exec(css)) !== null) {
      const selector = match[1].trim();
      const rules = match[2].trim();
      selectors[selector] = rules;
    }
    
    return selectors;
  }

  /**
   * 정규식 이스케이프
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = CodeBridge;