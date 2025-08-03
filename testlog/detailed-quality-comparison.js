/**
 * 상세 품질 비교 분석
 * 실제 LLM 응답의 문제점과 CodeBridge 개선 효과 측정
 */

const CodeBridge = require('../code-bridge');
const { CodeQualityAnalyzer } = require('./quality-comparison-test');

// 실제 LLM 응답 시뮬레이션 (문제가 있는 케이스들)
const problematicLLMResponses = [
  {
    name: '불완전한 함수 추가',
    original: `
fn main() {
    println!("Hello, world!");
}`,
    llmResponse: `Here's the function you requested:

\`\`\`rust
// @visibility pub
fn calculate_sum(a: i32, b: i32) -> i32 {
    a + b
}
\`\`\`

This function adds two integers and returns the result.`,
    testCase: {
      type: 'add_function',
      expectedFunction: 'calculate_sum'
    }
  },
  {
    name: '문법 오류가 있는 응답',
    original: `
fn process_data(data: Vec<i32>) -> i32 {
    data.iter().sum()
}`,
    llmResponse: `Here's the improved function:

\`\`\`rust
// @async  
// @visibility pub
async fn process_data(data: Vec<i32>) -> i32 {
    println!("Processing {} items", data.len())
    let sum = data.iter().sum();
    sum
\`\`\``,
    testCase: {
      type: 'modify_function', 
      expectedFunction: 'process_data'
    }
  },
  {
    name: '불완전한 impl 블록',
    original: `
pub struct Calculator {
    value: f64,
}

impl Calculator {
    pub fn add(&mut self, x: f64) {
        self.value += x;
    }
}`,
    llmResponse: `Add this constructor:

\`\`\`rust
pub fn new() -> Self {
    Self { 
        value: 0.0 
    }
\`\`\``,
    testCase: {
      type: 'impl_block',
      expectedFunction: 'new'
    }
  },
  {
    name: '중괄호 불일치',
    original: `
fn helper() {
    println!("Helper");
}`,
    llmResponse: `Here's the fixed code:

\`\`\`rust
fn improved_helper() {
    println!("Improved helper");
    if true {
        println!("Always true")
    // Missing closing brace
}
\`\`\``,
    testCase: {
      type: 'modify_function',
      expectedFunction: 'improved_helper'
    }
  },
  {
    name: '마크다운 파싱 오류',
    original: `fn test() {}`,
    llmResponse: `Here's your function:
    
fn calculate(x: i32, y: i32) -> i32 {
    x * y
}

And here's another approach:
\`\`\`
fn alternative_calc(a: i32, b: i32) -> i32 { a + b }
\`\`\``,
    testCase: {
      type: 'add_function',
      expectedFunction: 'calculate'
    }
  }
];

function multiLanguagePreprocessor(response, language = 'rust') {
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
  
  // 직접 추출
  const lines = response.split('\n');
  const codeLines = [];
  let inCode = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!inCode && /^(fn |struct |impl |use |pub |mod |trait |enum |async fn |unsafe fn )/.test(trimmed)) {
      inCode = true;
      codeLines.push(line);
    } else if (inCode) {
      codeLines.push(line);
      
      if (trimmed === '' && i > 0 && lines[i-1].trim() === '') {
        break;
      }
    }
  }
  
  return codeLines.join('\n').trim();
}

