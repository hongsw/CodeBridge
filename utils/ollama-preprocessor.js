/**
 * Ollama 모델 출력을 CodeBridge 호환 형식으로 변환하는 전처리기
 */

class OllamaPreprocessor {
  constructor() {
    // Ollama 모델별 특성
    this.modelPatterns = {
      'deepseek-coder': {
        // DeepSeek은 친절한 설명을 많이 포함
        explanationPrefixes: [
          'Here is your updated',
          'Here is the modified',
          'Here\'s the improved',
          'This code',
          'The updated method',
          'I\'ve added',
          'I\'ve updated'
        ],
        codeIndicators: [
          '```javascript',
          '```js', 
          '```',
          'method',
          'function',
          'class'
        ]
      },
      'codellama': {
        explanationPrefixes: [
          'Here\'s the',
          'This is the',
          'The following'
        ],
        codeIndicators: [
          '```',
          'def ',
          'class ',
          'function'
        ]
      },
      'starcoder': {
        explanationPrefixes: [
          'Here is',
          'The code'
        ],
        codeIndicators: [
          '```',
          'function',
          'class',
          'const'
        ]
      }
    };
  }
  
  /**
   * Ollama 응답 전처리
   */
  preprocess(response, modelName = 'deepseek-coder') {
    let processed = response;
    
    // 1. 코드 블록 추출
    processed = this.extractCodeBlocks(processed);
    
    // 2. 설명 텍스트 제거
    processed = this.removeExplanations(processed, modelName);
    
    // 3. 메서드 추출
    processed = this.extractMethods(processed);
    
    // 4. 특수 문자 정리
    processed = this.cleanSpecialCharacters(processed);
    
    // 5. 들여쓰기 정규화
    processed = this.normalizeIndentation(processed);
    
    return processed;
  }
  
  /**
   * 코드 블록 추출
   */
  extractCodeBlocks(text) {
    // 다양한 코드 블록 패턴
    const patterns = [
      /```(?:javascript|js|jsx|typescript|ts)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g,
      /`([^`]+)`/g  // 인라인 코드
    ];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        // 가장 긴 매치를 선택 (가장 완전한 코드일 가능성)
        const longestMatch = matches.reduce((prev, current) => 
          current[1].length > prev[1].length ? current : prev
        );
        return longestMatch[1];
      }
    }
    
    return text;
  }
  
  /**
   * 설명 텍스트 제거
   */
  removeExplanations(text, modelName) {
    const modelKey = Object.keys(this.modelPatterns).find(key => 
      modelName.includes(key)
    ) || 'deepseek-coder';
    
    const patterns = this.modelPatterns[modelKey];
    let cleaned = text;
    
    // 설명 문장 제거
    for (const prefix of patterns.explanationPrefixes) {
      const regex = new RegExp(`^${prefix}.*?[:\\.]\n?`, 'gmi');
      cleaned = cleaned.replace(regex, '');
    }
    
    // 설명 단락 제거
    const lines = cleaned.split('\n');
    const codeLines = [];
    let inCodeSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 코드 시작 감지
      if (!inCodeSection) {
        // 메서드, 클래스, 함수로 시작하는 라인
        if (this.isCodeLine(trimmedLine)) {
          inCodeSection = true;
          codeLines.push(line);
        }
        // 주석 명령어
        else if (trimmedLine.startsWith('//') && trimmedLine.includes('@')) {
          codeLines.push(line);
        }
      } else {
        codeLines.push(line);
        
        // 코드 끝 감지 (빈 줄이 연속으로 나오거나 설명이 시작)
        if (trimmedLine === '' && 
            codeLines[codeLines.length - 2]?.trim() === '') {
          break;
        }
      }
    }
    
