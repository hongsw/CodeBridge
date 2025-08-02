/**
 * 포괄적 다중 언어 테스트 실행기
 * 다양한 복잡도와 시나리오로 모든 언어 테스트
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');

// 개선된 다중 언어 전처리기
function multiLanguagePreprocessor(response, language = 'javascript') {
  // 언어별 코드 블록 패턴
  const languagePatterns = {
    javascript: [
      /```(?:javascript|js|jsx|typescript|ts)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ],
    python: [
      /```(?:python|py)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ],
    rust: [
      /```(?:rust|rs)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ],
    cpp: [
      /```(?:cpp|c\+\+|c|cxx)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ],
    html: [
      /```(?:html|htm)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ],
    css: [
      /```(?:css|scss|sass)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ]
  };
  
  const patterns = languagePatterns[language] || languagePatterns.javascript;
  
  // 코드 블록 추출
  for (const pattern of patterns) {
    const matches = [...response.matchAll(pattern)];
    if (matches.length > 0) {
      const longestMatch = matches.reduce((prev, current) => 
        current[1].length > prev[1].length ? current : prev
      );
      return longestMatch[1].trim();
    }
  }
  
  // 언어별 직접 추출
  return extractCodeDirectly(response, language);
}

function extractCodeDirectly(response, language) {
  const lines = response.split('\n');
  const codeLines = [];
  let inCode = false;
  
  const languageMarkers = {
    python: {
      start: /^(def |class |from |import |@|if __name__|async def )/,
      keywords: /\b(def|class|import|from|if|for|while|return|raise|try|except|with|as)\b/
    },
    javascript: {
      start: /^(function |class |const |let |var |async function |export |import )/,
      keywords: /\b(function|class|const|let|var|if|for|while|return|throw|try|catch)\b/
    },
    rust: {
      start: /^(fn |struct |impl |use |pub |mod |trait |enum )/,
      keywords: /\b(fn|struct|impl|use|if|for|while|return|match|pub|mod|let|mut)\b/
    },
    cpp: {
      start: /^(class |struct |void |int |template |#include |namespace )/,
      keywords: /\b(class|struct|int|void|if|for|while|return|throw|try|catch|template)\b/
    }
  };
  
  const markers = languageMarkers[language] || languageMarkers.javascript;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!inCode && markers.start.test(trimmed)) {
      inCode = true;
      codeLines.push(line);
    } else if (inCode) {
      codeLines.push(line);
      
      // 연속 빈 줄로 끝 감지
      if (trimmed === '' && i > 0 && lines[i-1].trim() === '') {
        break;
      }
    }
  }
  
  return codeLines.join('\n').trim();
}

class ComprehensiveMultiLanguageTester {
  constructor() {
    this.models = ['deepseek-coder:6.7b', 'starcoder2:3b'];
    
    // 포괄적 테스트 케이스 - 다양한 복잡도
    this.testScenarios = {
      javascript: [
        {
          name: 'basic-validation',
          code: `function divide(a, b) {
  return a / b;
}`,
          task: 'Add zero division check and type validation'
        },
        {
          name: 'async-error-handling',
          code: `async function fetchUserData(userId) {
  const response = await fetch('/api/users/' + userId);
  const data = await response.json();
  return data;
}`,
          task: 'Add comprehensive error handling and retry logic'
        },
        {
          name: 'class-optimization',
          code: `class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
}`,
          task: 'Add off method, once method, and error handling'
        }
      ],
      
      python: [
        {
          name: 'basic-function',
          code: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`,
          task: 'Add memoization, type hints, and docstring'
        },
        {
          name: 'data-processing',
          code: `def process_csv(filename):
    data = []
    with open(filename, 'r') as f:
        for line in f:
            data.append(line.strip().split(','))
    return data`,
          task: 'Add error handling, CSV library usage, and type hints'
        },
        {
          name: 'class-improvement',
          code: `class Stack:
    def __init__(self):
        self.items = []
    
    def push(self, item):
        self.items.append(item)
    
    def pop(self):
        return self.items.pop()`,
          task: 'Add empty check, peek method, size property, and type hints'
        }
      ],
      
      rust: [
        {
          name: 'basic-safety',
          code: `fn divide(a: f64, b: f64) -> f64 {
    a / b
}`,
          task: 'Add Result type for safe division and handle zero'
        },
        {
          name: 'ownership-optimization',
          code: `fn process_string(s: String) -> String {
    let result = s.to_uppercase();
    result
}`,
          task: 'Optimize to use string slice reference instead of ownership'
        },
        {
          name: 'error-handling',
          code: `fn read_number(s: &str) -> i32 {
    s.parse().unwrap()
}`,
          task: 'Replace unwrap with proper error handling using Result'
        }
      ],
      
      cpp: [
        {
          name: 'memory-safety',
          code: `class Buffer {
    char* data;
    int size;
public:
    Buffer(int s) {
        data = new char[s];
        size = s;
    }
};`,
          task: 'Add destructor, copy constructor, and move semantics'
        },
        {
          name: 'modern-cpp',
          code: `int* createArray(int size) {
    int* arr = new int[size];
    for(int i = 0; i < size; i++) {
        arr[i] = i;
    }
    return arr;
}`,
          task: 'Convert to use smart pointers and modern C++ features'
        }
      ],
      
      web: [
        {
          name: 'html-accessibility',
          code: `<form>
  <input type="text" placeholder="Email">
  <input type="password" placeholder="Password">
  <button>Login</button>
</form>`,
          task: 'Add proper labels, ARIA attributes, and semantic HTML'
        },
        {
          name: 'css-responsive',
          code: `.container {
  width: 1200px;
  margin: 0 auto;
}

.card {
  width: 300px;
  float: left;
  margin: 10px;
}`,
          task: 'Make responsive with flexbox/grid and mobile-first approach'
        }
      ]
    };
  }
  
  async runComprehensiveTests() {
    console.log('🚀 포괄적 다중 언어 테스트 시작\\n');
    console.log('테스트 구성:');
    console.log(`- 모델: ${this.models.join(', ')}`);
    console.log(`- 언어: ${Object.keys(this.testScenarios).join(', ')}`);
    console.log(`- 총 시나리오: ${Object.values(this.testScenarios).reduce((sum, scenarios) => sum + scenarios.length, 0)}개\\n`);
    
    const allResults = [];
    const startTime = Date.now();
    
    for (const model of this.models) {
      console.log(`\\n${'='.repeat(70)}`);
      console.log(`🤖 모델: ${model}`);
      console.log(`${'='.repeat(70)}`);
      
      for (const [language, scenarios] of Object.entries(this.testScenarios)) {
        console.log(`\\n📁 언어: ${language.toUpperCase()}`);
        console.log(`${'-'.repeat(50)}`);
        
        for (const scenario of scenarios) {
          const result = await this.runSingleTest(model, language, scenario);
          allResults.push(result);
          
          // 간단한 결과 출력
          if (result.success) {
            console.log(`  ✅ ${scenario.name}: 성공 (${result.duration}ms)`);
          } else {
            console.log(`  ❌ ${scenario.name}: 실패 - ${result.error}`);
          }
        }
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // 종합 분석
    await this.generateComprehensiveReport(allResults, totalDuration);
  }
  
  async runSingleTest(model, language, scenario) {
    const ollamaCodeBridge = new OllamaCodeBridge({ 
      model,
      temperature: 0.3 
    });
    
    const startTime = Date.now();
    
    try {
      // 언어별 프롬프트 조정
      const languageHints = {
        python: 'Use proper Python syntax with type hints from typing module.',
        rust: 'Use idiomatic Rust with proper error handling and ownership.',
        cpp: 'Use modern C++ features (C++17 or later).',
        javascript: 'Use modern ES6+ JavaScript syntax.',
        web: 'Use semantic HTML5 and modern CSS.'
      };
      
      // 새로운 통합 방식: improveCode 메서드 사용 (웹 전처리기 포함)
      const improveResult = await ollamaCodeBridge.improveCode(
        scenario.code,
        scenario.task,
        { fileType: language, debug: false }
      );
      
      const rawResponse = improveResult.rawResponse;
      const improvedCode = improveResult.improvedSnippet;
      
      const duration = Date.now() - startTime;
      
      // 언어별 품질 검증
      const qualityMetrics = this.analyzeCodeQuality(improvedCode, language, scenario.task);
      
      const result = {
        timestamp: new Date().toISOString(),
        model,
        language,
        scenario: scenario.name,
        task: scenario.task,
        originalCode: scenario.code,
        rawResponse,
        improvedCode,
        duration,
        success: improvedCode.length > 0 && qualityMetrics.score >= 0.5,
        qualityMetrics,
        error: null
      };
      
      // 개별 결과 저장
      await this.saveTestResult(result);
      
      return result;
      
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        model,
        language,
        scenario: scenario.name,
        task: scenario.task,
        originalCode: scenario.code,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      };
    }
  }
  
  analyzeCodeQuality(code, language, task) {
    const metrics = {};
    let score = 0;
    let maxScore = 0;
    
    // 공통 검사
    if (code && code.length > 0) {
      metrics.hasCode = true;
      score += 0.2;
    }
    maxScore += 0.2;
    
    // 언어별 품질 검사
    switch (language) {
      case 'javascript':
        if (code.includes('throw') || code.includes('try')) {
          metrics.hasErrorHandling = true;
          score += 0.3;
        }
        if (code.includes('const ') || code.includes('let ')) {
          metrics.hasModernSyntax = true;
          score += 0.2;
        }
        if (code.includes('async') || code.includes('await')) {
          metrics.hasAsync = true;
          score += 0.1;
        }
        maxScore += 0.6;
        break;
        
      case 'python':
        if (code.includes('->') || code.includes(': ')) {
          metrics.hasTypeHints = true;
          score += 0.3;
        }
        if (code.includes('"""') || code.includes("'''")) {
          metrics.hasDocstring = true;
          score += 0.2;
        }
        if (code.includes('raise') || code.includes('try:')) {
          metrics.hasErrorHandling = true;
          score += 0.3;
        }
        maxScore += 0.8;
        break;
        
      case 'rust':
        if (code.includes('Result<')) {
          metrics.hasResultType = true;
          score += 0.4;
        }
        if (code.includes('Ok(') || code.includes('Err(')) {
          metrics.hasProperErrorHandling = true;
          score += 0.3;
        }
        if (code.includes('&') && !code.includes('&mut')) {
          metrics.hasBorrowing = true;
          score += 0.2;
        }
        maxScore += 0.9;
        break;
        
      case 'cpp':
        if (code.includes('std::unique_ptr') || code.includes('std::shared_ptr')) {
          metrics.hasSmartPointers = true;
          score += 0.4;
        }
        if (code.includes('~') && code.includes('()')) {
          metrics.hasDestructor = true;
          score += 0.3;
        }
        if (code.includes('std::')) {
          metrics.hasStdLibrary = true;
          score += 0.2;
        }
        maxScore += 0.9;
        break;
        
      case 'web':
        if (code.includes('aria-') || code.includes('role=')) {
          metrics.hasAccessibility = true;
          score += 0.4;
        }
        if (code.includes('<label') || code.includes('for=')) {
          metrics.hasLabels = true;
          score += 0.3;
        }
        if (code.includes('@media') || code.includes('flex') || code.includes('grid')) {
          metrics.hasResponsive = true;
          score += 0.3;
        }
        maxScore += 1.0;
        break;
    }
    
    // 작업 특정 검사
    const taskLower = task.toLowerCase();
    if (taskLower.includes('error') && (code.includes('try') || code.includes('except') || code.includes('Result'))) {
      metrics.taskCompleted = true;
      score += 0.2;
    }
    maxScore += 0.2;
    
    return {
      ...metrics,
      score: maxScore > 0 ? score / maxScore : 0,
      rawScore: score,
      maxScore
    };
  }
  
  async saveTestResult(result) {
    const modelDir = result.model.replace(':', '-');
    const dir = path.join(__dirname, modelDir, result.language);
    await fs.mkdir(dir, { recursive: true });
    
    const filename = `${result.scenario}-${Date.now()}.json`;
    const filepath = path.join(dir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
  }
  
  async generateComprehensiveReport(results, totalDuration) {
    console.log(`\\n\\n${'='.repeat(70)}`);
    console.log('📊 포괄적 테스트 결과 분석');
    console.log(`${'='.repeat(70)}`);
    
    // 모델별 통계
    const modelStats = {};
    for (const result of results) {
      if (!modelStats[result.model]) {
        modelStats[result.model] = {
          total: 0,
          success: 0,
          languages: {},
          totalDuration: 0,
          qualityScores: []
        };
      }
      
      const stats = modelStats[result.model];
      stats.total++;
      if (result.success) {
        stats.success++;
        if (result.qualityMetrics) {
          stats.qualityScores.push(result.qualityMetrics.score);
        }
      }
      stats.totalDuration += result.duration || 0;
      
      // 언어별 통계
      if (!stats.languages[result.language]) {
        stats.languages[result.language] = { total: 0, success: 0 };
      }
      stats.languages[result.language].total++;
      if (result.success) {
        stats.languages[result.language].success++;
      }
    }
    
    // 결과 출력
    console.log('\\n### 모델별 종합 성과');
    for (const [model, stats] of Object.entries(modelStats)) {
      const successRate = (stats.success / stats.total * 100).toFixed(1);
      const avgDuration = (stats.totalDuration / stats.total).toFixed(0);
      const avgQuality = stats.qualityScores.length > 0 
        ? (stats.qualityScores.reduce((a, b) => a + b, 0) / stats.qualityScores.length * 100).toFixed(1)
        : 0;
      
      console.log(`\\n**${model}**`);
      console.log(`- 전체 성공률: ${stats.success}/${stats.total} (${successRate}%)`);
      console.log(`- 평균 응답 시간: ${avgDuration}ms`);
      console.log(`- 평균 품질 점수: ${avgQuality}%`);
      
      console.log('\\n언어별 성공률:');
      for (const [lang, langStats] of Object.entries(stats.languages)) {
        const langSuccessRate = (langStats.success / langStats.total * 100).toFixed(1);
        console.log(`  - ${lang}: ${langStats.success}/${langStats.total} (${langSuccessRate}%)`);
      }
    }
    
    // 언어별 종합
    console.log('\\n### 언어별 종합 분석');
    const languageStats = {};
    for (const result of results) {
      if (!languageStats[result.language]) {
        languageStats[result.language] = { total: 0, success: 0, models: {} };
      }
      languageStats[result.language].total++;
      if (result.success) {
        languageStats[result.language].success++;
      }
    }
    
    for (const [lang, stats] of Object.entries(languageStats)) {
      const rate = (stats.success / stats.total * 100).toFixed(1);
      console.log(`\\n**${lang.toUpperCase()}**: ${stats.success}/${stats.total} (${rate}%)`);
    }
    
    console.log(`\\n### 실행 시간`);
    console.log(`총 테스트 시간: ${(totalDuration / 1000).toFixed(1)}초`);
    console.log(`평균 테스트당 시간: ${(totalDuration / results.length).toFixed(0)}ms`);
    
    // 최종 보고서 저장
    const report = {
      executionTime: new Date().toISOString(),
      totalDuration,
      totalTests: results.length,
      models: this.models,
      languages: Object.keys(this.testScenarios),
      modelStats,
      languageStats,
      detailedResults: results
    };
    
    const reportPath = path.join(__dirname, 'comparison-reports', `comprehensive-test-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\\n💾 상세 보고서 저장: ${reportPath}`);
    console.log('\\n✅ 포괄적 테스트 완료!');
  }
}

// 실행
if (require.main === module) {
  const tester = new ComprehensiveMultiLanguageTester();
  tester.runComprehensiveTests().catch(console.error);
}

module.exports = ComprehensiveMultiLanguageTester;