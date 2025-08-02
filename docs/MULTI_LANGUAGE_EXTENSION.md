# CodeBridge 다언어 확장 가이드

## 개요
CodeBridge를 Python, Rust, 그리고 통합 정적 웹페이지를 지원하도록 확장하는 방법입니다.

## 1. Python 지원 추가

### 필요한 의존성
```bash
npm install tree-sitter tree-sitter-python
# 또는 Python 네이티브 방식
pip install libcst
```

### Python 프로세서 구현 예시
```javascript
// python-processor.js
const Parser = require('tree-sitter');
const Python = require('tree-sitter-python');

class PythonProcessor {
  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Python);
  }

  processPython(originalCode, snippetCode) {
    const originalTree = this.parser.parse(originalCode);
    const snippetTree = this.parser.parse(snippetCode);
    
    // Python 특성을 고려한 병합 로직
    return this.mergePythonAST(originalTree, snippetTree);
  }
  
  extractPythonCommands(code) {
    const commands = {
      decorator: [],      // @decorator
      access: null,       // _private, __private
      docstring: null,    // """docstring"""
      type_hints: null,   // -> ReturnType
      async: false,       // async def
    };
    
    // Python 주석 패턴: # @command value
    const pythonCommentRegex = /#\s*@([a-zA-Z]+)(?:\s+(.+))?/g;
    // ... 명령어 추출 로직
    
    return commands;
  }
}
```

### Python 코드 병합 예시
```python
# 원본 코드
class Example:
    def method1(self):
        return 1
    
    def method2(self, x, y):
        return x + y

# 스니펫 (주석 명령어 포함)
# @decorator cache
# @async
def method1(self):
    """개선된 메서드"""
    return 10

# @rename calculate
# @type_hints int, int -> int
def method2(self, a, b):
    return a * b
```

## 2. Rust 지원 추가

### 필요한 의존성
```bash
npm install tree-sitter-rust
```

### Rust 프로세서 구현 예시
```javascript
// rust-processor.js
const Parser = require('tree-sitter');
const Rust = require('tree-sitter-rust');

class RustProcessor {
  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Rust);
  }

  processRust(originalCode, snippetCode) {
    const originalTree = this.parser.parse(originalCode);
    const snippetTree = this.parser.parse(snippetCode);
    
    return this.mergeRustAST(originalTree, snippetTree);
  }
  
  extractRustCommands(code) {
    const commands = {
      visibility: null,   // pub, pub(crate), etc.
      unsafe: false,      // unsafe fn
      async: false,       // async fn
      const: false,       // const fn
      generic: null,      // <T, U>
      lifetime: null,     // 'a, 'static
      attributes: [],     // #[derive(Debug)]
    };
    
    // Rust 주석 패턴: // @command 또는 /// @command
    const rustCommentRegex = /\/\/\/?\\s*@([a-zA-Z]+)(?:\\s+(.+))?/g;
    // ... 명령어 추출 로직
    
    return commands;
  }
}
```

### Rust 코드 병합 예시
```rust
// 원본 코드
struct Example {
    value: i32,
}

impl Example {
    fn method1(&self) -> i32 {
        self.value
    }
    
    fn method2(&mut self, x: i32) {
        self.value = x;
    }
}

// 스니펫 (주석 명령어 포함)
// @visibility pub
// @attributes #[inline]
fn method1(&self) -> i32 {
    self.value * 2
}

// @async
// @generic <T: Display>
fn new_method<T>(&self, item: T) {
    println!("{}", item);
}
```

## 3. 통합 웹페이지 지원 (HTML + CSS + JS)

### 통합 프로세서 구현
```javascript
// web-processor.js
class WebProcessor {
  constructor(codeBridge) {
    this.codeBridge = codeBridge;
    this.cssParser = require('css-tree');
  }

  processWebPage(originalHTML, snippetHTML) {
    const originalDoc = parse5.parse(originalHTML);
    const snippetDoc = parse5.parse(snippetHTML);
    
    // 1. HTML 구조 병합
    this.mergeHTML(originalDoc, snippetDoc);
    
    // 2. CSS 스타일 병합
    this.mergeStyles(originalDoc, snippetDoc);
    
    // 3. JavaScript 코드 병합
    this.mergeScripts(originalDoc, snippetDoc);
    
    return parse5.serialize(originalDoc);
  }
  
  mergeStyles(originalDoc, snippetDoc) {
    const originalStyles = this.extractStyles(originalDoc);
    const snippetStyles = this.extractStyles(snippetDoc);
    
    // CSS AST를 사용한 스타일 병합
    originalStyles.forEach((style, index) => {
      if (snippetStyles[index]) {
        const merged = this.mergeCSSRules(
          this.cssParser.parse(style.textContent),
          this.cssParser.parse(snippetStyles[index].textContent)
        );
        style.textContent = this.cssParser.generate(merged);
      }
    });
  }
  
  mergeCSSRules(originalAST, snippetAST) {
    // CSS 선택자 기반 병합
    // - 동일 선택자: 속성 덮어쓰기
    // - 새 선택자: 추가
    // - @media 쿼리: 중첩 병합
    // ... 구현 로직
  }
}
```

