/**
 * Rust 병합 기능 테스트
 * 다양한 LLM 모델로 Rust 코드 병합 테스트 실행
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');

// 개선된 다중 언어 전처리기
function multiLanguagePreprocessor(response, language = 'rust') {
  // 언어별 코드 블록 패턴
  const languagePatterns = {
    rust: [
      /```(?:rust|rs)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ]
  };
  
  const patterns = languagePatterns[language] || languagePatterns.rust;
  
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
    rust: {
      start: /^(fn |struct |impl |use |pub |mod |trait |enum |async fn |unsafe fn )/,
      keywords: /\b(fn|struct|impl|use|if|for|while|return|match|pub|mod|let|mut|async|unsafe)\b/
    }
  };
  
  const markers = languageMarkers[language] || languageMarkers.rust;
  
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

// 분석 함수
function analyzeResult(result, testCase) {
  const analysis = {
    success: false,
    error: null,
    hasExpectedFunction: false,
    hasExpectedModifier: false,
    hasCorrectImplementation: false,
    details: {}
  };

  try {
    if (!result || typeof result !== 'string') {
      analysis.error = 'Empty or invalid result';
      return analysis;
    }

    // 기본 성공 여부
    analysis.success = true;

    // 테스트 케이스별 특수 검증
    switch (testCase.name) {
      case 'Rust - 새 함수 추가':
        analysis.hasExpectedFunction = result.includes('fn calculate_sum');
        analysis.hasExpectedModifier = result.includes('pub fn calculate_sum');
        analysis.hasCorrectImplementation = result.includes('a + b');
        break;

      case 'Rust - 함수 수정':
        analysis.hasExpectedFunction = result.includes('fn process_data');
        analysis.hasExpectedModifier = result.includes('pub async fn process_data');
        analysis.hasCorrectImplementation = result.includes('data.iter().sum()');
        break;

      case 'Rust - 함수 삭제':
        analysis.success = !result.includes('fn deprecated_function');
        analysis.hasExpectedFunction = result.includes('fn helper_function');
        break;

      case 'Rust - impl 블록 추가':
        analysis.hasExpectedFunction = result.includes('fn new');
        analysis.hasExpectedModifier = result.includes('impl Calculator');
        analysis.hasCorrectImplementation = result.includes('Self { value: 0.0 }');
        break;
    }

    // 종합 점수
    const scores = [
      analysis.success ? 1 : 0,
      analysis.hasExpectedFunction ? 1 : 0,
      analysis.hasExpectedModifier ? 1 : 0,
      analysis.hasCorrectImplementation ? 1 : 0
    ];
    
    analysis.score = scores.reduce((a, b) => a + b, 0) / scores.length;

  } catch (error) {
    analysis.error = error.message;
    analysis.success = false;
  }

  return analysis;
}

// Rust 테스트 케이스
const rustTestCases = [
  {
    name: 'Rust - 새 함수 추가',
    original: `
fn main() {
    println!("Hello, world!");
}

fn greet(name: &str) {
    println!("Hello, {}!", name);
}`,
    prompt: `Add a new public function called calculate_sum that takes two i32 parameters (a and b) and returns their sum as i32. Use the @visibility pub comment command.`,
    expected: `
// @visibility pub
fn calculate_sum(a: i32, b: i32) -> i32 {
    a + b
}`,
    language: 'rust'
  },
  {
    name: 'Rust - 함수 수정',
    original: `
fn process_data(data: Vec<i32>) -> i32 {
    data.iter().sum()
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5];
    let result = process_data(numbers);
    println!("Sum: {}", result);
}`,
    prompt: `Modify the process_data function to be async and public. Add a println! statement that shows how many items are being processed. Use @async and @visibility pub comment commands.`,
    expected: `
// @async
// @visibility pub
fn process_data(data: Vec<i32>) -> i32 {
    let sum: i32 = data.iter().sum();
    println!("Processing {} items, sum: {}", data.len(), sum);
    sum
}`,
    language: 'rust'
  },
  {
    name: 'Rust - 함수 삭제',
    original: `
fn helper_function() {
    println!("This is a helper");
}

fn deprecated_function() {
    println!("This function is deprecated");
}

fn main() {
    helper_function();
}`,
    prompt: `Remove the deprecated_function using the @delete comment command.`,
    expected: `
// @delete
fn deprecated_function() {
    // This will be deleted
}`,
    language: 'rust'
  },
  {
    name: 'Rust - impl 블록 추가',
    original: `
pub struct Calculator {
    value: f64,
}

impl Calculator {
    pub fn add(&mut self, x: f64) {
        self.value += x;
    }
}`,
    prompt: `Add a new() constructor function to the Calculator impl block that returns Self with value initialized to 0.0.`,
    expected: `
pub fn new() -> Self {
    Self { value: 0.0 }
}`,
    language: 'rust'
  }
];

// 메인 테스트 실행기
async function runComprehensiveRustTest() {
  console.log('🦀 === Rust 병합 기능 포괄적 테스트 시작 ===\n');
  
  const models = [
    'deepseek-coder:6.7b',
    'starcoder2:3b'
  ];
  
  const allResults = [];
  
  for (const model of models) {
    console.log(`\n📊 모델 테스트: ${model}`);
    console.log('='.repeat(50));
    
    const modelResults = {
      model,
      tests: [],
      summary: {
        total: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0,
        avgScore: 0
      }
    };
    
    // 초기화
    const bridge = new OllamaCodeBridge({ 
      model: model,
      temperature: 0.3,
      maxTokens: 500
    });
    bridge.customPreprocessor = multiLanguagePreprocessor;
    
    for (const testCase of rustTestCases) {
      console.log(`\n테스트: ${testCase.name}`);
      
      const startTime = Date.now();
      let result = null;
      let error = null;
      let analysis = null;
      
      try {
        const improveResult = await bridge.improveCode(
          testCase.original,
          testCase.prompt,
          { 
            temperature: 0.3,
            maxTokens: 500,
            fileType: 'rust'
          }
        );
        
        result = improveResult.finalCode || improveResult.improvedSnippet;
        
        analysis = analyzeResult(result, testCase);
        
      } catch (err) {
        error = err.message;
        console.error(`❌ 오류: ${error}`);
      }
      
      const responseTime = (Date.now() - startTime) / 1000;
      
      const testResult = {
        testName: testCase.name,
        success: analysis ? analysis.success : false,
        responseTime,
        error: error || (analysis ? analysis.error : null),
        score: analysis ? analysis.score : 0,
        analysis,
        result: result ? result.substring(0, 200) + '...' : null
      };
      
      modelResults.tests.push(testResult);
      modelResults.summary.total++;
      
      if (testResult.success) {
        modelResults.summary.success++;
        console.log(`✅ 성공 (${responseTime.toFixed(1)}초, 점수: ${(testResult.score * 100).toFixed(0)}%)`);
      } else {
        modelResults.summary.failed++;
        console.log(`❌ 실패: ${testResult.error || '알 수 없는 오류'}`);
      }
      
      // 분석 상세 출력
      if (analysis) {
        console.log(`   - 예상 함수 포함: ${analysis.hasExpectedFunction ? '✓' : '✗'}`);
        console.log(`   - 예상 수정자 포함: ${analysis.hasExpectedModifier ? '✓' : '✗'}`);
        console.log(`   - 올바른 구현: ${analysis.hasCorrectImplementation ? '✓' : '✗'}`);
      }
    }
    
    // 모델별 요약
    const avgTime = modelResults.tests.reduce((sum, t) => sum + t.responseTime, 0) / modelResults.tests.length;
    const avgScore = modelResults.tests.reduce((sum, t) => sum + t.score, 0) / modelResults.tests.length;
    
    modelResults.summary.avgResponseTime = avgTime;
    modelResults.summary.avgScore = avgScore;
    modelResults.summary.successRate = (modelResults.summary.success / modelResults.summary.total * 100).toFixed(1);
    
    console.log(`\n📈 ${model} 요약:`);
    console.log(`   성공률: ${modelResults.summary.successRate}%`);
    console.log(`   평균 응답시간: ${avgTime.toFixed(1)}초`);
    console.log(`   평균 점수: ${(avgScore * 100).toFixed(0)}%`);
    
    allResults.push(modelResults);
  }
  
  // 전체 결과 저장
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsPath = path.join(__dirname, `rust-test-results-${timestamp}.json`);
  
  await fs.writeFile(resultsPath, JSON.stringify(allResults, null, 2));
  
  // 전체 요약
  console.log('\n\n🏁 === 전체 테스트 요약 ===');
  console.log('모델별 성공률:');
  
  allResults.forEach(result => {
    console.log(`${result.model}: ${result.summary.successRate}% (${result.summary.success}/${result.summary.total})`);
  });
  
  // 최고 성능 모델
  const bestModel = allResults.reduce((best, current) => 
    current.summary.successRate > best.summary.successRate ? current : best
  );
  
  console.log(`\n🏆 최고 성능 모델: ${bestModel.model} (${bestModel.summary.successRate}%)`);
  console.log(`\n📁 상세 결과 저장됨: ${resultsPath}`);
}

// 메인 실행
if (require.main === module) {
  runComprehensiveRustTest().catch(console.error);
}

module.exports = { runComprehensiveRustTest, analyzeResult };