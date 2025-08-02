/**
 * 간단한 Ollama 테스트
 */

const OllamaCodeBridge = require('../integrations/ollama-integration');

async function simpleTest() {
  console.log('🧪 간단한 Ollama 테스트 시작\n');
  
  const ollamaCodeBridge = new OllamaCodeBridge({
    model: 'deepseek-coder:6.7b',
    temperature: 0.2
  });
  
  // 간단한 원본 코드
  const originalCode = `
class Calculator {
  add(a, b) {
    return a + b;
  }
}`;
  
  console.log('원본 코드:');
  console.log(originalCode);
  console.log();
  
  // 단순한 개선 요청
  const instruction = "Add error handling to check if a and b are numbers. Return only the improved add method.";
  
  console.log('요청:', instruction);
  console.log();
  
  try {
    const result = await ollamaCodeBridge.improveCode(originalCode, instruction, {
      debug: true  // 디버그 모드 활성화
    });
    
    if (result.success) {
      console.log('✅ 성공!');
      console.log('\n--- 원본 LLM 응답 ---');
      console.log(result.rawResponse);
      console.log('\n--- 전처리된 코드 ---');
      console.log(result.improvedSnippet);
      console.log('\n--- 최종 병합 결과 ---');
      console.log(result.finalCode);
    } else {
      console.log('❌ 실패:', result.error);
    }
    
  } catch (error) {
    console.error('테스트 실행 오류:', error);
  }
}

// 직접 Ollama API 테스트
async function directOllamaTest() {
  console.log('\n🔧 직접 Ollama API 테스트\n');
  
  const payload = {
    model: 'deepseek-coder:6.7b',
    prompt: `Add error handling to this method. Return ONLY the improved method code:

add(a, b) {
  return a + b;
}

Improved method:`,
    system: `You are a code assistant. Return only the improved method code without explanations.`,
    stream: false,
    options: {
      temperature: 0.2,
      num_predict: 200
    }
  };
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('Ollama 직접 응답:');
    console.log(data.response);
    
  } catch (error) {
    console.error('직접 API 호출 실패:', error);
  }
}

// 실행
if (require.main === module) {
  simpleTest().then(() => {
    return directOllamaTest();
  });
}