### 통합 웹페이지 병합 예시
```html
<!-- 원본 HTML -->
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { width: 100%; }
    .button { color: blue; }
  </style>
</head>
<body>
  <div class="container">
    <button class="button">Click</button>
  </div>
  <script>
    class App {
      init() { console.log('Original'); }
    }
  </script>
</body>
</html>

<!-- 스니펫 (부분 수정) -->
<!-- @merge-strategy selective -->
<style>
  /* @override */
  .button { 
    color: red; 
    padding: 10px;
  }
  
  /* @new */
  .button:hover { 
    background: #eee; 
  }
</style>

<script>
  // @replace
  init() { 
    console.log('Updated'); 
    this.setupEvents();
  }
  
  // @add
  setupEvents() {
    document.querySelector('.button').addEventListener('click', () => {
      console.log('Clicked!');
    });
  }
</script>
```

## 4. 확장된 CodeBridge 아키텍처

```javascript
// enhanced-code-bridge.js
class EnhancedCodeBridge extends CodeBridge {
  constructor() {
    super();
    this.processors = new Map([
      ['python', new PythonProcessor()],
      ['rust', new RustProcessor()],
      ['web', new WebProcessor(this)],
      ['css', new CSSProcessor()],
    ]);
  }
  
  process(originalCode, snippetCode, fileType) {
    // 기존 JavaScript/HTML 지원
    if (['js', 'html'].includes(fileType)) {
      return super.process(originalCode, snippetCode, fileType);
    }
    
    // 새로운 언어 지원
    const processor = this.processors.get(fileType);
    if (processor) {
      return processor.process(originalCode, snippetCode);
    }
    
    // 파일 확장자로 자동 감지
    const detectedType = this.detectFileType(originalCode);
    if (detectedType && this.processors.has(detectedType)) {
      return this.processors.get(detectedType).process(originalCode, snippetCode);
    }
    
    throw new Error(`Unsupported file type: ${fileType}`);
  }
  
  detectFileType(code) {
    // 언어별 패턴 감지 로직
    if (code.includes('def ') || code.includes('class ') && code.includes('self')) {
      return 'python';
    }
    if (code.includes('fn ') || code.includes('impl ') || code.includes('struct ')) {
      return 'rust';
    }
    if (code.includes('<!DOCTYPE') || code.includes('<html')) {
      return 'web';
    }
    // ... 추가 감지 로직
  }
}
```

## 5. 사용 예시

```javascript
const EnhancedCodeBridge = require('./enhanced-code-bridge');
const processor = new EnhancedCodeBridge();

// Python 코드 병합
const pythonResult = processor.process(
  originalPythonCode, 
  snippetPythonCode, 
  'python'
);

// Rust 코드 병합
const rustResult = processor.process(
  originalRustCode, 
  snippetRustCode, 
  'rust'
);

// 통합 웹페이지 병합
const webResult = processor.process(
  originalHTML, 
  snippetHTML, 
  'web'
);
```

## 6. 주석 명령어 확장 제안

### 언어별 주석 스타일
- **Python**: `# @command value`
- **Rust**: `// @command value` 또는 `/// @command value`
- **CSS**: `/* @command value */`
- **HTML**: `<!-- @command value -->`

### 공통 명령어
- `@merge-strategy`: `replace`, `append`, `prepend`, `selective`
- `@priority`: 병합 우선순위 (1-10)
- `@condition`: 조건부 병합
- `@preserve`: 원본 유지

### 언어별 특수 명령어
**Python**:
- `@type_hints`: 타입 힌트 추가/수정
- `@docstring`: 독스트링 추가/수정
- `@async`: 비동기 함수로 변환

**Rust**:
- `@lifetime`: 라이프타임 추가
- `@generic`: 제네릭 타입 추가
- `@unsafe`: unsafe 블록 추가

**CSS**:
- `@media`: 미디어 쿼리 래핑
- `@important`: !important 추가
- `@prefix`: 벤더 프리픽스 추가

## 7. 구현 로드맵

1. **Phase 1**: Tree-sitter 기반 구조 설정
2. **Phase 2**: Python 지원 구현
3. **Phase 3**: Rust 지원 구현
4. **Phase 4**: 통합 웹페이지 지원
5. **Phase 5**: 언어 자동 감지 및 최적화
6. **Phase 6**: 정적 분석 도구 통합
7. **Phase 7**: CI/CD 파이프라인 통합

## 8. 2024-2025 최신 도구 통합

### AST 기반 도구
- **ast-grep**: Rust로 작성된 고성능 AST 검색/린팅 도구
- **tree-sitter**: 증분 파싱으로 실시간 AST 업데이트 지원
- **CodeQL**: GitHub의 시맨틱 코드 분석 엔진

### 정적 분석 통합
- **JavaScript**: ESLint + TypeScript 컴파일러 + Semgrep
- **Python**: Pylint + mypy + Bandit
- **Rust**: Clippy + cargo-audit + miri
- **통합**: SonarQube 또는 CodeClimate

### 보안 강화
- 병합 전 악성 코드 패턴 검사
- 의존성 취약점 자동 검사
- SAST(Static Application Security Testing) 통합

## 관련 문서
- [언어별 병합 전략](./LANGUAGE_SPECIFIC_MERGING_STRATEGY.md)
- [정적 분석 통합](./STATIC_ANALYSIS_INTEGRATION.md)
- [통합 예제](../examples/integrated-analysis-example.js)