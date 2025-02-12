# CodeBridge

CodeBridge는 AST(Abstract Syntax Tree)를 활용하여 JavaScript와 HTML 코드의 스니펫을 자동으로 분석하고 병합하는 도구입니다.

## 주요 기능

### 코드 병합
- JavaScript 클래스 및 메서드 병합
- HTML 구조 병합
- 주석 기반 코드 수정 명령어
- AST 기반 코드 분석 및 변환

### 메서드 조작
- 메서드 추가/삭제/수정
- 메서드 이름 변경
- 매개변수 업데이트
- 접근 제어자 설정
- 데코레이터 관리

### 주석 처리
- JSDoc 주석 지원
- 인라인 주석 유지
- 주석 기반 명령어 처리
- 다양한 주석 스타일 지원

## 설치

```bash
npm install codebridge
```

## 필수 의존성

```bash
npm i @babel/parser @babel/traverse @babel/generator @babel/types parse5
npm i -D @babel/core
```

## 사용 방법

### 기본 사용

```javascript
const CodeProcessor = require('codebridge');
const processor = new CodeProcessor();

// 원본 코드와 스니펫 처리
const result = processor.process(originalCode, snippetCode, 'js');
```

### 주석 명령어

메서드 수정을 위한 주석 명령어:

```javascript
// @access private|public|protected
// @decorator decoratorName
// @rename newMethodName
// @delete
// @params param1, param2, param3
```

### 예시

```javascript
// 원본 코드
class Example {
    method1() { return 1; }
    method2() { return 2; }
}

// 스니펫 (메서드 수정)
// @access private
// @decorator log
method1() { return 10; }

// 처리 결과
class Example {
    @log
    private method1() { return 10; }
    method2() { return 2; }
}
```

## API 문서

### CodeProcessor

#### constructor()
새로운 CodeProcessor 인스턴스를 생성합니다.

#### process(originalCode, snippetCode, fileType)
- `originalCode`: 원본 소스 코드
- `snippetCode`: 병합할 스니펫 코드
- `fileType`: 파일 타입 ('js' 또는 'html')
- 반환값: 처리된 코드

#### processJS(originalCode, snippetCode)
JavaScript 코드를 처리합니다.

#### processHTML(originalCode, snippetCode)
HTML 코드를 처리합니다.

## 주의사항

1. 코드 병합 시 충돌이 발생할 수 있으므로 백업을 권장합니다.
2. 복잡한 코드 구조에서는 예상치 못한 결과가 발생할 수 있습니다.
3. TypeScript 데코레이터를 사용할 경우 tsconfig.json에서 데코레이터를 활성화해야 합니다.

## 라이선스

MIT

## 기여하기

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 작성자

Seungwoo Hong, Claude-3.5-sonnet

## 지원

이슈나 문의사항이 있으시면 GitHub Issues에 등록해 주세요.
