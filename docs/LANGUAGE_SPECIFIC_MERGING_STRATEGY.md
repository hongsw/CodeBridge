# 언어별 차이점을 고려한 코드 병합 전략

## 개요
각 프로그래밍 언어는 고유한 문법, 의미론, 런타임 특성을 가지고 있어 AST 기반 코드 병합 시 언어별 맞춤 전략이 필요합니다.

## 언어별 AST 구조 차이점

### JavaScript/TypeScript
```javascript
// 특징적 AST 요소
- 함수 표현식 vs 함수 선언문
- 프로토타입 기반 상속
- 동적 타입 시스템
- 호이스팅 (Hoisting)
- 클로저 (Closures)
- 비동기 패턴 (Promises, async/await)

// AST 노드 예시
{
  type: "FunctionDeclaration",
  id: { type: "Identifier", name: "foo" },
  params: [],
  body: { type: "BlockStatement", body: [] },
  async: false,
  generator: false
}
```

### Python
```python
# 특징적 AST 요소
- 들여쓰기 기반 블록 구조
- 데코레이터 문법
- 다중 상속
- 덕 타이핑 (Duck Typing)
- 컨텍스트 매니저 (with 문)
- 리스트 컴프리헨션

# AST 노드 예시 (Python AST)
FunctionDef(
    name='foo',
    args=arguments(args=[], defaults=[]),
    body=[Pass()],
    decorator_list=[],
    returns=None
)
```

### Rust
```rust
// 특징적 AST 요소
- 소유권 시스템 (Ownership)
- 라이프타임 주석
- 트레이트 (Traits)
- 매크로 시스템
- 패턴 매칭
- 제네릭과 타입 추론

// AST 노드 예시 (syn)
ItemFn {
    attrs: vec![],
    vis: Visibility::Public,
    sig: Signature {
        ident: Ident::new("foo"),
        generics: Generics::default(),
        // ...
    },
    block: Block { /* ... */ }
}
```

## 언어별 병합 전략

### 1. JavaScript/TypeScript 병합 전략

```javascript
class JavaScriptMergeStrategy {
  mergeFunction(original, snippet) {
    // 호이스팅 고려
    if (snippet.type === 'FunctionDeclaration') {
      // 함수 선언문은 스코프 최상단으로 호이스팅
      this.hoistDeclaration(snippet);
    }
    
    // 클로저 보존
    if (this.hasClosureReferences(snippet)) {
      this.preserveClosureContext(original, snippet);
    }
    
    // 비동기 특성 처리
    if (snippet.async !== original.async) {
      this.handleAsyncTransformation(original, snippet);
    }
  }
  
  // this 바인딩 보존
  preserveThisBinding(method) {
    if (method.type === 'ArrowFunctionExpression') {
      // 화살표 함수는 렉시컬 this 유지
      return method;
    }
    // 일반 함수는 바인딩 컨텍스트 확인 필요
    return this.wrapWithBindingContext(method);
  }
}
```

### 2. Python 병합 전략

```python
class PythonMergeStrategy:
    def merge_function(self, original_func, snippet_func):
        # 들여쓰기 레벨 조정
        indentation_level = self.detect_indentation(original_func)
        snippet_func = self.adjust_indentation(snippet_func, indentation_level)
        
        # 데코레이터 병합 (순서 중요)
        merged_decorators = self.merge_decorators(
            original_func.decorator_list,
            snippet_func.decorator_list
        )
        
        # 타입 힌트 병합
        if hasattr(snippet_func, 'returns'):
            original_func.returns = snippet_func.returns
        
        # 독스트링 처리
        if self.has_docstring(snippet_func):
            self.update_docstring(original_func, snippet_func)
        
        return original_func
    
    def handle_python_specifics(self, node):
        # 컨텍스트 매니저 변환
        if isinstance(node, ast.With):
            return self.transform_context_manager(node)
        
        # 제너레이터 표현식 최적화
        if isinstance(node, ast.GeneratorExp):
            return self.optimize_generator(node)
```

### 3. Rust 병합 전략

```rust
struct RustMergeStrategy;

impl RustMergeStrategy {
    fn merge_function(&self, original: &ItemFn, snippet: &ItemFn) -> Result<ItemFn> {
        let mut merged = original.clone();
        
        // 라이프타임 충돌 해결
        self.resolve_lifetime_conflicts(&mut merged, snippet)?;
        
        // 소유권 규칙 검증
        self.validate_ownership_rules(&merged)?;
        
        // 트레이트 바운드 병합
        if let Some(where_clause) = &snippet.sig.generics.where_clause {
            self.merge_where_clauses(&mut merged.sig.generics, where_clause);
        }
        
        // unsafe 블록 처리
        if self.contains_unsafe(&snippet.block) {
            self.wrap_in_unsafe_context(&mut merged.block);
        }
        
        Ok(merged)
    }
    
    fn handle_macro_expansion(&self, item: &TokenStream) -> Result<Vec<Item>> {
        // 매크로 확장 후 AST 재구성
        let expanded = self.expand_macros(item)?;
        syn::parse2(expanded)
    }
}
```

