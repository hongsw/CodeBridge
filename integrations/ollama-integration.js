/**
 * Ollama 모델과 CodeBridge 통합 모듈
 */

const { spawn } = require('child_process');
const CodeBridge = require('../code-bridge');
const { preprocessOllamaResponse } = require('../utils/ollama-preprocessor');

class OllamaCodeBridge {
  constructor(options = {}) {
    this.model = options.model || 'deepseek-coder:6.7b';
    this.codeBridge = new CodeBridge();
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.temperature = options.temperature || 0.3;
    this.maxTokens = options.maxTokens || 2048;
    
    // 모델별 최적화 설정
    this.modelConfig = {
      'deepseek-coder:6.7b': {
        systemPrompt: this.getDeepSeekSystemPrompt(),
        temperature: 0.3,
        contextWindow: 16384,
        specialties: ['javascript', 'python', 'typescript', 'rust']
      },
      'codellama:7b': {
        systemPrompt: this.getCodeLlamaSystemPrompt(),
        temperature: 0.2,
        contextWindow: 4096,
        specialties: ['python', 'javascript', 'c++', 'java']
      },
      'starcoder2:3b': {
        systemPrompt: this.getStarCoderSystemPrompt(),
        temperature: 0.4,
        contextWindow: 16384,
        specialties: ['javascript', 'typescript', 'python', 'go']
      }
    };
  }
  
  /**
   * DeepSeek Coder 모델용 시스템 프롬프트
   */
  getDeepSeekSystemPrompt() {
    return `You are a code improvement assistant specialized in merging code snippets.

Guidelines:
1. Return ONLY the improved method code
2. Use CodeBridge command format: // @command value
3. Focus on practical improvements: error handling, validation, performance
4. Preserve existing functionality while enhancing it
5. Use modern JavaScript/TypeScript patterns

Available commands:
- // @decorator [name] - Add decorator
- // @access [private|public|protected] - Change access level
- // @rename [newName] - Rename method
- // @params [param1, param2] - Update parameters
- // @delete - Mark for deletion

Example:
// @decorator cache
// @decorator validate
async getData(id) {
  if (!id) throw new Error('ID required');
  return await this.fetchData(id);
}`;
  }
  
  /**
   * CodeLlama 모델용 시스템 프롬프트
   */
  getCodeLlamaSystemPrompt() {
    return `You are a helpful code assistant. When asked to improve code:

1. Return only the updated method
2. Add improvements like error handling and validation
3. Use these comment commands for special instructions:
   - // @decorator [name]
   - // @access [private|public|protected]
   - // @rename [newName]

Keep responses concise and focused on the code.`;
  }
  
  /**
   * StarCoder 모델용 시스템 프롬프트
   */
  getStarCoderSystemPrompt() {
    return `Code improvement assistant. Rules:
- Return improved method only
- Add error handling and validation
- Use // @command format for special instructions
- Focus on practical enhancements`;
  }
  
