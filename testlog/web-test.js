/**
 * HTML/CSS/JS 웹 테스트 실행기
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');

async function runWebTest() {
  console.log('🌐 웹 기술 테스트 시작\n');
  
  const models = ['deepseek-coder:6.7b', 'starcoder2:3b'];
  
  // 웹 테스트 케이스
  const testCases = [
    {
      name: 'simple-html',
      code: `
<div class="card">
  <h2>Title</h2>
  <p>Content</p>
  <button onclick="doSomething()">Click me</button>
</div>`,
      task: "Add accessibility attributes and proper semantic HTML"
    },
    {
      name: 'css-styling',
      code: `
.card {
  width: 200px;
  padding: 10px;
  border: 1px solid gray;
}`,
      task: "Make it responsive and add modern CSS features"
    },
    {
      name: 'javascript-function',
      code: `
function validateForm(form) {
  let isValid = true;
  if (!form.email.value) {
    isValid = false;
  }
  return isValid;
}`,
      task: "Add comprehensive validation and modern JavaScript patterns"
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
          language: 'web',
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
          
          // 웹 특화 분석
          let qualityMetrics = {};
          
          if (testCase.name === 'simple-html') {
            qualityMetrics = {
              hasAriaLabels: result.finalCode.includes('aria-'),
              hasSemanticHTML: result.finalCode.includes('<main>') || result.finalCode.includes('<section>'),
              hasProperStructure: result.finalCode.includes('role=') || result.finalCode.includes('tabindex')
            };
          } else if (testCase.name === 'css-styling') {
            qualityMetrics = {
              hasMediaQueries: result.finalCode.includes('@media'),
              hasFlexbox: result.finalCode.includes('flex'),
              hasModernFeatures: result.finalCode.includes('var(') || result.finalCode.includes('calc(')
            };
          } else if (testCase.name === 'javascript-function') {
            qualityMetrics = {
              hasConstLet: result.finalCode.includes('const ') || result.finalCode.includes('let '),
              hasArrowFunctions: result.finalCode.includes('=>'),
              hasAsyncAwait: result.finalCode.includes('async') || result.finalCode.includes('await')
            };
          }
          
          console.log('\n📊 웹 코드 품질 분석:');
          for (const [key, value] of Object.entries(qualityMetrics)) {
            console.log(`  ${key}: ${value ? '✅' : '❌'}`);
          }
          
          testResult.qualityMetrics = qualityMetrics;
          
        } else {
          console.log(`❌ 실패: ${result.error}`);
        }
        
        // 개별 결과 저장
        const modelDir = model.replace(':', '-');
        const logDir = path.join(__dirname, modelDir, 'html-css-js');
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, `${testCase.name}-${Date.now()}.json`);
        await fs.writeFile(logFile, JSON.stringify(testResult, null, 2));
        console.log(`💾 로그 저장: ${logFile}`);
        
      } catch (error) {
        console.error(`💥 오류: ${error.message}`);
        allResults.push({
          timestamp: new Date().toISOString(),
          model,
          language: 'web',
          testCase: testCase.name,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  // 비교 결과 요약
  console.log('\n📊 웹 기술 테스트 요약');
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
  const summaryPath = path.join(__dirname, 'comparison-reports', `web-test-${Date.now()}.json`);
  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, JSON.stringify({
    testType: 'web-test',
    timestamp: new Date().toISOString(),
    testCases,
    results: allResults,
    summary
  }, null, 2));
  
  console.log(`\n💾 종합 결과 저장: ${summaryPath}`);
  console.log('\n✅ 웹 기술 테스트 완료!');
}

// 실행
if (require.main === module) {
  runWebTest().catch(console.error);
}

module.exports = runWebTest;