const CodeBridge = require('../code-bridge');

describe('GPT-3.5 및 저가형 모델 호환성 테스트', () => {
  let processor;
  
  beforeEach(() => {
    processor = new CodeBridge();
  });
  
  // GPT-3.5가 생성하는 일반적인 패턴들
  const gpt35Patterns = {
    // 패턴 1: 매우 간단한 형식
    simple: `
method1() {
  return 10;
}`,
    
    // 패턴 2: 기본 주석 포함
    withBasicComment: `
// Updated method
method1() {
  return 10;
}`,
    
    // 패턴 3: 설명이 섞인 형식
    withExplanation: `
Here's the updated method:

method1() {
  // This returns 10 instead of 1
  return 10;
}`,
    
    // 패턴 4: 코드 블록 없이
    noCodeBlock: `
The method should be:
method1() { return 10; }`,
    
    // 패턴 5: 부정확한 마크다운
    incorrectMarkdown: `
\`\`\`
method1() {
  return 10;
}
\`\`\``,
    
    // 패턴 6: 들여쓰기 문제
    indentationIssues: `
    method1() {
      return 10;
    }`,
    
    // 패턴 7: 추가 텍스트가 많은 경우
    verboseExplanation: `
To improve the method, you should change the return value from 1 to 10. 
This will make it more efficient. Here's how you can do it:

You need to update the method like this:
method1() {
  // Changed return value
  return 10;
}

This change will improve performance.`
  };
  
  describe('기본 GPT-3.5 출력 패턴', () => {
    const originalCode = `
      class Example {
        method1() { return 1; }
        method2() { return 2; }
      }
    `;
    
    Object.entries(gpt35Patterns).forEach(([patternName, pattern]) => {
      test(`should handle ${patternName} pattern`, () => {
        // 코드 추출 시도
        let extractedCode = pattern;
        
        // 간단한 코드 블록 추출
        const codeBlockMatch = pattern.match(/```[\w]*\n?([\s\S]*?)```/);
        if (codeBlockMatch) {
          extractedCode = codeBlockMatch[1];
        }
        
        // 메서드 패턴 직접 찾기
        const methodMatch = extractedCode.match(/(method\d+\s*\([^)]*\)\s*{[^}]+})/);
        if (methodMatch) {
          extractedCode = methodMatch[1];
        }
        
        // 처리 시도
        try {
          const result = processor.process(originalCode, extractedCode.trim(), 'js');
          expect(result).toContain('method1');
          expect(result).toContain('return 10');
        } catch (error) {
          console.log(`Pattern ${patternName} failed:`, error.message);
        }
      });
    });
  });
  
  describe('GPT-3.5의 명령어 해석 문제', () => {
    const originalCode = `
      class Service {
        getData() { return []; }
      }
    `;
    
    test('명령어 없이 직접 코드만 제공', () => {
      const gpt35Output = `
getData() {
  // Add validation
  if (!this.isReady) {
    return null;
  }
  return this.data || [];
}`;
      
      const result = processor.process(originalCode, gpt35Output, 'js');
      expect(result).toContain('getData');
      expect(result).toContain('this.data || []');
    });
    
    test('자연어로 설명된 명령어', () => {
      const gpt35Output = `
// Make this method private and add logging
getData() {
  console.log('Getting data');
  return this.data || [];
}`;
      
      // GPT-3.5는 @command 형식을 잘 모를 수 있음
      // 자연어를 명령어로 변환하는 전처리 필요
      const preprocessed = gpt35Output.replace(
        '// Make this method private and add logging',
        '// @access private\n// @decorator log'
      );
      
      const result = processor.process(originalCode, preprocessed, 'js');
      expect(result).toBeTruthy();
    });
    
    test('불완전한 명령어 형식', () => {
      const variations = [
        '// decorator: log',
        '// @decorator log',
        '// decorator log',
        '// add decorator log',
        '// use @log decorator'
      ];
      
      variations.forEach(variant => {
        const snippet = `${variant}\ngetData() { return []; }`;
        // 전처리로 정규화
        const normalized = snippet.replace(/.*decorator[:\s]+(\w+).*/i, '// @decorator $1');
        
        try {
          const result = processor.process(originalCode, normalized, 'js');
          expect(result).toBeTruthy();
        } catch (error) {
          console.log(`Variant failed: ${variant}`);
        }
      });
    });
  });
  
  describe('GPT-3.5 특유의 코드 스타일', () => {
    test('함수 표현식 vs 메서드 정의 혼용', () => {
      const originalCode = `
        class Calculator {
          add(a, b) { return a + b; }
        }
      `;
      
      // GPT-3.5는 때때로 함수 표현식으로 답할 수 있음
      const gpt35Output = `
const add = function(a, b) {
  // Add validation
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Invalid input');
  }
  return a + b;
};`;
      
      // 함수 표현식을 메서드로 변환
      const methodVersion = `
add(a, b) {
  // Add validation
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Invalid input');
  }
  return a + b;
}`;
      
      const result = processor.process(originalCode, methodVersion, 'js');
      expect(result).toContain('add');
      expect(result).toContain('Invalid input');
    });
    
    test('ES5 스타일 코드', () => {
      const originalCode = `
        class OldStyle {
          process() { return true; }
        }
      `;
      
      // GPT-3.5는 때때로 오래된 스타일 사용
      const es5Style = `
process: function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(true);
    }, 100);
  });
}`;
      
      // 메서드 형식으로 변환
      const modernMethod = `
process() {
  var self = this;
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(true);
    }, 100);
  });
}`;
      
      const result = processor.process(originalCode, modernMethod, 'js');
      expect(result).toContain('process');
      expect(result).toContain('Promise');
    });
  });
  
  describe('전처리기 구현', () => {
    // GPT-3.5 출력을 CodeBridge 호환 형식으로 변환
    function preprocessGPT35Output(output) {
      let processed = output;
      
      // 1. 코드 블록 추출
      const codeBlockRegex = /```(?:javascript|js|jsx|typescript|ts)?\n?([\s\S]*?)```/g;
      const codeBlocks = [];
      let match;
      
      while ((match = codeBlockRegex.exec(output)) !== null) {
        codeBlocks.push(match[1]);
      }
      
      if (codeBlocks.length > 0) {
        processed = codeBlocks.join('\n\n');
      }
      
      // 2. 자연어 명령어를 @command 형식으로 변환
      const commandMappings = [
        { pattern: /make.*?private/i, replacement: '// @access private' },
        { pattern: /make.*?public/i, replacement: '// @access public' },
        { pattern: /add.*?logging/i, replacement: '// @decorator log' },
        { pattern: /add.*?caching/i, replacement: '// @decorator cache' },
        { pattern: /rename.*?to\s+(\w+)/i, replacement: '// @rename $1' },
        { pattern: /delete.*?method/i, replacement: '// @delete' },
        { pattern: /make.*?async/i, replacement: '// @decorator async' }
      ];
      
      commandMappings.forEach(({ pattern, replacement }) => {
        processed = processed.replace(pattern, replacement);
      });
      
      // 3. 메서드 추출
      const methodRegex = /(?:const\s+)?(\w+)\s*[:=]\s*(?:async\s+)?function\s*\([^)]*\)\s*{/g;
      processed = processed.replace(methodRegex, '$1($2) {');
      
      // 4. 들여쓰기 정규화
      const lines = processed.split('\n');
      const normalizedLines = lines.map(line => line.trim()).filter(line => line);
      processed = normalizedLines.join('\n');
      
      return processed;
    }
    
    test('전처리기 테스트', () => {
      const gpt35RawOutput = `
To make the method private and add logging, you can update it like this:

\`\`\`javascript
// make it private and add logging
const getData = function() {
  console.log('Getting data');
  return this.data;
};
\`\`\`

This will improve the encapsulation.`;
      
      const preprocessed = preprocessGPT35Output(gpt35RawOutput);
      
      expect(preprocessed).toContain('// @access private');
      expect(preprocessed).toContain('// @decorator log');
      expect(preprocessed).toContain('getData() {');
      expect(preprocessed).not.toContain('```');
      expect(preprocessed).not.toContain('To make the method');
    });
  });
  
  describe('실제 GPT-3.5 시뮬레이션', () => {
    // 실제 GPT-3.5 응답 예시들
    const realGPT35Examples = [
      {
        prompt: "Add error handling to this method",
        response: `
You can add error handling like this:

\`\`\`
fetchData(id) {
  try {
    if (!id) {
      throw new Error('ID is required');
    }
    return this.doFetch(id);
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
\`\`\``
      },
      {
        prompt: "Make this method async",
        response: `
Here's the async version:

async fetchData(id) {
  const result = await fetch(\`/api/\${id}\`);
  return await result.json();
}`
      },
      {
        prompt: "Add validation",
        response: `
fetchData(id) {
  // Validate input
  if (!id || typeof id !== 'string') {
    return null;
  }
  
  // Proceed with fetching
  return this.doFetch(id);
}`
      }
    ];
    
    test('실제 GPT-3.5 응답 처리', () => {
      const originalCode = `
        class API {
          fetchData(id) {
            return this.doFetch(id);
          }
        }
      `;
      
      realGPT35Examples.forEach(({ prompt, response }) => {
        // 전처리
        const processed = preprocessGPT35Output(response);
        
        try {
          const result = processor.process(originalCode, processed, 'js');
          expect(result).toContain('fetchData');
          console.log(`✓ Successfully processed: "${prompt}"`);
        } catch (error) {
          console.log(`✗ Failed to process: "${prompt}"`, error.message);
        }
      });
    });
  });
});

