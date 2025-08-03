/**
 * A.X-3.1 모델 비교 테스트
 * SKT A.X-3.1 vs 기존 모델들 (DeepSeek Coder, StarCoder2) 성능 비교
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');
const HuggingFaceCodeBridge = require('../integrations/huggingface-integration');

class AX31ComparisonTester {
  constructor() {
    // 테스트할 모델들
    this.ollamaModels = [
      'deepseek-coder:6.7b',
      'starcoder2:3b',
      'qwen2.5-coder:7b'  // 추가된 모델
    ];
    
    this.huggingfaceModels = [
      'skt/A.X-3.1'
    ];
    
    // 특별히 A.X-3.1의 한국어 능력을 테스트하기 위한 시나리오 추가
    this.testScenarios = {
      javascript: {
        'error-handling': {
          code: `
function divide(a, b) {
  return a / b;
}`,
          task: "Add comprehensive error handling and input validation"
        },
        'async-await': {
          code: `
function fetchUserData(userId) {
  return fetch('/api/users/' + userId)
    .then(response => response.json())
    .then(data => data);
}`,
          task: "Convert to async/await with proper error handling"
        },
        'korean-comments': {
          code: `
class Calculator {
  add(a, b) {
    return a + b;
  }
  
  multiply(a, b) {
    return a * b;
  }
}`,
          task: "한국어 주석과 JSDoc을 추가하고 에러 처리를 개선해주세요"
        }
      },
      
      python: {
        'type-hints': {
          code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`,
          task: "Add type hints, memoization, and comprehensive docstring"
        },
        'exception-handling': {
          code: `
def read_file(filename):
    file = open(filename, 'r')
    content = file.read()
    file.close()
    return content`,
          task: "Add proper exception handling and use context managers"
        },
        'korean-docstring': {
          code: `
class BankAccount:
    def __init__(self, balance=0):
        self.balance = balance
    
    def deposit(self, amount):
        self.balance += amount
    
    def withdraw(self, amount):
        if amount <= self.balance:
            self.balance -= amount
            return True
        return False`,
          task: "한국어 독스트링을 추가하고 타입 힌트와 에러 처리를 개선해주세요"
        }
      },
      
      rust: {
        'error-handling': {
          code: `
fn divide(a: f64, b: f64) -> f64 {
    a / b
}`,
          task: "Add proper Result type error handling and documentation"
        },
        'ownership': {
          code: `
struct Person {
    name: String,
    age: u32,
}

fn process_person(person: Person) -> String {
    format!("Name: {}, Age: {}", person.name, person.age)
}`,
          task: "Optimize borrowing and add proper ownership handling"
        }
      }
    };
  }

  async runComparison() {
    console.log('🚀 A.X-3.1 모델 비교 테스트 시작\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      models: {},
      summary: {}
    };

    // HuggingFace 모델 테스트 (A.X-3.1)
    for (const model of this.huggingfaceModels) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🤖 HuggingFace 모델 테스트: ${model}`);
      console.log(`${'='.repeat(60)}\n`);
      
      const modelResults = await this.testHuggingFaceModel(model);
      results.models[model] = modelResults;
    }

    // Ollama 모델 테스트
    for (const model of this.ollamaModels) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🤖 Ollama 모델 테스트: ${model}`);
      console.log(`${'='.repeat(60)}\n`);
      
      const modelResults = await this.testOllamaModel(model);
      results.models[model] = modelResults;
    }

    // 결과 분석 및 저장
    results.summary = this.analyzResults(results.models);
    await this.saveComparisonResults(results);
    
    // 최종 리포트 출력
    this.printFinalReport(results);
    
    console.log('\n✅ A.X-3.1 비교 테스트 완료');
  }

  async testHuggingFaceModel(model) {
    const hfCodeBridge = new HuggingFaceCodeBridge({ 
      model,
      temperature: 0.3 
    });

    // 연결 테스트
    const connectionTest = await hfCodeBridge.testConnection();
    if (!connectionTest) {
      console.log(`❌ ${model} 연결 실패 - HF_API_TOKEN 환경변수를 확인하세요`);
      return { connectionFailed: true, results: [] };
    }

    const modelResults = {
      model,
      type: 'huggingface',
      results: [],
      stats: {}
    };

    for (const [language, scenarios] of Object.entries(this.testScenarios)) {
      console.log(`\n📁 언어: ${language.toUpperCase()}`);
      console.log(`${'-'.repeat(40)}`);
      
      for (const [scenarioName, scenario] of Object.entries(scenarios)) {
        console.log(`\n🧪 시나리오: ${scenarioName}`);
        
        const result = await hfCodeBridge.improveCode(scenario.code, scenario.task);
        result.language = language;
        result.scenario = scenarioName;
        
        modelResults.results.push(result);
        
        if (result.success) {
          console.log(`  ✅ 성공 (${result.duration}ms)`);
        } else {
          console.log(`  ❌ 실패: ${result.error}`);
        }
      }
    }

    modelResults.stats = this.calculateStats(modelResults.results);
    return modelResults;
  }

  async testOllamaModel(model) {
    const ollamaCodeBridge = new OllamaCodeBridge({ 
      model,
      temperature: 0.3 
    });

    const modelResults = {
      model,
      type: 'ollama',
      results: [],
      stats: {}
    };

    for (const [language, scenarios] of Object.entries(this.testScenarios)) {
      console.log(`\n📁 언어: ${language.toUpperCase()}`);
      console.log(`${'-'.repeat(40)}`);
      
      for (const [scenarioName, scenario] of Object.entries(scenarios)) {
        console.log(`\n🧪 시나리오: ${scenarioName}`);
        
        try {
          const result = await ollamaCodeBridge.improveCode(scenario.code, scenario.task);
          result.language = language;
          result.scenario = scenarioName;
          
          modelResults.results.push(result);
          
          if (result.success) {
            console.log(`  ✅ 성공 (${result.duration}ms)`);
          } else {
            console.log(`  ❌ 실패: ${result.error}`);
          }
          
        } catch (error) {
          console.log(`  💥 예외: ${error.message}`);
          modelResults.results.push({
            success: false,
            error: error.message,
            language,
            scenario: scenarioName,
            model,
            duration: 0
          });
        }
      }
    }

    modelResults.stats = this.calculateStats(modelResults.results);
    return modelResults;
  }

  calculateStats(results) {
    const totalTests = results.length;
    const successCount = results.filter(r => r.success).length;
    const successRate = totalTests > 0 ? (successCount / totalTests * 100) : 0;
    const avgDuration = totalTests > 0 ? 
      results.reduce((sum, r) => sum + (r.duration || 0), 0) / totalTests : 0;
    
    const languageStats = {};
    const scenarioStats = {};
    
    // 언어별 통계
    results.forEach(result => {
      if (!languageStats[result.language]) {
        languageStats[result.language] = { total: 0, success: 0 };
      }
      languageStats[result.language].total++;
      if (result.success) languageStats[result.language].success++;
    });
    
    // 시나리오별 통계
    results.forEach(result => {
      if (!scenarioStats[result.scenario]) {
        scenarioStats[result.scenario] = { total: 0, success: 0 };
      }
      scenarioStats[result.scenario].total++;
      if (result.success) scenarioStats[result.scenario].success++;
    });

    return {
      totalTests,
      successCount,
      successRate: parseFloat(successRate.toFixed(1)),
      avgDuration: parseFloat(avgDuration.toFixed(0)),
      languageStats,
      scenarioStats
    };
  }

  analyzResults(modelResults) {
    const summary = {
      rankings: {},
      bestPerLanguage: {},
      bestPerScenario: {},
      koreanPerformance: {}
    };

    const models = Object.keys(modelResults);
    
    // 전체 성능 순위
    summary.rankings.overall = models
      .filter(model => !modelResults[model].connectionFailed)
      .map(model => ({
        model,
        successRate: modelResults[model].stats.successRate,
        avgDuration: modelResults[model].stats.avgDuration
      }))
      .sort((a, b) => b.successRate - a.successRate || a.avgDuration - b.avgDuration);

    // 언어별 최고 성능 모델
    const languages = ['javascript', 'python', 'rust'];
    languages.forEach(lang => {
      const langPerformance = models
        .filter(model => !modelResults[model].connectionFailed)
        .map(model => {
          const langStats = modelResults[model].stats.languageStats[lang];
          return {
            model,
            successRate: langStats ? (langStats.success / langStats.total * 100) : 0
          };
        })
        .sort((a, b) => b.successRate - a.successRate);
      
      summary.bestPerLanguage[lang] = langPerformance[0];
    });

    // 한국어 관련 태스크 성능
    models.forEach(model => {
      if (modelResults[model].connectionFailed) return;
      
      const koreanTasks = modelResults[model].results.filter(r => 
        r.task && r.task.includes('한국어')
      );
      
      if (koreanTasks.length > 0) {
        const koreanSuccess = koreanTasks.filter(r => r.success).length;
        summary.koreanPerformance[model] = {
          total: koreanTasks.length,
          success: koreanSuccess,
          successRate: parseFloat((koreanSuccess / koreanTasks.length * 100).toFixed(1))
        };
      }
    });

    return summary;
  }

  async saveComparisonResults(results) {
    const timestamp = Date.now();
    const reportDir = path.join(__dirname, 'ax31-comparison-reports');
    
    try {
      await fs.mkdir(reportDir, { recursive: true });
      
      // JSON 결과 저장
      const jsonPath = path.join(reportDir, `ax31-comparison-${timestamp}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
      
      // Markdown 리포트 생성
      const mdPath = path.join(reportDir, `ax31-comparison-${timestamp}.md`);
      const markdownReport = this.generateMarkdownReport(results);
      await fs.writeFile(mdPath, markdownReport);
      
      console.log(`\n💾 결과 저장 완료:`);
      console.log(`  - JSON: ${jsonPath}`);
      console.log(`  - Markdown: ${mdPath}`);
      
    } catch (error) {
      console.error('❌ 결과 저장 실패:', error.message);
    }
  }

  generateMarkdownReport(results) {
    let report = `# A.X-3.1 모델 비교 테스트 리포트\n\n`;
    report += `**생성 시간**: ${new Date(results.timestamp).toLocaleString('ko-KR')}\n\n`;
    
    // 전체 순위
    report += `## 🏆 전체 성능 순위\n\n`;
    report += `| 순위 | 모델 | 성공률 | 평균 응답시간 |\n`;
    report += `|------|------|--------|---------------|\n`;
    
    results.summary.rankings.overall.forEach((model, index) => {
      report += `| ${index + 1} | ${model.model} | ${model.successRate}% | ${model.avgDuration}ms |\n`;
    });
    
    // 언어별 최고 성능
    report += `\n## 📋 언어별 최고 성능 모델\n\n`;
    Object.entries(results.summary.bestPerLanguage).forEach(([lang, best]) => {
      report += `- **${lang.toUpperCase()}**: ${best.model} (${best.successRate.toFixed(1)}%)\n`;
    });
    
    // 한국어 성능 비교
    if (Object.keys(results.summary.koreanPerformance).length > 0) {
      report += `\n## 🇰🇷 한국어 태스크 성능\n\n`;
      report += `| 모델 | 한국어 태스크 성공률 | 총 테스트 |\n`;
      report += `|------|-------------------|----------|\n`;
      
      Object.entries(results.summary.koreanPerformance).forEach(([model, perf]) => {
        report += `| ${model} | ${perf.successRate}% | ${perf.success}/${perf.total} |\n`;
      });
    }
    
    // 모델별 상세 결과
    report += `\n## 📊 모델별 상세 결과\n\n`;
    
    Object.entries(results.models).forEach(([model, data]) => {
      if (data.connectionFailed) {
        report += `### ${model} ❌ 연결 실패\n\n`;
        return;
      }
      
      report += `### ${model}\n\n`;
      report += `- **전체 성공률**: ${data.stats.successRate}%\n`;
      report += `- **평균 응답시간**: ${data.stats.avgDuration}ms\n`;
      report += `- **총 테스트**: ${data.stats.successCount}/${data.stats.totalTests}\n\n`;
      
      // 언어별 세부 성능
      report += `**언어별 성능**:\n`;
      Object.entries(data.stats.languageStats).forEach(([lang, stats]) => {
        const rate = (stats.success / stats.total * 100).toFixed(1);
        report += `- ${lang}: ${rate}% (${stats.success}/${stats.total})\n`;
      });
      report += `\n`;
    });
    
    return report;
  }

  printFinalReport(results) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏆 A.X-3.1 비교 테스트 최종 결과`);
    console.log(`${'='.repeat(80)}\n`);
    
    // 전체 순위 출력
    console.log(`📊 전체 성능 순위:`);
    results.summary.rankings.overall.forEach((model, index) => {
      const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${trophy} ${index + 1}. ${model.model}: ${model.successRate}% (${model.avgDuration}ms)`);
    });
    
    // 한국어 성능
    if (Object.keys(results.summary.koreanPerformance).length > 0) {
      console.log(`\n🇰🇷 한국어 태스크 성능:`);
      Object.entries(results.summary.koreanPerformance).forEach(([model, perf]) => {
        console.log(`  ${model}: ${perf.successRate}% (${perf.success}/${perf.total})`);
      });
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
  }
}

// 실행
if (require.main === module) {
  const tester = new AX31ComparisonTester();
  
  // HuggingFace API 토큰 확인
  if (!process.env.HF_API_TOKEN) {
    console.log(`⚠️  HuggingFace API 토큰이 설정되지 않았습니다.`);
    console.log(`A.X-3.1 모델 테스트를 위해 다음 명령어로 토큰을 설정하세요:`);
    console.log(`export HF_API_TOKEN=your_token_here`);
    console.log(`\n기존 Ollama 모델들만 테스트를 진행합니다...\n`);
  }
  
  tester.runComparison().catch(console.error);
}

module.exports = AX31ComparisonTester;