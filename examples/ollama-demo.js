/**
 * Ollama + CodeBridge 통합 데모
 */

const OllamaCodeBridge = require('../integrations/ollama-integration');

// 다양한 모델로 테스트할 예제 코드
const exampleCode = `
class UserManager {
  constructor() {
    this.users = [];
  }
  
  addUser(user) {
    this.users.push(user);
    return user;
  }
  
  getUser(id) {
    return this.users.find(u => u.id === id);
  }
  
  updateUser(id, data) {
    const user = this.getUser(id);
    Object.assign(user, data);
    return user;
  }
  
  deleteUser(id) {
    const index = this.users.findIndex(u => u.id === id);
    this.users.splice(index, 1);
  }
}
`;

// 다양한 개선 시나리오
const improvementScenarios = [
  {
    name: "기본 보안 강화",
    tasks: [
      {
        description: "입력 검증 추가",
        instruction: "Add input validation to addUser method. Check if user object has required fields (id, name)"
      },
      {
        description: "에러 처리 강화", 
        instruction: "Add error handling to getUser method. Throw error if user not found"
      }
    ]
  },
  {
    name: "성능 최적화",
    tasks: [
      {
        description: "캐싱 메커니즘",
        instruction: "Add caching to getUser method using // @decorator cache"
      },
      {
        description: "비동기 처리",
        instruction: "Make updateUser async and add validation. Use // @decorator async"
      }
    ]
  },
  {
    name: "고급 기능",
    tasks: [
      {
        description: "안전한 삭제",
        instruction: "Make deleteUser safer with soft delete. Add // @rename softDeleteUser"
      },
      {
        description: "접근 제어",
        instruction: "Make deleteUser private using // @access private command"
      }
    ]
  }
];

async function runDemo() {
  console.log('🚀 Ollama + CodeBridge 통합 데모 시작\n');
  
  // Ollama 연결 테스트
  const ollamaCodeBridge = new OllamaCodeBridge({
    model: 'deepseek-coder:6.7b',
    temperature: 0.3
  });
  
  try {
    // 사용 가능한 모델 확인
    console.log('📋 사용 가능한 모델 확인...');
    const availableModels = await ollamaCodeBridge.getAvailableModels();
    console.log('사용 가능한 모델:', availableModels.join(', '));
    console.log();
    
    // 기본 모델 성능 테스트
    console.log('🧪 기본 모델 성능 테스트...');
    const testResult = await ollamaCodeBridge.testModel();
    console.log(`성공률: ${(testResult.successRate * 100).toFixed(1)}%`);
    console.log(`평균 속도: ${testResult.duration}ms\n`);
    
    // 시나리오별 테스트
    for (const scenario of improvementScenarios) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 시나리오: ${scenario.name}`);
      console.log(`${'='.repeat(60)}\n`);
      
      let currentCode = exampleCode;
      
      for (const task of scenario.tasks) {
        console.log(`🔧 ${task.description}`);
        console.log(`📝 요청: ${task.instruction}\n`);
        
        const result = await ollamaCodeBridge.improveCode(currentCode, task.instruction);
        
        if (result.success) {
          console.log('✅ 성공!');
          console.log('\n--- LLM 응답 ---');
          console.log(result.improvedSnippet);
          console.log('\n--- 최종 병합 결과 ---');
          console.log(result.finalCode);
          
          currentCode = result.finalCode; // 다음 작업에 결과 사용
        } else {
          console.log('❌ 실패:', result.error);
        }
        
        console.log('\n' + '-'.repeat(40) + '\n');
      }
    }
    
    // 다른 모델로 비교 테스트 (있다면)
    if (availableModels.includes('codellama:7b')) {
      console.log('\n🔄 CodeLlama 모델로 비교 테스트...');
      await ollamaCodeBridge.switchModel('codellama:7b');
      
      const comparison = await ollamaCodeBridge.improveCode(
        exampleCode,
        "Add comprehensive error handling and input validation to all methods"
      );
      
      if (comparison.success) {
        console.log('✅ CodeLlama 결과:');
        console.log(comparison.finalCode);
      }
    }
    
  } catch (error) {
    console.error('❌ 데모 실행 중 오류:', error.message);
    
    if (error.message.includes('Connection refused')) {
      console.log('\n💡 해결 방법:');
      console.log('1. Ollama가 실행 중인지 확인: ollama serve');
      console.log('2. 모델이 설치되었는지 확인: ollama list');
      console.log('3. 포트가 올바른지 확인 (기본: 11434)');
    }
  }
}

// 대화형 모드
async function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const ollamaCodeBridge = new OllamaCodeBridge();
  
  console.log('\n🤖 Ollama CodeBridge 대화형 모드');
  console.log('원본 코드를 입력하고 개선 요청을 하세요.\n');
  
  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };
  
  try {
    const originalCode = await askQuestion('원본 코드를 입력하세요:\n');
    const instruction = await askQuestion('\n개선 요청을 입력하세요:\n');
    
    console.log('\n🔄 처리 중...\n');
    
    const result = await ollamaCodeBridge.improveCode(originalCode, instruction);
    
    if (result.success) {
      console.log('✅ 성공!');
      console.log('\n--- 최종 결과 ---');
      console.log(result.finalCode);
    } else {
      console.log('❌ 실패:', result.error);
    }
    
  } catch (error) {
    console.error('오류:', error.message);
  } finally {
    rl.close();
  }
}

// 모델 비교 테스트
async function compareModels() {
  const models = ['deepseek-coder:6.7b', 'codellama:7b', 'starcoder2:3b'];
  const testInstruction = "Add error handling and input validation to the getData method";
  
  console.log('\n📊 모델별 성능 비교\n');
  
  for (const modelName of models) {
    try {
      console.log(`🧪 테스트 중: ${modelName}`);
      
      const ollamaCodeBridge = new OllamaCodeBridge({ model: modelName });
      const startTime = Date.now();
      
      const result = await ollamaCodeBridge.improveCode(exampleCode, testInstruction);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  응답 시간: ${duration}ms`);
      console.log(`✅ 성공: ${result.success ? 'Yes' : 'No'}`);
      
      if (result.success) {
        const codeLength = result.finalCode.length;
        console.log(`📏 코드 길이: ${codeLength} 문자`);
      }
      
      console.log();
      
    } catch (error) {
      console.log(`❌ ${modelName}: ${error.message}\n`);
    }
  }
}

// 실행 모드 선택
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveMode();
} else if (args.includes('--compare') || args.includes('-c')) {
  compareModels();
} else {
  runDemo();
}

// 사용법 출력
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
사용법:
  node ollama-demo.js                기본 데모 실행
  node ollama-demo.js --interactive  대화형 모드
  node ollama-demo.js --compare      모델 비교 테스트
  node ollama-demo.js --help         도움말 표시
  `);
}