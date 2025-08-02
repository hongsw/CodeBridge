/**
 * 웹 기술 통합 테스트
 */

const OllamaCodeBridge = require('./integrations/ollama-integration');

async function testWebIntegration() {
  console.log('🌐 웹 기술 통합 테스트 시작');
  
  const ollamaCodeBridge = new OllamaCodeBridge({
    model: 'deepseek-coder:6.7b',
    temperature: 0.3
  });

  // 테스트 케이스들
  const testCases = [
    {
      name: 'HTML 접근성 개선',
      originalCode: `<form>
  <input type="text" placeholder="Email">
  <input type="password" placeholder="Password">
  <button>Login</button>
</form>`,
      instruction: 'Add proper labels, ARIA attributes, and semantic HTML',
      expectedType: 'html'
    },
    {
      name: 'CSS 반응형 디자인',
      originalCode: `.container {
  width: 1200px;
  margin: 0 auto;
}

.card {
  width: 300px;
  float: left;
  margin: 10px;
}`,
      instruction: 'Make responsive with flexbox/grid and mobile-first approach',
      expectedType: 'css'
    },
    {
      name: 'JavaScript 인터랙션',
      originalCode: `function toggleMenu() {
  // empty function
}`,
      instruction: 'Add complete menu toggle functionality with DOM manipulation',
      expectedType: 'javascript'
    }
  ];

  let successCount = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n📝 테스트: ${testCase.name}`);
    console.log(`🎯 예상 타입: ${testCase.expectedType}`);
    
    try {
      const result = await ollamaCodeBridge.improveCode(
        testCase.originalCode,
        testCase.instruction,
        { fileType: testCase.expectedType }
      );

      console.log(`✅ 성공: ${testCase.name}`);
      console.log(`📦 결과 길이: ${result.finalCode.length} 문자`);
      console.log(`🔍 향상된 코드:`);
      console.log('---');
      console.log(result.finalCode);
      console.log('---');
      
      // 성공 여부 판단 (빈 결과가 아님)
      if (result.finalCode && result.finalCode.trim().length > 0) {
        successCount++;
        console.log(`✅ ${testCase.name} 성공`);
      } else {
        console.log(`❌ ${testCase.name} 실패: 빈 결과`);
      }

    } catch (error) {
      console.error(`❌ ${testCase.name} 오류:`, error.message);
    }
  }

  // 결과 요약
  console.log(`\n📊 웹 기술 테스트 결과`);
  console.log(`성공: ${successCount}/${totalTests} (${(successCount/totalTests*100).toFixed(1)}%)`);
  
  if (successCount === totalTests) {
    console.log('🎉 모든 웹 기술 테스트 통과!');
  } else {
    console.log(`⚠️ ${totalTests - successCount}개 테스트 실패`);
  }

  return {
    successCount,
    totalTests,
    successRate: successCount / totalTests * 100
  };
}

// 실행
if (require.main === module) {
  testWebIntegration()
    .then(result => {
      console.log(`\n🏁 테스트 완료: ${result.successRate.toFixed(1)}% 성공률`);
      process.exit(result.successCount === result.totalTests ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 테스트 실행 오류:', error);
      process.exit(1);
    });
}

module.exports = { testWebIntegration };