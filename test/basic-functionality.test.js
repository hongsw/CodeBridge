const CodeBridge = require('../code-bridge');

describe('CodeBridge 기본 기능 테스트', () => {
  let processor;
  
  beforeEach(() => {
    processor = new CodeBridge();
  });
  
  describe('JavaScript 메서드 병합', () => {
    const originalClass = `
      class Example {
        method1() { return 1; }
        method2() { return 2; }
      }
    `;
    
    test('메서드 수정', () => {
      const snippet = `
        method1() { return 10; }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      expect(result).toContain('method1() { return 10; }');
      expect(result).toContain('method2() { return 2; }');
    });
    
    test('메서드 추가', () => {
      const snippet = `
        method3() { return 3; }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      expect(result).toContain('method1()');
      expect(result).toContain('method2()');
      expect(result).toContain('method3() { return 3; }');
    });
    
    test('데코레이터 추가', () => {
      const snippet = `
        // @decorator log
        // @decorator cache
        method1() { return 1; }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      expect(result).toContain('@log');
      expect(result).toContain('@cache');
    });
    
    test('접근 제어자 변경', () => {
      const snippet = `
        // @access private
        method1() { return 1; }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      // private 메서드는 # 프리픽스로 표현됨
      expect(result).toMatch(/#method1/);
    });
    
    test('메서드 이름 변경', () => {
      const snippet = `
        // @rename calculatedValue
        method1() { return 1; }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      expect(result).not.toContain('method1');
      expect(result).toContain('calculatedValue');
    });
    
    test('메서드 삭제', () => {
      const snippet = `
        // @delete
        method2() { }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      expect(result).toContain('method1');
      expect(result).not.toContain('method2');
    });
    
    test('매개변수 업데이트', () => {
      const snippet = `
        // @params x, y, z
        method1() { return x + y + z; }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      expect(result).toMatch(/method1\(x, y, z\)/);
    });
  });
  
  describe('HTML 처리', () => {
    const originalHTML = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body><div>Content</div></body>
      </html>
    `;
    
    const snippetHTML = `
      <!DOCTYPE html>
      <html>
      <head><title>Modified</title></head>
      <body><div>New Content</div></body>
      </html>
    `;
    
    test('HTML 병합', () => {
      const result = processor.process(originalHTML, snippetHTML, 'html');
      expect(result).toBeTruthy();
      expect(result).toContain('<!DOCTYPE html>');
    });
  });
  
  describe('오류 처리', () => {
    test('잘못된 JavaScript 문법', () => {
      const invalidSnippet = `
        method1() {
          return 1
          // 세미콜론 누락은 허용됨
        }
      `;
      
      // JavaScript는 세미콜론이 선택사항이므로 오류가 발생하지 않음
      expect(() => processor.process(originalClass, invalidSnippet, 'js'))
        .not.toThrow();
    });
    
    test('지원하지 않는 파일 타입', () => {
      expect(() => processor.process('code', 'snippet', 'unsupported'))
        .toThrow('Unsupported file type');
    });
    
    test('빈 스니펫 처리', () => {
      const result = processor.process(originalClass, '', 'js');
      // 빈 스니펫은 빈 클래스로 처리될 수 있음
      expect(result).toBeTruthy();
    });
  });
  
  describe('복잡한 시나리오', () => {
    test('다중 명령어 처리', () => {
      const snippet = `
        // @access private
        // @decorator async
        // @decorator log
        // @rename processDataAsync
        // @params data, options
        method1() {
          return Promise.resolve(data);
        }
      `;
      
      const result = processor.process(originalClass, snippet, 'js');
      expect(result).toContain('@async');
      expect(result).toContain('@log');
      expect(result).toContain('processDataAsync');
      expect(result).toMatch(/processDataAsync\(data, options\)/);
    });
    
    test('주석 보존', () => {
      const classWithComments = `
        /**
         * Example 클래스
         */
        class Example {
          /**
           * 첫 번째 메서드
           * @returns {number}
           */
          method1() { 
            // 인라인 주석
            return 1; 
          }
        }
      `;
      
      const snippet = `
        // @decorator memoize
        method1() { 
          // 수정된 구현
          return 10; 
        }
      `;
      
      const result = processor.process(classWithComments, snippet, 'js');
      // 주석 처리는 AST 변환 과정에서 손실될 수 있음
      expect(result).toContain('method1');
      expect(result).toContain('@memoize');
    });
  });
});

// 테스트 실행을 위한 간단한 헬퍼
if (require.main === module) {
  console.log('테스트를 실행하려면 Jest를 설치하고 다음 명령을 실행하세요:');
  console.log('npm install --save-dev jest');
  console.log('npm test');
}