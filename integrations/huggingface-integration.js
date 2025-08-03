/**
 * HuggingFace 모델 통합 (A.X-3.1 등)
 */

const axios = require('axios');
const CodeBridge = require('../code-bridge');

class HuggingFaceCodeBridge {
  constructor(options = {}) {
    this.model = options.model || 'skt/A.X-3.1';
    this.apiToken = options.apiToken || process.env.HF_API_TOKEN;
    this.temperature = options.temperature || 0.3;
    this.maxTokens = options.maxTokens || 2048;
    this.codeBridge = new CodeBridge();
    this.baseURL = 'https://api-inference.huggingface.co/models';
    
    console.log(`🤖 HuggingFace CodeBridge 초기화: ${this.model}`);
  }

  async improveCode(originalCode, task) {
    const startTime = Date.now();
    
    try {
      console.log(`📝 작업 시작: ${task}`);
      
      // 프롬프트 생성
      const prompt = this.createPrompt(originalCode, task);
      
      // HuggingFace API 호출
      const response = await this.callHuggingFaceAPI(prompt);
      
      if (!response || !response.generated_text) {
        throw new Error('Invalid response from HuggingFace API');
      }
      
      // 응답에서 코드 추출
      const improvedSnippet = this.extractCodeFromResponse(response.generated_text, originalCode);
      
      if (!improvedSnippet) {
        throw new Error('Failed to extract code from response');
      }
      
      // CodeBridge로 코드 병합 (JavaScript와 HTML만)
      const language = this.detectLanguage(originalCode);
      let finalCode;
      
      if (language === 'javascript' || language === 'html') {
        try {
          const fileType = this.detectFileType(originalCode);
          finalCode = this.codeBridge.process(originalCode, improvedSnippet, fileType);
        } catch (bridgeError) {
          console.warn('⚠️ CodeBridge 병합 실패, 개선된 코드 사용:', bridgeError.message);
          finalCode = improvedSnippet;
        }
      } else {
        // Python, Rust, C++ 등은 텍스트 병합 사용
        finalCode = improvedSnippet;
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ 작업 완료 (${duration}ms)`);
      
      return {
        success: true,
        originalCode,
        task,
        improvedSnippet,
        finalCode,
        duration,
        rawResponse: response.generated_text,
        model: this.model
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 작업 실패 (${duration}ms):`, error.message);
      
      return {
        success: false,
        originalCode,
        task,
        error: error.message,
        duration,
        model: this.model
      };
    }
  }

  createPrompt(originalCode, task) {
    const language = this.detectLanguage(originalCode);
    
    return `You are an expert ${language} developer. Your task is to improve the given code according to the specific requirements.

TASK: ${task}

ORIGINAL CODE:
\`\`\`${language}
${originalCode.trim()}
\`\`\`

Please provide ONLY the improved code without any explanations. Make sure to:
1. Follow best practices for ${language}
2. Add proper error handling where needed
3. Include appropriate documentation/comments
4. Maintain the original code structure where possible
5. Focus specifically on: ${task}

IMPROVED CODE:
\`\`\`${language}`;
  }

  async callHuggingFaceAPI(prompt) {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      };

      const data = {
        inputs: prompt,
        parameters: {
          max_new_tokens: this.maxTokens,
          temperature: this.temperature,
          do_sample: true,
          top_p: 0.95,
          stop: ["```", "\n\n\n"]
        }
      };

      console.log(`🌐 HuggingFace API 호출 중... (${this.model})`);
      
      const response = await axios.post(
        `${this.baseURL}/${this.model}`,
        data,
        { headers, timeout: 60000 }
      );

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      } else if (response.data && response.data.generated_text) {
        return response.data;
      } else {
        throw new Error('Unexpected response format from HuggingFace API');
      }

    } catch (error) {
      if (error.response) {
        throw new Error(`HuggingFace API Error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('HuggingFace API timeout');
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
  }

  extractCodeFromResponse(response, originalCode) {
    try {
      // 응답에서 코드 블록 추출
      const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
      const matches = [...response.matchAll(codeBlockRegex)];
      
      if (matches.length > 0) {
        // 가장 긴 코드 블록을 선택
        const codeBlocks = matches.map(match => match[1].trim());
        const longestBlock = codeBlocks.reduce((longest, current) => 
          current.length > longest.length ? current : longest, ''
        );
        
        if (longestBlock.length > 10) {
          return longestBlock;
        }
      }
      
      // 코드 블록이 없으면 프롬프트 이후의 텍스트 추출
      const promptEnd = response.indexOf('IMPROVED CODE:');
      if (promptEnd !== -1) {
        const afterPrompt = response.substring(promptEnd + 'IMPROVED CODE:'.length).trim();
        const cleanCode = afterPrompt.replace(/^```\w*\s*/, '').replace(/```$/, '').trim();
        
        if (cleanCode.length > 10) {
          return cleanCode;
        }
      }
      
      // 마지막 시도: 원본 코드와 비슷한 구조를 찾기
      const lines = response.split('\n');
      const codeLines = lines.filter(line => 
        line.trim().length > 0 && 
        !line.startsWith('You are') &&
        !line.startsWith('TASK:') &&
        !line.startsWith('ORIGINAL') &&
        !line.includes('Please provide')
      );
      
      if (codeLines.length > 0) {
        return codeLines.join('\n').trim();
      }
      
      return null;
      
    } catch (error) {
      console.error('코드 추출 중 오류:', error.message);
      return null;
    }
  }

  detectLanguage(code) {
    const trimmedCode = code.trim().toLowerCase();
    
    if (trimmedCode.includes('def ') || trimmedCode.includes('import ') || trimmedCode.includes('from ')) {
      return 'python';
    } else if (trimmedCode.includes('function ') || trimmedCode.includes('const ') || trimmedCode.includes('let ')) {
      return 'javascript';
    } else if (trimmedCode.includes('class ') && trimmedCode.includes('public:')) {
      return 'cpp';
    } else if (trimmedCode.includes('fn ') || trimmedCode.includes('impl ') || trimmedCode.includes('struct ')) {
      return 'rust';
    } else if (trimmedCode.includes('<html') || trimmedCode.includes('<div')) {
      return 'html';
    } else {
      return 'javascript'; // 기본값
    }
  }

  detectFileType(code) {
    const language = this.detectLanguage(code);
    const mapping = {
      'python': 'py',
      'javascript': 'js',
      'cpp': 'cpp',
      'rust': 'rs',
      'html': 'html'
    };
    return mapping[language] || 'js';
  }

  async testConnection() {
    try {
      const testPrompt = 'Hello, please respond with "Connection successful"';
      const response = await this.callHuggingFaceAPI(testPrompt);
      console.log(`✅ ${this.model} 연결 테스트 성공`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.model} 연결 테스트 실패:`, error.message);
      return false;
    }
  }
}

module.exports = HuggingFaceCodeBridge;