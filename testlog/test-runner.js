/**
 * 다중 언어 모델 테스트 실행기
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');

class MultiLanguageModelTester {
  constructor() {
    this.models = [
      'deepseek-coder:6.7b',
      'starcoder2:3b'
      // 'codellama:7b' // 설치되어 있다면 추가
    ];
    
    this.testScenarios = {
      javascript: {
        basic: {
          code: `
function calculateTotal(items) {
  let total = 0;
  for (let item of items) {
    total += item.price;
  }
  return total;
}`,
          tasks: [
            "Add input validation and error handling",
            "Make the function async and add proper documentation",
            "Add unit price calculation with discount support"
          ]
        },
        class: {
          code: `
class UserService {
  constructor() {
    this.users = [];
  }
  
  addUser(user) {
    this.users.push(user);
  }
  
  getUser(id) {
    return this.users.find(u => u.id === id);
  }
}`,
          tasks: [
            "Add comprehensive error handling and validation",
            "Add caching mechanism using @decorator cache",
            "Make methods async and add proper error responses"
          ]
        }
      },
      
      python: {
        basic: {
          code: `
def process_data(data):
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result`,
          tasks: [
            "Add type hints and docstring",
            "Add input validation and error handling", 
            "Convert to use list comprehension and add logging"
          ]
        },
        class: {
          code: `
class DataProcessor:
    def __init__(self):
        self.data = []
    
    def add_data(self, item):
        self.data.append(item)
    
    def process(self):
        return [x * 2 for x in self.data if x > 0]`,
          tasks: [
            "Add type hints and comprehensive docstrings",
            "Add validation and error handling with custom exceptions",
            "Add logging and performance monitoring"
          ]
        }
      },
      
      'html-css-js': {
        component: {
          code: `
<div class="user-card">
  <h3>User Name</h3>
  <p>User email</p>
  <button onclick="editUser()">Edit</button>
</div>

<style>
.user-card {
  border: 1px solid #ccc;
  padding: 10px;
}
</style>

<script>
function editUser() {
  alert('Edit functionality');
}
</script>`,
          tasks: [
            "Make the component accessible with proper ARIA labels",
            "Add responsive design with mobile-first approach",
            "Convert to modern JavaScript with proper event handling"
          ]
        }
      },
      
      cpp: {
        basic: {
          code: `
#include <vector>
#include <iostream>

class DataManager {
private:
    std::vector<int>* data;
    
public:
    DataManager() {
        data = new std::vector<int>();
    }
    
    void addData(int value) {
        data->push_back(value);
    }
    
    void printData() {
        for(int i = 0; i < data->size(); i++) {
            std::cout << (*data)[i] << " ";
        }
    }
};`,
          tasks: [
            "Convert to use RAII pattern with smart pointers",
            "Add exception safety and proper error handling",
            "Add const correctness and modern C++ features"
          ]
        }
      },
      
      rust: {
        basic: {
          code: `
pub struct DataProcessor {
    data: Vec<i32>,
}

impl DataProcessor {
    pub fn new() -> DataProcessor {
        DataProcessor { data: Vec::new() }
    }
    
    pub fn add(&mut self, value: i32) {
        self.data.push(value);
    }
    
    pub fn process(&self) -> Vec<i32> {
        let mut result = Vec::new();
        for item in &self.data {
            if *item > 0 {
                result.push(*item * 2);
            }
        }
        result
    }
}`,
          tasks: [
            "Add proper error handling with Result types",
            "Optimize using iterators and functional programming",
            "Add lifetime annotations and borrowing optimizations"
          ]
        }
      }
    };
  }
  
  async runAllTests() {
    console.log('🚀 다중 언어 모델 테스트 시작\\n');
    
    for (const model of this.models) {
      console.log(`\\n${'='.repeat(60)}`);
      console.log(`🤖 모델 테스트: ${model}`);
      console.log(`${'='.repeat(60)}\\n`);
      
      for (const [language, scenarios] of Object.entries(this.testScenarios)) {
        console.log(`\\n📁 언어: ${language.toUpperCase()}`);
        console.log(`${'-'.repeat(40)}`);
        
        for (const [scenarioName, scenario] of Object.entries(scenarios)) {
          await this.runScenarioTest(model, language, scenarioName, scenario);
        }
      }
    }
    
    console.log('\\n✅ 모든 테스트 완료');
    await this.generateComparisonReport();
  }
  
  async runScenarioTest(model, language, scenarioName, scenario) {
    console.log(`\\n🧪 시나리오: ${scenarioName}`);
    
    const ollamaCodeBridge = new OllamaCodeBridge({ 
      model,
      temperature: 0.3 
    });
    
    const results = [];
    let currentCode = scenario.code;
    
    for (let i = 0; i < scenario.tasks.length; i++) {
      const task = scenario.tasks[i];
      console.log(`\\n  📝 작업 ${i + 1}: ${task}`);
      
      const startTime = Date.now();
      
      try {
        const result = await ollamaCodeBridge.improveCode(currentCode, task);
        const duration = Date.now() - startTime;
        
        const testResult = {
          timestamp: new Date().toISOString(),
          model,
          language,
          scenario: scenarioName,
          taskIndex: i + 1,
          task,
          originalCode: currentCode,
          success: result.success,
          duration,
          rawResponse: result.rawResponse,
          improvedSnippet: result.improvedSnippet,
          finalCode: result.finalCode,
          error: result.error
        };
        
        results.push(testResult);
        
        if (result.success) {
          console.log(`    ✅ 성공 (${duration}ms)`);
          currentCode = result.finalCode;
        } else {
          console.log(`    ❌ 실패: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`    💥 예외: ${error.message}`);
        results.push({
          timestamp: new Date().toISOString(),
          model,
          language, 
          scenario: scenarioName,
          taskIndex: i + 1,
          task,
          originalCode: currentCode,
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        });
      }
    }
    
    // 결과 저장
    await this.saveTestResults(model, language, scenarioName, results);
    
    // 성공률 출력
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / results.length * 100).toFixed(1);
    console.log(`\\n  📊 성공률: ${successCount}/${results.length} (${successRate}%)`);
  }
  
  async saveTestResults(model, language, scenarioName, results) {
    const dirPath = path.join(__dirname, model.replace(':', '-'), language);
    const filePath = path.join(dirPath, `${scenarioName}-${Date.now()}.json`);
    
    try {
      await fs.mkdir(dirPath, { recursive: true });
      
      const reportData = {
        metadata: {
          model,
          language,
          scenario: scenarioName,
          timestamp: new Date().toISOString(),
          totalTests: results.length,
          successCount: results.filter(r => r.success).length,
          successRate: results.filter(r => r.success).length / results.length,
          averageDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
        },
        results
      };
      
      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
      console.log(`    💾 결과 저장: ${filePath}`);
      
    } catch (error) {
      console.error(`    ❌ 저장 실패: ${error.message}`);
    }
  }
  
  async generateComparisonReport() {
    console.log('\\n📊 비교 리포트 생성 중...');
    
    const reportPath = path.join(__dirname, 'comparison-reports', `comparison-${Date.now()}.md`);
    
    let report = `# 다중 언어 모델 테스트 비교 리포트\\n\\n`;
    report += `생성 시간: ${new Date().toISOString()}\\n\\n`;
    
    // 각 모델별 디렉토리 스캔하여 결과 수집
    for (const model of this.models) {
      report += `## ${model} 모델 결과\\n\\n`;
      
      const modelDir = path.join(__dirname, model.replace(':', '-'));
      
      try {
        const languages = await fs.readdir(modelDir);
        
        for (const language of languages) {
          report += `### ${language.toUpperCase()}\\n\\n`;
          
          const languageDir = path.join(modelDir, language);
          const files = await fs.readdir(languageDir);
          
          for (const file of files.filter(f => f.endsWith('.json'))) {
            const filePath = path.join(languageDir, file);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            report += `**시나리오**: ${data.metadata.scenario}\\n`;
            report += `- 성공률: ${(data.metadata.successRate * 100).toFixed(1)}%\\n`;
            report += `- 평균 응답 시간: ${data.metadata.averageDuration.toFixed(0)}ms\\n`;
            report += `- 총 테스트: ${data.metadata.totalTests}\\n\\n`;
          }
        }
      } catch (error) {
        report += `❌ 모델 결과 로드 실패: ${error.message}\\n\\n`;
      }
    }
    
    await fs.writeFile(reportPath, report);
    console.log(`📋 비교 리포트 저장: ${reportPath}`);
  }
}

// 실행
if (require.main === module) {
  const tester = new MultiLanguageModelTester();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
사용법:
  node test-runner.js                     전체 테스트 실행
  node test-runner.js --model deepseek    특정 모델만 테스트
  node test-runner.js --lang javascript   특정 언어만 테스트
  node test-runner.js --help              도움말 표시
    `);
  } else {
    tester.runAllTests().catch(console.error);
  }
}

module.exports = MultiLanguageModelTester;