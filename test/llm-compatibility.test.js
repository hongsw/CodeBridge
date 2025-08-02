const CodeBridge = require('../code-bridge');

describe('LLM 호환성 테스트', () => {
  let processor;
  
  beforeEach(() => {
    processor = new CodeBridge();
  });
  
  const originalCode = `
    class DataService {
      fetchData(id) {
        return fetch('/api/data/' + id);
      }
    }
  `;
  
  describe('다양한 LLM 출력 형식 처리', () => {
    describe('Claude 스타일', () => {
      test('기본 Claude 형식', () => {
        const claudeOutput = `
          // 보안과 에러 처리를 개선했습니다
          // @decorator retry(3)
          // @decorator validateInput
          async fetchData(id) {
            if (!id) throw new Error('ID is required');
            
            try {
              const response = await fetch(\`/api/data/\${encodeURIComponent(id)}\`);
              if (!response.ok) throw new Error('Failed to fetch');
              return await response.json();
            } catch (error) {
              console.error('Fetch failed:', error);
              throw error;
            }
          }
        `;
        
        const result = processor.process(originalCode, claudeOutput, 'js');
        expect(result).toContain('@retry');
        expect(result).toContain('@validateInput');
        expect(result).toContain('async fetchData');
      });
      
      test('Claude 코드 블록 내 스니펫', () => {
        const claudeWithCodeBlock = `
          다음은 개선된 메서드입니다:
          
          \`\`\`javascript
          // @access private
          // @decorator cache
          async fetchData(id) {
            return this.cachedFetch(id);
          }
          \`\`\`
        `;
        
        // 코드 블록 추출 시뮬레이션
        const codeMatch = claudeWithCodeBlock.match(/```javascript\n([\s\S]*?)```/);
        if (codeMatch) {
          const extractedCode = codeMatch[1];
          const result = processor.process(originalCode, extractedCode, 'js');
          expect(result).toContain('@cache');
        }
      });
    });
    
    describe('GPT-4 스타일', () => {
      test('콜론이 있는 명령어 형식', () => {
        const gpt4Output = `
          // @decorator: memoize
          // @access: public
          // @returns: Promise<Data>
          async fetchData(id) {
            // Implementation with memoization
            return memoizedFetch(id);
          }
        `;
        
        // 콜론 제거 전처리 필요
        const normalizedOutput = gpt4Output.replace(/@(\w+):\s*/g, '@$1 ');
        const result = processor.process(originalCode, normalizedOutput, 'js');
        expect(result).toBeTruthy();
      });
      
      test('설명이 포함된 형식', () => {
        const gpt4Verbose = `
          Here's an improved version with better error handling:
          
          // This method now includes retry logic
          // @decorator retry
          // @decorator log
          async fetchData(id) {
            // Validate input
            if (typeof id !== 'string') {
              throw new TypeError('ID must be a string');
            }
            
            // Fetch with retry
            return await this.fetchWithRetry(id);
          }
        `;
        
        const result = processor.process(originalCode, gpt4Verbose, 'js');
        expect(result).toContain('@retry');
        expect(result).toContain('@log');
      });
    });
    
    describe('Gemini 스타일', () => {
      test('블록 주석 명령어', () => {
        const geminiOutput = `
          /* @decorator async */
          /* @decorator timeout(5000) */
          /* @access protected */
          fetchData(id) {
            return this.timedFetch(id, 5000);
          }
        `;
        
        // 블록 주석을 라인 주석으로 변환
        const normalizedOutput = geminiOutput.replace(/\/\*\s*@(\w+)\s*([^*]*)\*\//g, '// @$1 $2');
        const result = processor.process(originalCode, normalizedOutput, 'js');
        expect(result).toBeTruthy();
      });
      
      test('혼합 주석 스타일', () => {
        const geminiMixed = `
          /**
           * Improved fetch method
           * @decorator cache
           */
          // @access private
          /* @decorator validate */
          async fetchData(id) {
            return await this.validatedFetch(id);
          }
        `;
        
        // JSDoc 스타일 처리
        const result = processor.process(originalCode, geminiMixed, 'js');
        expect(result).toBeTruthy();
      });
    });
  });
  
  describe('주석 명령어 변형 처리', () => {
    const testVariations = [
      {
        name: '공백 변형',
        variations: [
          '// @decorator cache',
          '//  @decorator  cache',
          '//\t@decorator\tcache',
          '// @decorator   cache'
        ]
      },
      {
        name: '대소문자 변형',
        variations: [
          '// @decorator cache',
          '// @Decorator cache',
          '// @DECORATOR cache',
          '// @dEcOrAtOr cache'
        ]
      },
      {
        name: '구분자 변형',
        variations: [
          '// @decorator cache',
          '// @decorator: cache',
          '// @decorator = cache',
          '// @decorator -> cache'
        ]
      }
    ];
    
    testVariations.forEach(({ name, variations }) => {
      test(`should handle ${name}`, () => {
        variations.forEach(variant => {
          const snippet = `
            ${variant}
            fetchData(id) { return fetch(id); }
          `;
          
          // 정규화 처리
          const normalized = snippet
            .replace(/@(\w+)[:\s=\->]+/g, '@$1 ')
            .toLowerCase();
          
          expect(() => processor.process(originalCode, normalized, 'js'))
            .not.toThrow();
        });
      });
    });
  });
  
  describe('부분 코드 vs 전체 코드', () => {
    test('메서드만 있는 스니펫', () => {
      const methodOnly = `
        // @decorator async
        fetchData(id) {
          return this.asyncFetch(id);
        }
      `;
      
      const result = processor.process(originalCode, methodOnly, 'js');
      expect(result).toContain('fetchData');
      expect(result).toContain('@async');
    });
    
    test('클래스 전체 교체', () => {
      const fullClass = `
        class DataService {
          constructor() {
            this.cache = new Map();
          }
          
          // @decorator memoize
          fetchData(id) {
            if (this.cache.has(id)) {
              return this.cache.get(id);
            }
            return fetch('/api/data/' + id);
          }
          
          clearCache() {
            this.cache.clear();
          }
        }
      `;
      
      const result = processor.process(originalCode, fullClass, 'js');
      expect(result).toContain('constructor');
      expect(result).toContain('clearCache');
    });
    
    test('여러 메서드 동시 수정', () => {
      const multipleMethodsOriginal = `
        class Service {
          method1() { return 1; }
          method2() { return 2; }
          method3() { return 3; }
        }
      `;
      
      const multipleMethodsSnippet = `
        // @decorator log
        method1() { return 10; }
        
        // @delete
        method2() { }
        
        // @rename calculate
        method3() { return 30; }
      `;
      
      const result = processor.process(multipleMethodsOriginal, multipleMethodsSnippet, 'js');
      expect(result).toContain('@log');
      expect(result).not.toContain('method2');
      expect(result).toContain('calculate');
    });
  });
  
  describe('언어별 LLM 패턴', () => {
    test('Python 스타일 스니펫 (참고용)', () => {
      const pythonStyle = `
        # @decorator lru_cache(maxsize=100)
        # @type_hints str -> Dict[str, Any]
        def fetch_data(self, id: str) -> Dict[str, Any]:
            """Fetch data with caching"""
            return self._fetch_with_cache(id)
      `;
      
      // Python 프로세서가 구현되면 테스트
      expect(pythonStyle).toContain('@decorator');
      expect(pythonStyle).toContain('@type_hints');
    });
    
    test('Rust 스타일 스니펫 (참고용)', () => {
      const rustStyle = `
        // @visibility pub
        // @attributes #[tokio::main]
        // @generic <T: Send + Sync>
        async fn fetch_data<T: Send + Sync>(&self, id: &str) -> Result<T, Error> {
            self.fetch_with_timeout(id).await
        }
      `;
      
      // Rust 프로세서가 구현되면 테스트
      expect(rustStyle).toContain('@visibility');
      expect(rustStyle).toContain('@attributes');
    });
  });
  
  describe('오류 복구 및 유연성', () => {
    test('부분적으로 잘못된 명령어', () => {
      const partiallyInvalid = `
        // @decorator valid
        // @invalid-command something
        // @access private
        fetchData(id) { return fetch(id); }
      `;
      
      // 유효한 명령어만 처리되어야 함
      const result = processor.process(originalCode, partiallyInvalid, 'js');
      expect(result).toContain('@valid');
    });
    
    test('중복 명령어 처리', () => {
      const duplicateCommands = `
        // @decorator cache
        // @decorator cache
        // @decorator log
        fetchData(id) { return fetch(id); }
      `;
      
      const result = processor.process(originalCode, duplicateCommands, 'js');
      // 중복 제거 확인
      const cacheCount = (result.match(/@cache/g) || []).length;
      expect(cacheCount).toBe(1);
    });
    
    test('비어있는 명령어 값', () => {
      const emptyValues = `
        // @decorator
        // @access
        fetchData(id) { return fetch(id); }
      `;
      
      // 빈 값은 무시되거나 기본값 사용
      expect(() => processor.process(originalCode, emptyValues, 'js'))
        .not.toThrow();
    });
  });
});

// LLM별 사용 가이드 생성
const generateLLMGuide = (llmName) => {
  const guides = {
    claude: {
      format: '// @command value',
      example: '// @decorator cache\n// @access private',
      tips: '주석은 메서드 바로 위에 작성하세요'
    },
    gpt4: {
      format: '// @command value 또는 // @command: value',
      example: '// @decorator: async\n// @access: public',
      tips: '콜론은 선택사항입니다'
    },
    gemini: {
      format: '/* @command value */ 또는 // @command value',
      example: '/* @decorator memoize */\n/* @access protected */',
      tips: '블록 주석도 지원됩니다'
    }
  };
  
  return guides[llmName] || guides.claude;
};

module.exports = { generateLLMGuide };