async function runDetailedQualityTest() {
  console.log('🔍 === 상세 품질 비교 분석 ===\n');
  
  const codeBridge = new CodeBridge();
  const analyzer = new CodeQualityAnalyzer();
  const results = [];
  
  for (const testData of problematicLLMResponses) {
    console.log(`\n📊 테스트: ${testData.name}`);
    console.log('='.repeat(60));
    
    // 1. LLM 원시 응답 전처리
    console.log('\n🤖 LLM 원시 응답:');
    const rawSnippet = multiLanguagePreprocessor(testData.llmResponse, 'rust');
    console.log('```rust');
    console.log(rawSnippet);
    console.log('```');
    
    // 2. LLM 원시 출력 품질 분석
    const rawAnalysis = analyzer.analyze(rawSnippet, testData.testCase);
    console.log(`\n📊 원시 출력 품질: ${rawAnalysis.overallScore}점 (${rawAnalysis.summary.grade}급)`);
    console.log(`문제점 ${rawAnalysis.summary.issueCount}개:`);
    rawAnalysis.summary.issues.forEach(issue => console.log(`  ❌ ${issue}`));
    
    // 3. CodeBridge 처리
    console.log('\n⚡ CodeBridge 처리 중...');
    let processedCode;
    let processedAnalysis;
    
    try {
      processedCode = codeBridge.process(testData.original, rawSnippet, 'rust');
      console.log('```rust');
      console.log(processedCode);
      console.log('```');
      
      // 4. 처리 후 품질 분석
      processedAnalysis = analyzer.analyze(processedCode, testData.testCase);
      console.log(`\n📊 처리 후 품질: ${processedAnalysis.overallScore}점 (${processedAnalysis.summary.grade}급)`);
      if (processedAnalysis.summary.issueCount > 0) {
        console.log(`문제점 ${processedAnalysis.summary.issueCount}개:`);
        processedAnalysis.summary.issues.forEach(issue => console.log(`  ❌ ${issue}`));
      } else {
        console.log('✅ 문제점 없음');
      }
      
    } catch (error) {
      console.log(`❌ CodeBridge 처리 실패: ${error.message}`);
      processedAnalysis = { overallScore: 0, summary: { grade: 'F', issueCount: 1, issues: ['처리 실패'] } };
    }
    
    // 5. 개선 효과 계산
    const improvement = processedAnalysis.overallScore - rawAnalysis.overallScore;
    const gradeImprovement = rawAnalysis.summary.grade !== processedAnalysis.summary.grade;
    
    console.log(`\n📈 개선 효과:`);
    console.log(`  점수: ${improvement > 0 ? '+' : ''}${improvement}점`);
    console.log(`  등급: ${rawAnalysis.summary.grade} → ${processedAnalysis.summary.grade}`);
    console.log(`  문제점: ${rawAnalysis.summary.issueCount}개 → ${processedAnalysis.summary.issueCount}개`);
    
    results.push({
      name: testData.name,
      raw: rawAnalysis,
      processed: processedAnalysis,
      improvement: improvement,
      gradeImproved: gradeImprovement
    });
  }
  
  // 종합 결과표
  console.log('\n\n📊 === 종합 품질 개선 효과표 ===');
  console.log('| 테스트 케이스 | LLM 원시 | CodeBridge 처리 | 개선 점수 | 등급 변화 | 상태 |');
  console.log('|---------------|----------|-----------------|-----------|-----------|------|');
  
  results.forEach(result => {
    const gradeChange = result.raw.summary.grade === result.processed.summary.grade ? 
                       '동일' : `${result.raw.summary.grade}→${result.processed.summary.grade}`;
    const status = result.improvement > 0 ? '✅ 개선' : 
                   result.improvement < 0 ? '❌ 악화' : '➖ 동일';
    
    console.log(`| ${result.name} | ${result.raw.overallScore}점 (${result.raw.summary.grade}) | ${result.processed.overallScore}점 (${result.processed.summary.grade}) | ${result.improvement > 0 ? '+' : ''}${result.improvement}점 | ${gradeChange} | ${status} |`);
  });
  
  // 통계 요약
  const improvements = results.filter(r => r.improvement > 0).length;
  const degradations = results.filter(r => r.improvement < 0).length;
  const unchanged = results.filter(r => r.improvement === 0).length;
  const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
  
  console.log('\n📈 === 개선 효과 통계 ===');
  console.log(`개선된 케이스: ${improvements}개 (${(improvements/results.length*100).toFixed(1)}%)`);
  console.log(`악화된 케이스: ${degradations}개 (${(degradations/results.length*100).toFixed(1)}%)`);
  console.log(`변화없음: ${unchanged}개 (${(unchanged/results.length*100).toFixed(1)}%)`);
  console.log(`평균 개선: ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}점`);
  
  return results;
}

if (require.main === module) {
  runDetailedQualityTest().catch(console.error);
}

module.exports = { runDetailedQualityTest };