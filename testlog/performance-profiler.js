/**
 * 성능 프로파일링 도구
 * 7초 동안 무엇을 하는지 정확히 측정
 */

const OllamaCodeBridge = require('../integrations/ollama-integration');

class PerformanceProfiler {
  constructor() {
    this.timings = {};
    this.startTime = null;
  }

  start(label) {
    this.timings[label] = { start: Date.now() };
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    console.log(`⏱️  [${this.getElapsed()}ms] ${label} 시작`);
  }

  end(label) {
    if (this.timings[label]) {
      this.timings[label].end = Date.now();
      this.timings[label].duration = this.timings[label].end - this.timings[label].start;
      console.log(`⏱️  [${this.getElapsed()}ms] ${label} 완료 (소요: ${this.timings[label].duration}ms)`);
    }
  }

  getElapsed() {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  getSummary() {
    const total = this.getElapsed();
    console.log('\n📊 === 성능 프로파일링 결과 ===');
    console.log(`전체 소요시간: ${total}ms (${(total/1000).toFixed(1)}초)\n`);
    
    Object.entries(this.timings).forEach(([label, timing]) => {
      const duration = timing.duration || 0;
      const percentage = ((duration / total) * 100).toFixed(1);
      console.log(`${label}: ${duration}ms (${percentage}%)`);
    });

    return this.timings;
  }
}

// 프로파일링된 OllamaCodeBridge 클래스
class ProfiledOllamaCodeBridge extends OllamaCodeBridge {
  constructor(options = {}) {
    super(options);
    this.profiler = new PerformanceProfiler();
  }

  async improveCode(originalCode, instruction, options = {}) {
    this.profiler.start('전체 처리');
    
    this.profiler.start('1. 프롬프트 생성');
    const prompt = this.buildImprovePrompt(originalCode, instruction);
    this.profiler.end('1. 프롬프트 생성');
    
    console.log(`🤖 ${this.model} 모델로 코드 개선 중...`);
    console.log(`📝 요청: ${instruction}`);
    
    try {
      // Ollama API 호출
      this.profiler.start('2. Ollama API 호출 (LLM 추론)');
      const rawResponse = await this.callOllama(prompt, options);
      this.profiler.end('2. Ollama API 호출 (LLM 추론)');
      
      console.log('🔄 LLM 응답 받음, 전처리 중...');
      
      // 전처리
      this.profiler.start('3. 응답 전처리');
      let improvedSnippet;
      let fileType = options.fileType || 'js';
      
      if (this.customPreprocessor) {
        improvedSnippet = this.customPreprocessor(rawResponse, fileType);
      } else if (fileType === 'web' || fileType === 'html' || fileType === 'css') {
        const webType = this.detectWebType(originalCode, instruction);
        if (webType) {
          console.log(`🌐 웹 기술 감지: ${webType}`);
          improvedSnippet = preprocessWebResponse(rawResponse, webType, this.model);
          fileType = webType === 'css' ? 'css' : webType === 'html' ? 'html' : 'js';
        } else {
          console.log(`🌐 웹 타입 자동 감지: ${fileType}`);
          improvedSnippet = preprocessWebResponse(rawResponse, fileType, this.model);
        }
      } else {
        const { preprocessOllamaResponse } = require('../utils/ollama-preprocessor');
        improvedSnippet = preprocessOllamaResponse(rawResponse, this.model, options.debug);
      }
      this.profiler.end('3. 응답 전처리');
      
      console.log('🔄 전처리 완료, CodeBridge로 병합 중...');
      
      // CodeBridge 처리
      this.profiler.start('4. CodeBridge AST 처리');
      const result = this.codeBridge.process(originalCode, improvedSnippet, fileType);
      this.profiler.end('4. CodeBridge AST 처리');
      
      this.profiler.start('5. 결과 객체 생성');
      const finalResult = {
        success: true,
        originalCode,
        instruction,
        rawResponse,
        improvedSnippet,
        finalCode: result,
        model: this.model
      };
      this.profiler.end('5. 결과 객체 생성');
      
      this.profiler.end('전체 처리');
      
      // 프로파일링 결과 출력
      const timings = this.profiler.getSummary();
      
      return {
        ...finalResult,
        performanceProfile: timings
      };
    } catch (error) {
      this.profiler.end('전체 처리');
      this.profiler.getSummary();
      
      return {
        success: false,
        error: error.message,
        originalCode,
        instruction,
        model: this.model
      };
    }
  }

  async callOllama(prompt, options = {}) {
    this.profiler.start('2-1. API 요청 준비');
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
    this.profiler.end('2-1. API 요청 준비');
    
    this.profiler.start('2-2. 네트워크 요청');
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      this.profiler.end('2-2. 네트워크 요청');
      
      this.profiler.start('2-3. 응답 파싱');
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.profiler.end('2-3. 응답 파싱');
      
      return data.response || '';
    } catch (error) {
      this.profiler.end('2-2. 네트워크 요청');
      console.error('Ollama API 호출 실패:', error);
      throw error;
    }
  }
}

// 테스트 실행
async function runPerformanceTest() {
  console.log('🔍 === 성능 프로파일링 테스트 시작 ===\n');
  
  const bridge = new ProfiledOllamaCodeBridge({ 
    model: 'deepseek-coder:6.7b',
    temperature: 0.3,
    maxTokens: 500
  });
  
  // Rust 전처리기 설정
  bridge.customPreprocessor = (response, language = 'rust') => {
    const rustPattern = /```(?:rust|rs)?\n?([\s\S]*?)```/g;
    const matches = [...response.matchAll(rustPattern)];
    if (matches.length > 0) {
      return matches[0][1].trim();
    }
    return response.trim();
  };
  
  const originalCode = `
fn main() {
    println!("Hello, world!");
}

fn greet(name: &str) {
    println!("Hello, {}!", name);
}`;

  const instruction = 'Add a new public function called calculate_sum that takes two i32 parameters (a and b) and returns their sum as i32. Use the @visibility pub comment command.';
  
  try {
    const result = await bridge.improveCode(originalCode, instruction, { fileType: 'rust' });
    
    console.log('\n🎯 === 최종 결과 ===');
    console.log('성공:', result.success);
    if (result.performanceProfile) {
      console.log('\n📈 === 성능 분석 ===');
      const total = result.performanceProfile['전체 처리'].duration;
      
      console.log('\n가장 시간이 오래 걸리는 단계:');
      Object.entries(result.performanceProfile)
        .filter(([key]) => key !== '전체 처리')
        .sort((a, b) => (b[1].duration || 0) - (a[1].duration || 0))
        .slice(0, 3)
        .forEach(([label, timing], index) => {
          const duration = timing.duration || 0;
          const percentage = ((duration / total) * 100).toFixed(1);
          console.log(`${index + 1}. ${label}: ${duration}ms (${percentage}%)`);
        });
    }
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

if (require.main === module) {
  runPerformanceTest().catch(console.error);
}

module.exports = { ProfiledOllamaCodeBridge, PerformanceProfiler };