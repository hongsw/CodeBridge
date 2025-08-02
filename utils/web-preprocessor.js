/**
 * 웹 기술 전용 전처리기 (HTML/CSS/JS)
 * Ollama 모델의 웹 기술 출력을 CodeBridge 호환 형식으로 변환
 */

class WebPreprocessor {
  constructor() {
    // 웹 기술별 패턴 정의
    this.webPatterns = {
      html: {
        codeBlocks: [
          /```(?:html|web|xml)?\n?([\s\S]*?)```/g,
          /<[^>]+>[^<]*<\/[^>]+>/g,  // HTML 태그 패턴
          /```\n?([\s\S]*?)```/g
        ],
        cleanupPatterns: [
          /You can improve.*?as follows?:?\s*/gi,
          /Here'?s?.*?improved.*?:\s*/gi,
          /This.*?HTML.*?code.*?:\s*/gi,
          /The.*?following.*?:\s*/gi
        ],
        validation: {
          hasOpeningTag: /<[a-zA-Z][^>]*>/,
          hasClosingTag: /<\/[a-zA-Z][^>]*>/,
          hasAttributes: /\s+[a-zA-Z-]+\s*=\s*["'][^"']*["']/
        }
      },
      css: {
        codeBlocks: [
          /```(?:css|scss|sass)?\n?([\s\S]*?)```/g,
          /\.[a-zA-Z-_][^{]*\{[^}]*\}/g,  // CSS 클래스 선택자
          /#[a-zA-Z-_][^{]*\{[^}]*\}/g,   // CSS ID 선택자
          /[a-zA-Z][^{]*\{[^}]*\}/g,      // CSS 일반 선택자
          /```\n?([\s\S]*?)```/g
        ],
        cleanupPatterns: [
          /You can use.*?to make.*?responsive.*?\.\s*/gi,
          /Here'?s?.*?how.*?modify.*?CSS.*?:\s*/gi,
          /This will make.*?\.\s*/gi,
          /Remember,.*?to work properly.*?\.\s*/gi,
          /In the provided code.*?\.\s*/gi
        ],
        validation: {
          hasSelector: /[.#a-zA-Z][^{]*\{/,
          hasProperty: /[a-zA-Z-]+\s*:\s*[^;]+;/,
          hasFlexbox: /display\s*:\s*flex/i,
          hasGrid: /display\s*:\s*grid/i,
          hasResponsive: /@media.*?\{/i
        }
      },
      javascript: {
        codeBlocks: [
          /```(?:javascript|js|jsx)?\n?([\s\S]*?)```/g,
          /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
          /const\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=[\s\S]*?;/g,
          /```\n?([\s\S]*?)```/g
        ],
        cleanupPatterns: [
          /You can.*?JavaScript.*?as follows?:?\s*/gi,
          /Here'?s?.*?JavaScript.*?code.*?:\s*/gi,
          /This.*?script.*?:\s*/gi
        ],
        validation: {
          hasFunction: /function\s+[a-zA-Z_$]/,
          hasVariable: /(?:const|let|var)\s+[a-zA-Z_$]/,
          hasArrowFunction: /=>\s*[{(]/
        }
      }
    };
    
    // 웹 기술 통합 패턴
    this.integratedPatterns = {
      // HTML with inline CSS
      htmlWithCSS: /<style[^>]*>[\s\S]*?<\/style>/gi,
      // HTML with inline JS
      htmlWithJS: /<script[^>]*>[\s\S]*?<\/script>/gi,
      // CSS with JS variables
      cssWithJS: /var\(--[^)]+\)|calc\([^)]+\)/gi
    };
  }

  /**
   * 메인 전처리 함수
   */
  preprocess(response, webType = 'auto', modelName = 'deepseek-coder') {
    console.log(`🔧 웹 전처리기 시작: ${webType} 타입, 모델: ${modelName}`);
    
    // 1. 웹 타입 자동 감지
    if (webType === 'auto') {
      webType = this.detectWebType(response);
    }
    
    // 2. 타입별 전처리
    let processed = this.processWebType(response, webType);
    
    // 3. 통합 정리
    processed = this.finalCleanup(processed, webType);
    
    console.log(`✅ 웹 전처리 완료: ${processed.length} 문자 추출`);
    return processed;
  }

  /**
   * 웹 기술 타입 자동 감지
   */
  detectWebType(text) {
    const htmlScore = this.scoreWebType(text, 'html');
    const cssScore = this.scoreWebType(text, 'css');
    const jsScore = this.scoreWebType(text, 'javascript');
    
    console.log(`📊 웹 타입 점수: HTML(${htmlScore}), CSS(${cssScore}), JS(${jsScore})`);
    
    if (htmlScore >= cssScore && htmlScore >= jsScore) return 'html';
    if (cssScore >= jsScore) return 'css';
    return 'javascript';
  }

  /**
   * 웹 타입별 점수 계산
   */
  scoreWebType(text, type) {
    const patterns = this.webPatterns[type];
    if (!patterns) return 0;
    
    let score = 0;
    
    // 코드 블록 패턴 매칭
    for (const pattern of patterns.codeBlocks) {
      const matches = text.match(pattern);
      if (matches) score += matches.length * 10;
    }
    
    // 검증 패턴 매칭
    for (const [key, pattern] of Object.entries(patterns.validation)) {
      if (pattern.test(text)) score += 20;
    }
    
    return score;
  }

  /**
   * 웹 타입별 처리
   */
  processWebType(text, webType) {
    console.log(`🎯 ${webType} 타입 처리 시작`);
    
    const patterns = this.webPatterns[webType];
    if (!patterns) {
      console.warn(`⚠️ 지원하지 않는 웹 타입: ${webType}`);
      return text;
    }
    
    // 1. 코드 블록 추출
    let extracted = this.extractWebCodeBlocks(text, patterns.codeBlocks);
    
    // 2. 설명 텍스트 제거
    extracted = this.removeWebExplanations(extracted, patterns.cleanupPatterns);
    
    // 3. 웹 타입별 특수 처리
    extracted = this.applyWebTypeSpecificProcessing(extracted, webType);
    
    return extracted;
  }

  /**
   * 웹 코드 블록 추출
   */
  extractWebCodeBlocks(text, patterns) {
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        // 가장 긴 매치 선택 (가장 완전한 코드)
        const longestMatch = matches.reduce((prev, current) => {
          const prevContent = prev[1] || prev[0] || '';
          const currentContent = current[1] || current[0] || '';
          return currentContent.length > prevContent.length ? current : prev;
        });
        
        const extracted = longestMatch[1] || longestMatch[0] || '';
        console.log(`✂️ 코드 블록 추출 성공: ${extracted.length} 문자`);
        return extracted;
      }
    }
    
    console.log(`❌ 코드 블록 추출 실패, 원본 반환`);
    return text;
  }

