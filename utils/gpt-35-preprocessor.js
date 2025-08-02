/**
 * GPT-3.5 및 저가형 LLM 출력을 CodeBridge 호환 형식으로 변환하는 전처리기
 */

class GPT35Preprocessor {
  constructor() {
    // 자연어 명령어를 @command 형식으로 매핑
    this.commandMappings = [
      // 접근 제어
      { pattern: /make\s+(?:it\s+)?private/i, replacement: '// @access private' },
      { pattern: /make\s+(?:it\s+)?public/i, replacement: '// @access public' },
      { pattern: /make\s+(?:it\s+)?protected/i, replacement: '// @access protected' },
      { pattern: /change\s+to\s+private/i, replacement: '// @access private' },
      
      // 데코레이터
      { pattern: /add\s+(?:a\s+)?log(?:ging)?/i, replacement: '// @decorator log' },
      { pattern: /add\s+(?:a\s+)?cach(?:e|ing)/i, replacement: '// @decorator cache' },
      { pattern: /make\s+(?:it\s+)?async(?:hronous)?/i, replacement: '// @decorator async' },
      { pattern: /add\s+memoization/i, replacement: '// @decorator memoize' },
      { pattern: /add\s+validation/i, replacement: '// @decorator validate' },
      
      // 이름 변경
      { pattern: /rename\s+(?:to|as)\s+(\w+)/i, replacement: '// @rename $1' },
      { pattern: /change\s+name\s+to\s+(\w+)/i, replacement: '// @rename $1' },
      
      // 삭제
      { pattern: /delete\s+(?:this\s+)?method/i, replacement: '// @delete' },
      { pattern: /remove\s+(?:this\s+)?method/i, replacement: '// @delete' },
      
      // 매개변수
      { pattern: /change\s+parameters?\s+to\s+([^.]+)/i, replacement: '// @params $1' },
      { pattern: /update\s+parameters?\s+to\s+([^.]+)/i, replacement: '// @params $1' }
    ];
    
    // 코드 블록 변형 패턴
    this.codeBlockPatterns = [
      /```(?:javascript|js|jsx|typescript|ts)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g,
      /`([^`]+)`/g  // 인라인 코드
    ];
    
    // 메서드 패턴
    this.methodPatterns = [
      // ES6 클래스 메서드
      /(\w+)\s*\([^)]*\)\s*{[^}]+}/,
      // 함수 표현식
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\([^)]*\)\s*{[^}]+}/,
      // 화살표 함수
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*{[^}]+}/,
      // 객체 메서드
      /(\w+)\s*:\s*(?:async\s+)?function\s*\([^)]*\)\s*{[^}]+}/
    ];
  }
  
  /**
   * GPT-3.5 출력을 전처리
   */
  preprocess(output) {
    let processed = output;
    
    // 1단계: 코드 블록 추출
    processed = this.extractCodeBlocks(processed);
    
    // 2단계: 자연어 명령어 변환
    processed = this.convertNaturalLanguageCommands(processed);
    
    // 3단계: 메서드 형식 정규화
    processed = this.normalizeMethodFormat(processed);
    
    // 4단계: 들여쓰기 정리
    processed = this.normalizeIndentation(processed);
    
    // 5단계: 불필요한 텍스트 제거
    processed = this.removeExplanations(processed);
    
    return processed;
  }
  
  /**
   * 코드 블록 추출
   */
  extractCodeBlocks(text) {
    let extractedCode = '';
    
    for (const pattern of this.codeBlockPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extractedCode = matches.map(match => match[1]).join('\n\n');
        if (extractedCode.trim()) {
          return extractedCode;
        }
      }
    }
    
    // 코드 블록이 없으면 전체 텍스트에서 메서드 찾기
    return this.extractMethodsFromText(text);
  }
  
  /**
   * 텍스트에서 메서드 추출
   */
  extractMethodsFromText(text) {
    const lines = text.split('\n');
    const codeLines = [];
    let inMethod = false;
    let braceCount = 0;
    
    for (const line of lines) {
      // 메서드 시작 감지
      if (!inMethod) {
        for (const pattern of this.methodPatterns) {
          if (pattern.test(line)) {
            inMethod = true;
            codeLines.push(line);
            braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            break;
          }
        }
      } else {
        // 메서드 내용 수집
        codeLines.push(line);
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          inMethod = false;
        }
      }
    }
    
    return codeLines.join('\n');
  }
  
  /**
   * 자연어 명령어를 @command 형식으로 변환
   */
  convertNaturalLanguageCommands(text) {
    let converted = text;
    
    // 각 줄을 검사하여 자연어 명령어 변환
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      // 주석 라인인 경우
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        for (const { pattern, replacement } of this.commandMappings) {
          if (pattern.test(line)) {
            return line.replace(pattern, replacement);
          }
        }
      }
      return line;
    });
    
    converted = processedLines.join('\n');
    
    // 텍스트 앞부분의 자연어 명령어도 변환
    for (const { pattern, replacement } of this.commandMappings) {
      converted = converted.replace(pattern, replacement);
    }
    
    return converted;
  }
  
  /**
   * 메서드 형식 정규화
   */
  normalizeMethodFormat(text) {
    let normalized = text;
    
    // 함수 표현식을 메서드 형식으로 변환
    normalized = normalized.replace(
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)\s*{/g,
      '$1($2) {'
    );
    
    // 화살표 함수를 메서드 형식으로 변환
    normalized = normalized.replace(
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>\s*{/g,
      'async $1($2) {'
    );
    
    // 객체 메서드 형식 변환
    normalized = normalized.replace(
      /(\w+)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)\s*{/g,
      '$1($2) {'
    );
    
    return normalized;
  }
  
  /**
   * 들여쓰기 정규화
   */
  normalizeIndentation(text) {
    const lines = text.split('\n');
    const normalizedLines = [];
    let minIndent = Infinity;
    
    // 최소 들여쓰기 찾기
    for (const line of lines) {
      if (line.trim()) {
        const indent = line.match(/^(\s*)/)[1].length;
        minIndent = Math.min(minIndent, indent);
      }
    }
    
    // 들여쓰기 조정
    for (const line of lines) {
      if (line.trim()) {
        normalizedLines.push(line.substring(minIndent));
      } else {
        normalizedLines.push('');
      }
    }
    
    return normalizedLines.join('\n').trim();
  }
  
  /**
   * 설명 텍스트 제거
   */
  removeExplanations(text) {
    const lines = text.split('\n');
    const codeLines = [];
    let inCode = false;
    
    for (const line of lines) {
      // 코드 시작 감지
      if (!inCode && (
        line.includes('{') || 
        line.match(/^\/\/\s*@/) ||
        this.methodPatterns.some(p => p.test(line))
      )) {
        inCode = true;
      }
      
      if (inCode) {
        codeLines.push(line);
      }
      
      // 코드 끝 감지 (빈 줄이 2개 이상)
      if (inCode && line.trim() === '' && 
          codeLines[codeLines.length - 2]?.trim() === '') {
        break;
      }
    }
    
    return codeLines.join('\n').trim();
  }
  
  /**
   * 특정 LLM 스타일에 맞춘 전처리
   */
  preprocessForModel(output, model = 'gpt-3.5') {
    const modelSpecificProcessing = {
      'gpt-3.5': (text) => {
        // GPT-3.5는 종종 "Here's" 또는 "You can" 으로 시작
        text = text.replace(/^(?:Here's|You can|Try this:).*?\n/gm, '');
        return text;
      },
      'gpt-3.5-turbo': (text) => {
        // Turbo 모델은 더 간결하지만 때때로 마크다운 형식 오류
        text = text.replace(/^```$\n/gm, '```javascript\n');
        return text;
      },
      'text-davinci': (text) => {
        // 레거시 모델은 더 장황함
        text = text.replace(/^(?:To|In order to).*?:\s*\n/gm, '');
        return text;
      }
    };
    
    if (modelSpecificProcessing[model]) {
      output = modelSpecificProcessing[model](output);
    }
    
    return this.preprocess(output);
  }
}

// 간편 사용을 위한 함수 export
function preprocessGPT35Output(output, model = 'gpt-3.5') {
  const preprocessor = new GPT35Preprocessor();
  return preprocessor.preprocessForModel(output, model);
}

module.exports = {
  GPT35Preprocessor,
  preprocessGPT35Output
};