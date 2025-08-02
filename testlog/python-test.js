/**
 * Python 코드 테스트 실행기
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');

async function runPythonTest() {
  console.log('🐍 Python 코드 테스트 시작\n');
  
  const models = ['deepseek-coder:6.7b', 'starcoder2:3b'];
  
  // Python 테스트 케이스
  const testCases = [
    {
      name: 'basic-function',
      code: `
def calculate_average(numbers):
    total = sum(numbers)
    return total / len(numbers)`,
      task: "Add type hints, docstring, and error handling for empty list"
    },
    {
      name: 'class-method',
      code: `
class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(result)
        return result`,
      task: "Add type hints, comprehensive docstrings, and input validation"
    }
  ];
  
  const allResults = [];
  
  for (const model of models) {
    console.log(`\n🤖 테스트 중: ${model}`);
    console.log('='.repeat(50));
    
    for (const testCase of testCases) {
      console.log(`\n📋 테스트 케이스: ${testCase.name}`);
      console.log('-'.repeat(30));
      
      try {
        const ollamaCodeBridge = new OllamaCodeBridge({ 
          model,
          temperature: 0.3 
        });
        
        const startTime = Date.now();
        const result = await ollamaCodeBridge.improveCode(
          testCase.code, 
          testCase.task,
          { debug: true }
        );
        const duration = Date.now() - startTime;
        
        const testResult = {
          timestamp: new Date().toISOString(),
          model,
          language: 'python',
          testCase: testCase.name,
          success: result.success,
          duration,
          originalCode: testCase.code,
          task: testCase.task,
          rawResponse: result.rawResponse,
          improvedSnippet: result.improvedSnippet,
          finalCode: result.finalCode,
          error: result.error
        };
        
        allResults.push(testResult);
        
        if (result.success) {
          console.log(`✅ 성공! (${duration}ms)`);
          console.log('\n--- 최종 결과 ---');
          console.log(result.finalCode);
          
          // Python 특화 분석
          const hasTypeHints = result.finalCode.includes('->') || result.finalCode.includes(': ');
          const hasDocstring = result.finalCode.includes('"""') || result.finalCode.includes("'''");
          const hasErrorHandling = result.finalCode.includes('raise') || result.finalCode.includes('except');
          
          console.log('\n📊 Python 코드 품질 분석:');
          console.log(`  타입 힌트: ${hasTypeHints ? '✅' : '❌'}`);
          console.log(`  독스트링: ${hasDocstring ? '✅' : '❌'}`);
          console.log(`  에러 처리: ${hasErrorHandling ? '✅' : '❌'}`);
          
          testResult.qualityMetrics = {
            hasTypeHints,
            hasDocstring,
            hasErrorHandling
          };
          
        } else {
          console.log(`❌ 실패: ${result.error}`);
        }
        
        // 개별 결과 저장
        const modelDir = model.replace(':', '-');
        const logDir = path.join(__dirname, modelDir, 'python');
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, `${testCase.name}-${Date.now()}.json`);
        await fs.writeFile(logFile, JSON.stringify(testResult, null, 2));
        console.log(`💾 로그 저장: ${logFile}`);
        
      } catch (error) {
        console.error(`💥 오류: ${error.message}`);
        allResults.push({
          timestamp: new Date().toISOString(),
          model,
          language: 'python',
          testCase: testCase.name,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  // 비교 결과 요약
  console.log('\n📊 Python 테스트 요약');
  console.log('='.repeat(60));
  
  const summary = {};
  for (const result of allResults) {
    if (!summary[result.model]) {
      summary[result.model] = {
        total: 0,
        success: 0,
        avgDuration: 0,
        qualityScores: []
      };
    }
    
    summary[result.model].total++;
    if (result.success) {
      summary[result.model].success++;
      summary[result.model].avgDuration += result.duration || 0;
      
      if (result.qualityMetrics) {
        const score = Object.values(result.qualityMetrics).filter(Boolean).length;
        summary[result.model].qualityScores.push(score);
      }
    }
  }
  
  for (const [model, stats] of Object.entries(summary)) {
    console.log(`\n${model}:`);
    console.log(`  성공률: ${stats.success}/${stats.total} (${(stats.success/stats.total*100).toFixed(1)}%)`);
    if (stats.success > 0) {
      console.log(`  평균 응답 시간: ${(stats.avgDuration/stats.success).toFixed(0)}ms`);
      if (stats.qualityScores.length > 0) {
        const avgQuality = stats.qualityScores.reduce((a,b) => a+b, 0) / stats.qualityScores.length;
        console.log(`  평균 품질 점수: ${avgQuality.toFixed(1)}/3.0`);
      }
    }
  }
  
  // 종합 결과 저장
  const summaryPath = path.join(__dirname, 'comparison-reports', `python-test-${Date.now()}.json`);
  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, JSON.stringify({
    testType: 'python-test',
    timestamp: new Date().toISOString(),
    testCases,
    results: allResults,
    summary
  }, null, 2));
  
  console.log(`\n💾 종합 결과 저장: ${summaryPath}`);
  console.log('\n✅ Python 테스트 완료!');
}

// 실행
if (require.main === module) {
  runPythonTest().catch(console.error);
}

module.exports = runPythonTest;