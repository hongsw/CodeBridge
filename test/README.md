# CodeBridge 테스트 가이드

## 테스트 현황

### 현재 상태
- ❌ 자동화된 테스트 없음
- ❌ CI/CD 파이프라인 미구성
- ✅ 테스트 프레임워크 설계 완료
- ✅ LLM 호환성 테스트 계획 수립

### 필요한 테스트
1. **기본 기능 테스트** ⚠️
   - JavaScript 메서드 병합
   - HTML 처리
   - 주석 명령어 파싱

2. **LLM 호환성 테스트** ⚠️
   - Claude, GPT-4, Gemini 출력 형식
   - 다양한 주석 스타일
   - 부분 코드 vs 전체 코드

3. **언어별 테스트** 📋
   - Python (계획됨)
   - Rust (계획됨)
   - 통합 웹페이지 (계획됨)

4. **정적 분석 통합** 📋
   - ESLint 통합
   - 보안 검사
   - 성능 분석

## 테스트 설치 및 실행

### 1. 의존성 설치
```bash
npm install --save-dev jest @babel/core babel-jest @types/jest
```

### 2. 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 특정 테스트만 실행
npm run test:basic      # 기본 기능 테스트
npm run test:llm        # LLM 호환성 테스트

# 커버리지 확인
npm run test:coverage

# 감시 모드 (파일 변경 시 자동 실행)
npm run test:watch
```

## LLM별 사용 가이드

### Claude
```javascript
// 권장 형식
// @decorator cache
// @access private
method() { 
  return improved; 
}
```

### GPT-4
```javascript
// 지원 형식 (콜론 선택사항)
// @decorator: async
// @access: public
method() {
  return enhanced;
}
```

### Gemini
```javascript
/* 블록 주석도 지원 */
/* @decorator memoize */
/* @access protected */
method() {
  return optimized;
}
```

## 테스트 커버리지 목표

| 영역 | 현재 | 목표 |
|------|------|------|
| 구문 (Statements) | 0% | 90% |
| 분기 (Branches) | 0% | 85% |
| 함수 (Functions) | 0% | 90% |
| 라인 (Lines) | 0% | 90% |

## 우선순위

### 즉시 필요 🚨
1. Jest 설치 및 설정
2. 기본 기능 테스트 구현
3. CI/CD 파이프라인 활성화

### 중요 ⚠️
1. LLM 호환성 테스트 구현
2. 오류 처리 테스트
3. 성능 테스트

### 향후 계획 📋
1. 언어별 확장 테스트
2. 정적 분석 통합 테스트
3. E2E 통합 테스트

## 테스트 작성 가이드

### 기본 구조
```javascript
describe('기능 그룹', () => {
  test('특정 동작', () => {
    // Given - 준비
    const input = '...';
    
    // When - 실행
    const result = processor.process(input);
    
    // Then - 검증
    expect(result).toBe(expected);
  });
});
```

### LLM 출력 테스트
```javascript
test('LLM 출력 처리', () => {
  const llmOutput = simulateLLMOutput(code, 'claude');
  const extracted = extractCodeFromLLM(llmOutput);
  const result = processor.process(original, extracted, 'js');
  
  expect(result).toContain('expected');
});
```

## 기여 방법

1. 테스트 케이스 추가
2. 버그 발견 시 실패하는 테스트 먼저 작성
3. 테스트 통과하도록 코드 수정
4. PR 제출 시 테스트 결과 포함

## 문제 해결

### Jest 설치 오류
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 테스트 실행 오류
```bash
# Babel 설정 확인
npm install --save-dev @babel/preset-env
```

### 커버리지 리포트 생성 안 됨
```bash
# 커버리지 디렉토리 확인
mkdir -p coverage
npm run test:coverage
```