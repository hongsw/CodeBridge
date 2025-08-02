/**
 * 빠른 모델 테스트 실행기 - JavaScript만 테스트
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');

async function runQuickTest() {
  console.log('🚀 빠른 JavaScript 테스트 시작\n');
  
  const models = ['deepseek-coder:6.7b', 'starcoder2:3b'];
  
  // 간단한 JavaScript 테스트 케이스
  const testCase = {
    originalCode: `
function calculateDiscount(price, discountPercent) {
  return price - (price * discountPercent / 100);
}`,
    task: "Add input validation and error handling"
  };
  
  const results = [];
  
  for (const model of models) {
    console.log(`\n🤖 테스트 중: ${model}`);
    console.log('-'.repeat(50));
    
    try {
      const ollamaCodeBridge = new OllamaCodeBridge({ 
        model,
        temperature: 0.3 
      });
      
      const startTime = Date.now();
      const result = await ollamaCodeBridge.improveCode(
        testCase.originalCode, 
        testCase.task,
        { debug: true }
      );
      const duration = Date.now() - startTime;
      
      const testResult = {
        timestamp: new Date().toISOString(),
        model,
        success: result.success,
        duration,
        originalCode: testCase.originalCode,
        task: testCase.task,
        rawResponse: result.rawResponse,
        improvedSnippet: result.improvedSnippet,
        finalCode: result.finalCode,
        error: result.error
      };
      
      results.push(testResult);
      
      if (result.success) {
        console.log(`✅ 성공! (${duration}ms)`);
        console.log('\n--- 최종 결과 ---');
        console.log(result.finalCode);
      } else {
        console.log(`❌ 실패: ${result.error}`);
      }
      
      // 개별 결과 저장
      const modelDir = model.replace(':', '-');
      const logDir = path.join(__dirname, modelDir, 'javascript');
      await fs.mkdir(logDir, { recursive: true });
      
      const logFile = path.join(logDir, `quick-test-${Date.now()}.json`);
      await fs.writeFile(logFile, JSON.stringify(testResult, null, 2));
      console.log(`💾 로그 저장: ${logFile}`);
      
    } catch (error) {
      console.error(`💥 오류: ${error.message}`);
      results.push({
        timestamp: new Date().toISOString(),
        model,
        success: false,
        error: error.message
      });
    }
  }
  
  // 비교 결과 요약
  console.log('\n📊 테스트 요약');
  console.log('='.repeat(60));
  
  for (const result of results) {
    console.log(`\n${result.model}:`);
    console.log(`  성공: ${result.success ? '✅' : '❌'}`);
    if (result.success) {
      console.log(`  응답 시간: ${result.duration}ms`);
      console.log(`  코드 길이: ${result.finalCode?.length || 0} 문자`);
    } else {
      console.log(`  오류: ${result.error}`);
    }
  }
  
  // 종합 결과 저장
  const summaryPath = path.join(__dirname, 'comparison-reports', `quick-test-${Date.now()}.json`);
  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, JSON.stringify({
    testType: 'quick-javascript-test',
    timestamp: new Date().toISOString(),
    testCase,
    results
  }, null, 2));
  
  console.log(`\n💾 종합 결과 저장: ${summaryPath}`);
  console.log('\n✅ 빠른 테스트 완료!');
}

// 실행
if (require.main === module) {
  runQuickTest().catch(console.error);
}

module.exports = runQuickTest;