    return codeLines.join('\n');
  }
  
  /**
   * 코드 라인인지 확인
   */
  isCodeLine(line) {
    // JavaScript 코드 패턴
    const codePatterns = [
      /^(async\s+)?function\s+\w+/,
      /^\w+\s*\([^)]*\)\s*{/,  // 메서드
      /^class\s+\w+/,
      /^const\s+\w+\s*=/,
      /^let\s+\w+\s*=/,
      /^var\s+\w+\s*=/,
      /^if\s*\(/,
      /^for\s*\(/,
      /^while\s*\(/,
      /^try\s*{/,
      /^return\s/,
      /^throw\s/,
      /^\w+\.\w+/,  // 객체 메서드 호출
      /^\/\/\s*@\w+/,  // 주석 명령어
    ];
    
    return codePatterns.some(pattern => pattern.test(line));
  }
  
  /**
   * 메서드 추출
   */
  extractMethods(text) {
    const lines = text.split('\n');
    const methodLines = [];
    let braceCount = 0;
    let inMethod = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 주석 명령어는 항상 포함
      if (trimmedLine.startsWith('//') && trimmedLine.includes('@')) {
        methodLines.push(line);
        continue;
      }
      
      // 메서드 시작 감지
      if (!inMethod && this.isMethodDeclaration(trimmedLine)) {
        inMethod = true;
        methodLines.push(line);
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        continue;
      }
      
      if (inMethod) {
        methodLines.push(line);
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          break; // 메서드 끝
        }
      }
    }
    
    return methodLines.join('\n');
  }
  
  /**
   * 메서드 선언인지 확인
   */
  isMethodDeclaration(line) {
    return /^(async\s+)?\w+\s*\([^)]*\)\s*{/.test(line) ||
           /^(async\s+)?function\s+\w+/.test(line);
  }
  
  /**
   * 특수 문자 정리
   */
  cleanSpecialCharacters(text) {
    return text
      .replace(/[""]/g, '"')  // 스마트 따옴표
      .replace(/['']/g, "'")  // 스마트 아포스트로피
      .replace(/…/g, '...')   // 생략 부호
      .replace(/–/g, '-')     // en dash
      .replace(/—/g, '--')    // em dash
      .trim();
  }
  
  /**
   * 들여쓰기 정규화
   */
  normalizeIndentation(text) {
    const lines = text.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim());
    
    if (nonEmptyLines.length === 0) return text;
    
    // 최소 들여쓰기 찾기
    let minIndent = Infinity;
    for (const line of nonEmptyLines) {
      const match = line.match(/^(\s*)/);
      if (match) {
        minIndent = Math.min(minIndent, match[1].length);
      }
    }
    
    // 들여쓰기 조정
    const normalizedLines = lines.map(line => {
      if (line.trim() === '') return '';
      return line.substring(minIndent);
    });
    
    return normalizedLines.join('\n').trim();
  }
  
  /**
   * 코드 품질 검증
   */
  validateCode(code) {
    const issues = [];
    
    // 기본 구문 검증
    if (!code.trim()) {
      issues.push('Empty code');
      return { valid: false, issues };
    }
    
    // 균형 잡힌 괄호 확인
    const braces = (code.match(/{/g) || []).length - (code.match(/}/g) || []).length;
    if (braces !== 0) {
      issues.push(`Unbalanced braces: ${braces}`);
    }
    
    const parens = (code.match(/\(/g) || []).length - (code.match(/\)/g) || []).length;
    if (parens !== 0) {
      issues.push(`Unbalanced parentheses: ${parens}`);
    }
    
    // 기본 JavaScript 키워드 확인
    const hasJSKeywords = /\b(function|class|const|let|var|if|for|while|return)\b/.test(code);
    if (!hasJSKeywords) {
      issues.push('No JavaScript keywords found');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * 디버그 정보 출력
   */
  debug(originalResponse, processedCode) {
    console.log('\n🔍 전처리 디버그 정보:');
    console.log('원본 길이:', originalResponse.length);
    console.log('처리 후 길이:', processedCode.length);
    
    const validation = this.validateCode(processedCode);
    console.log('유효성:', validation.valid ? '✅' : '❌');
    
    if (!validation.valid) {
      console.log('문제점:', validation.issues.join(', '));
    }
    
    console.log('처리된 코드:');
    console.log('---');
    console.log(processedCode);
    console.log('---\n');
  }
}

// 간편 사용 함수
function preprocessOllamaResponse(response, modelName = 'deepseek-coder', debug = false) {
  const preprocessor = new OllamaPreprocessor();
  const processed = preprocessor.preprocess(response, modelName);
  
  if (debug) {
    preprocessor.debug(response, processed);
  }
  
  return processed;
}

module.exports = {
  OllamaPreprocessor,
  preprocessOllamaResponse
};