## 언어별 의미론적 차이 처리

### 타입 시스템 차이
```yaml
JavaScript:
  - 동적 타입
  - 암시적 타입 변환
  - undefined vs null
  
Python:
  - 동적 타입 with 타입 힌트
  - 덕 타이핑
  - None as 단일 null 값
  
Rust:
  - 정적 타입 with 타입 추론
  - Option<T> for nullable
  - Result<T, E> for errors
```

### 에러 처리 패턴
```javascript
// JavaScript: try-catch + Promise rejection
try {
  result = await operation();
} catch (error) {
  handleError(error);
}

// Python: try-except with 특정 예외
try:
    result = operation()
except SpecificError as e:
    handle_error(e)
finally:
    cleanup()

// Rust: Result<T, E> 패턴
match operation() {
    Ok(result) => process(result),
    Err(e) => handle_error(e),
}
```

### 메모리 관리
```yaml
JavaScript:
  - 가비지 컬렉션
  - 참조 카운팅 (WeakMap/WeakSet)
  
Python:
  - 참조 카운팅 + 순환 참조 감지
  - 컨텍스트 매니저로 리소스 관리
  
Rust:
  - 소유권 시스템
  - 명시적 라이프타임
  - RAII 패턴
```

## 통합 병합 프로세스

```javascript
class UniversalCodeMerger {
  constructor() {
    this.strategies = new Map([
      ['javascript', new JavaScriptMergeStrategy()],
      ['python', new PythonMergeStrategy()],
      ['rust', new RustMergeStrategy()],
    ]);
  }
  
  async merge(original, snippet, language) {
    // 1. 언어별 파서로 AST 생성
    const originalAst = await this.parse(original, language);
    const snippetAst = await this.parse(snippet, language);
    
    // 2. 언어별 전략 적용
    const strategy = this.strategies.get(language);
    const mergedAst = await strategy.merge(originalAst, snippetAst);
    
    // 3. 의미론적 검증
    await this.validateSemantics(mergedAst, language);
    
    // 4. 코드 생성 (포맷 보존)
    const code = await this.generate(mergedAst, language);
    
    // 5. 정적 분석 실행
    await this.runStaticAnalysis(code, language);
    
    return code;
  }
  
  validateSemantics(ast, language) {
    const validator = this.getValidator(language);
    
    // 타입 호환성 검사
    validator.checkTypeCompatibility(ast);
    
    // 변수 스코프 검증
    validator.validateScopes(ast);
    
    // 언어별 규칙 검증
    validator.enforceLanguageRules(ast);
  }
}
```

## 언어 간 상호 운용성 고려사항

### WebAssembly 브리지
```javascript
// JavaScript와 Rust 연동
const rustModule = await WebAssembly.instantiate(rustWasm);
const result = rustModule.exports.process_data(jsData);
```

### FFI (Foreign Function Interface)
```python
# Python에서 Rust 함수 호출
from ctypes import cdll
rust_lib = cdll.LoadLibrary('./target/release/librust_lib.so')
result = rust_lib.process_data(python_data)
```

### 공통 직렬화 포맷
```yaml
JSON:
  - 모든 언어에서 지원
  - 타입 정보 손실 가능
  
MessagePack:
  - 바이너리 직렬화
  - 더 나은 타입 보존
  
Protocol Buffers:
  - 스키마 기반
  - 강타입 보장
```

## 성능 최적화 전략

### 언어별 최적화
```javascript
// JavaScript: V8 최적화 힌트
function optimizedFunction(arr) {
  'use strict';
  // 단형성 유지
  const length = arr.length | 0;
  // ...
}

// Python: Cython 또는 타입 힌트 활용
def optimized_function(arr: List[int]) -> int:
    cdef int i, sum = 0
    for i in range(len(arr)):
        sum += arr[i]
    return sum

// Rust: 컴파일 타임 최적화
#[inline(always)]
fn optimized_function(arr: &[i32]) -> i32 {
    arr.iter().sum()
}
```

## 디버깅 및 트레이싱

### 통합 디버깅 전략
```yaml
Source Maps:
  - JavaScript/TypeScript 지원
  - 변환된 코드와 원본 매핑
  
Debug Symbols:
  - Rust: DWARF 형식
  - Python: .pyc 파일 보존
  
Tracing:
  - OpenTelemetry 통합
  - 언어별 계측 라이브러리
```