  /**
   * Ollama API 호출
   */
  async callOllama(prompt, options = {}) {
    const config = this.modelConfig[this.model] || this.modelConfig['deepseek-coder:6.7b'];
    
    const payload = {
      model: this.model,
      prompt: prompt,
      system: options.systemPrompt || config.systemPrompt,
      temperature: options.temperature || this.temperature,
      options: {
        num_predict: this.maxTokens,
        temperature: options.temperature || this.temperature,
        top_p: 0.9,
        top_k: 40
      },
      stream: false
    };
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama API 호출 실패:', error);
      throw error;
    }
  }
  
  /**
   * 코드 개선 요청 처리
   */
  async improveCode(originalCode, instruction, options = {}) {
    const prompt = this.buildImprovePrompt(originalCode, instruction);
    
    console.log(`🤖 ${this.model} 모델로 코드 개선 중...`);
    console.log(`📝 요청: ${instruction}`);
    
    try {
      // Ollama로 개선된 코드 생성
      const rawResponse = await this.callOllama(prompt, options);
      
      console.log('🔄 LLM 응답 받음, 전처리 중...');
      
      // Ollama 응답 전처리
      const improvedSnippet = preprocessOllamaResponse(rawResponse, this.model, options.debug);
      
      console.log('🔄 전처리 완료, CodeBridge로 병합 중...');
      
      // CodeBridge로 병합
      const result = this.codeBridge.process(originalCode, improvedSnippet, 'js');
      
      return {
        success: true,
        originalCode,
        instruction,
        rawResponse,
        improvedSnippet,
        finalCode: result,
        model: this.model
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        originalCode,
        instruction,
        model: this.model
      };
    }
  }
  
  /**
   * 코드 개선 프롬프트 생성
   */
  buildImprovePrompt(originalCode, instruction) {
    return `Original code:
\`\`\`javascript
${originalCode}
\`\`\`

Task: ${instruction}

Return only the improved method code that follows the instruction. Use // @command format for special modifications.`;
  }
  
  /**
   * 메서드별 개선
   */
  async improveMethod(originalCode, methodName, improvements) {
    const instruction = `Improve the ${methodName} method with these changes: ${improvements.join(', ')}`;
    return await this.improveCode(originalCode, instruction);
  }
  
  /**
   * 다중 개선 작업
   */
  async batchImprove(originalCode, tasks) {
    const results = [];
    
    for (const task of tasks) {
      console.log(`\n처리 중: ${task.description}`);
      const result = await this.improveCode(originalCode, task.instruction);
      results.push({
        task: task.description,
        ...result
      });
      
      if (result.success) {
        originalCode = result.finalCode; // 다음 작업에 이전 결과 사용
      }
    }
    
    return results;
  }
  
  /**
   * 모델 성능 테스트
   */
  async testModel() {
    const testCode = `
class TestService {
  getData(id) {
    return this.data[id];
  }
}`;
    
    const testTasks = [
      {
        description: "에러 처리 추가",
        instruction: "Add error handling for invalid ID"
      },
      {
        description: "비동기로 변경",
        instruction: "Make the method async and add await"
      },
      {
        description: "캐싱 추가",
        instruction: "Add caching with @decorator cache command"
      }
    ];
    
    console.log(`\n🧪 ${this.model} 모델 성능 테스트 시작...`);
    
    const startTime = Date.now();
    const results = await this.batchImprove(testCode, testTasks);
    const endTime = Date.now();
    
    console.log(`\n📊 테스트 완료 (${endTime - startTime}ms)`);
    console.log(`성공: ${results.filter(r => r.success).length}/${results.length}`);
    
    return {
      model: this.model,
      duration: endTime - startTime,
      results,
      successRate: results.filter(r => r.success).length / results.length
    };
  }
  
  /**
   * 사용 가능한 모델 확인
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models.map(model => model.name);
    } catch (error) {
      console.error('모델 목록 조회 실패:', error);
      return [];
    }
  }
  
  /**
   * 모델 전환
   */
  async switchModel(modelName) {
    const availableModels = await this.getAvailableModels();
    
    if (!availableModels.includes(modelName)) {
      throw new Error(`모델 '${modelName}'이 설치되지 않음. 사용 가능: ${availableModels.join(', ')}`);
    }
    
    this.model = modelName;
    console.log(`✅ 모델 전환: ${modelName}`);
  }
  
  /**
   * 모델 다운로드
   */
  async downloadModel(modelName) {
    console.log(`📥 모델 다운로드 시작: ${modelName}`);
    
    return new Promise((resolve, reject) => {
      const process = spawn('ollama', ['pull', modelName]);
      
      process.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      
      process.stderr.on('data', (data) => {
        console.error(data.toString());
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${modelName} 다운로드 완료`);
          resolve();
        } else {
          reject(new Error(`다운로드 실패: exit code ${code}`));
        }
      });
    });
  }
}

module.exports = OllamaCodeBridge;