  /**
   * 웹 기술 설명 텍스트 제거
   */
  removeWebExplanations(text, cleanupPatterns) {
    let cleaned = text;
    
    for (const pattern of cleanupPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // 추가 일반 정리
    cleaned = cleaned.replace(/^[\s\n]*/, '');  // 앞쪽 공백 제거
    cleaned = cleaned.replace(/[\s\n]*$/, '');  // 뒤쪽 공백 제거
    
    return cleaned;
  }

  /**
   * 웹 타입별 특수 처리
   */
  applyWebTypeSpecificProcessing(code, webType) {
    switch (webType) {
      case 'html':
        return this.processHTML(code);
      case 'css':
        return this.processCSS(code);
      case 'javascript':
        return this.processJS(code);
      default:
        return code;
    }
  }

  /**
   * HTML 특수 처리
   */
  processHTML(code) {
    // HTML 태그 정규화
    let processed = code;
    
    // 1. 불완전한 태그 정리
    processed = processed.replace(/<<｜begin▁of▁sentence｜>[^>]*/, '');
    
    // 2. 속성 정규화
    processed = processed.replace(/aria-required="true"/g, 'aria-required="true"');
    
    // 3. 잘못된 인코딩 정리
    processed = processed.replace(/▁/g, ' ');
    
    return processed.trim();
  }

  /**
   * CSS 특수 처리
   */
  processCSS(code) {
    let processed = code;
    
    // 1. CSS 블록 시작 표시 제거
    processed = processed.replace(/^web\s*\n?/, '');
    
    // 2. calc() 함수 정규화
    processed = processed.replace(/calc\(\s*([^)]+)\s*\)/g, 'calc($1)');
    
    // 3. 주석 정리
    processed = processed.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '');
    