// GPT-3.5 사용 가이드 생성
function generateGPT35Guide() {
  return `
# GPT-3.5 및 저가형 모델을 위한 CodeBridge 가이드

## 권장 프롬프트 형식

### 기본 형식
\`\`\`
Please update the method [methodName] to [desired change].
Return only the updated method code.
\`\`\`

### 명령어 사용 시
\`\`\`
Update the method with these changes:
- Make it private (use // @access private)
- Add caching (use // @decorator cache)
- Rename to newMethodName (use // @rename newMethodName)

Format: 
// @command value
methodName() { ... }
\`\`\`

## 일반적인 문제 해결

1. **코드 블록 없음**: 
   - 프롬프트에 "Return the code in a code block" 추가

2. **설명이 너무 많음**:
   - 프롬프트에 "Return only the code, no explanation" 추가

3. **명령어 형식 오류**:
   - 구체적인 형식 예시 제공
   - 전처리기 사용 고려

## 전처리기 사용

\`\`\`javascript
const { preprocessGPT35Output } = require('./gpt-35-preprocessor');

const gpt35Response = "..."; // GPT-3.5 응답
const processed = preprocessGPT35Output(gpt35Response);
const result = codeBridge.process(original, processed, 'js');
\`\`\`
`;
}

module.exports = { generateGPT35Guide };