/**
 * SKT A.X-3.1 모델 테스트 예제
 * HuggingFace API를 통한 A.X-3.1 모델 사용법
 */

const HuggingFaceCodeBridge = require('../integrations/huggingface-integration');

async function testAX31Model() {
  // HuggingFace API 토큰이 설정되어 있는지 확인
  if (!process.env.HF_API_TOKEN) {
    console.log('❌ HuggingFace API 토큰이 설정되지 않았습니다.');
    console.log('다음 명령어로 토큰을 설정하세요:');
    console.log('export HF_API_TOKEN=your_huggingface_token');
    console.log('\n토큰 발급 방법:');
    console.log('1. https://huggingface.co/settings/tokens 접속');
    console.log('2. "New token" 클릭');
    console.log('3. "Read" 권한으로 토큰 생성');
    console.log('4. 생성된 토큰을 환경변수로 설정');
    return;
  }

  // A.X-3.1 모델 초기화
  const ax31CodeBridge = new HuggingFaceCodeBridge({
    model: 'skt/A.X-3.1',
    temperature: 0.3
  });

  console.log('🚀 SKT A.X-3.1 모델 테스트 시작\n');

  // 연결 테스트
  console.log('🔗 모델 연결 테스트 중...');
  const connectionTest = await ax31CodeBridge.testConnection();
  
  if (!connectionTest) {
    console.log('❌ A.X-3.1 모델 연결 실패');
    return;
  }

  console.log('✅ A.X-3.1 모델 연결 성공\n');

  // 테스트 시나리오들
  const testCases = [
    {
      name: 'JavaScript 에러 처리',
      code: `
function divide(a, b) {
  return a / b;
}`,
      task: 'Add comprehensive error handling and input validation'
    },
    {
      name: 'Python 타입 힌트',
      code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`,
      task: 'Add type hints, memoization, and comprehensive docstring'
    },
    {
      name: '한국어 주석 (A.X-3.1 특화)',
      code: `
class Calculator {
  add(a, b) {
    return a + b;
  }
  
  multiply(a, b) {
    return a * b;
  }
}`,
      task: '한국어 주석과 JSDoc을 추가하고 에러 처리를 개선해주세요'
    },
    {
      name: 'Rust 에러 처리',
      code: `
fn divide(a: f64, b: f64) -> f64 {
    a / b
}`,
      task: 'Add proper Result type error handling and documentation'
    }
  ];

  // 각 테스트 케이스 실행
  const results = [];
  
  for (const [index, testCase] of testCases.entries()) {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`${'='.repeat(50)}`);
    
    const startTime = Date.now();
    const result = await ax31CodeBridge.improveCode(testCase.code, testCase.task);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ 성공 (${duration}ms)`);
      console.log('\n원본 코드:');
      console.log(testCase.code.trim());
      console.log('\n개선된 코드:');
      console.log(result.finalCode);
      console.log('\n' + '─'.repeat(80) + '\n');
    } else {
      console.log(`❌ 실패 (${duration}ms): ${result.error}`);
      console.log('─'.repeat(80) + '\n');
    }
    
    results.push({
      testCase: testCase.name,
      success: result.success,
      duration,
      error: result.error || null
    });
  }

  // 결과 요약
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(50));
  
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  const successRate = (successCount / totalTests * 100).toFixed(1);
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
  
  console.log(`총 테스트: ${totalTests}`);
  console.log(`성공: ${successCount}`);
  console.log(`성공률: ${successRate}%`);
  console.log(`평균 응답시간: ${avgDuration.toFixed(0)}ms`);
  
  // 한국어 특화 성능
  const koreanTest = results.find(r => r.testCase.includes('한국어'));
  if (koreanTest) {
    console.log(`\n🇰🇷 한국어 특화 성능: ${koreanTest.success ? '성공' : '실패'} (${koreanTest.duration}ms)`);
  }
  
  console.log('\n✅ A.X-3.1 모델 테스트 완료');
}

// 직접 실행 시
if (require.main === module) {
  testAX31Model().catch(console.error);
}

module.exports = { testAX31Model };