    return processed.trim();
  }

  /**
   * JavaScript 특수 처리
   */
  processJS(code) {
    let processed = code;
    
    // 1. 함수 정의 정규화
    processed = processed.replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, 'function $1(');
    
    // 2. 변수 선언 정규화
    processed = processed.replace(/(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g, '$1 $2 =');
    
    return processed.trim();
  }

  /**
   * 최종 정리
   */
  finalCleanup(code, webType) {
    let cleaned = code;
    
    // 1. 빈 줄 정리
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 2. 들여쓰기 정규화
    cleaned = this.normalizeIndentation(cleaned);
    
    // 3. 웹 타입별 최종 검증
    const isValid = this.validateWebCode(cleaned, webType);
    
    if (!isValid) {
      console.warn(`⚠️ ${webType} 코드 검증 실패`);
    } else {
      console.log(`✅ ${webType} 코드 검증 성공`);
    }
    
    return cleaned;
  }

  /**
   * 들여쓰기 정규화
   */
  normalizeIndentation(code) {
    const lines = code.split('\n');
    const minIndent = lines
      .filter(line => line.trim().length > 0)
      .map(line => line.match(/^\s*/)[0].length)
      .reduce((min, current) => Math.min(min, current), Infinity);
    
    if (minIndent === Infinity || minIndent === 0) return code;
    
    return lines
      .map(line => line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line)
      .join('\n');
  }

  /**
   * 웹 코드 검증
   */
  validateWebCode(code, webType) {
    const patterns = this.webPatterns[webType];
    if (!patterns || !patterns.validation) return true;
    
    // 기본 검증: 코드가 비어있지 않은지
    if (!code || code.trim().length === 0) return false;
    
    // 타입별 검증
    const validationResults = {};
    for (const [key, pattern] of Object.entries(patterns.validation)) {
      validationResults[key] = pattern.test(code);
    }
    
    console.log(`🔍 ${webType} 검증 결과:`, validationResults);
    
    // 최소 하나의 검증 통과시 성공
    return Object.values(validationResults).some(result => result);
  }

  /**
   * 통합 웹 페이지 처리 (HTML + CSS + JS)
   */
  processIntegratedWeb(response) {
    console.log('🌐 통합 웹 페이지 처리 시작');
    
    const result = {
      html: '',
      css: '',
      javascript: ''
    };
    
    // HTML 추출
    const htmlMatch = response.match(/<[^>]+>[^<]*<\/[^>]+>/);
    if (htmlMatch) {
      result.html = this.processHTML(htmlMatch[0]);
    }
    
    // CSS 추출
    const cssMatch = response.match(/\.[a-zA-Z-_][^{]*\{[^}]*\}/);
    if (cssMatch) {
      result.css = this.processCSS(cssMatch[0]);
    }
    
    // JavaScript 추출
    const jsMatch = response.match(/function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*\{[\s\S]*?\}/);
    if (jsMatch) {
      result.javascript = this.processJS(jsMatch[0]);
    }
    
    return result;
  }
}

// 편의 함수들
function preprocessWebResponse(response, webType = 'auto', modelName = 'deepseek-coder') {
  const preprocessor = new WebPreprocessor();
  return preprocessor.preprocess(response, webType, modelName);
}

function processIntegratedWebPage(response) {
  const preprocessor = new WebPreprocessor();
  return preprocessor.processIntegratedWeb(response);
}

module.exports = {
  WebPreprocessor,
  preprocessWebResponse,
  processIntegratedWebPage
};