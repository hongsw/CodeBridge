/**
 * CodeBridge 품질 개선 효과 측정
 * LLM 원시 출력 vs CodeBridge 처리 후 비교
 */

const OllamaCodeBridge = require('../integrations/ollama-integration');

// 코드 품질 평가 기준
class CodeQualityAnalyzer {
  constructor() {
    this.criteria = {
      syntax: { weight: 30, description: '문법 정확성' },
      completeness: { weight: 25, description: '완성도' },
      functionality: { weight: 25, description: '동작 가능성' },
      structure: { weight: 20, description: '구조적 완성도' }
    };
  }

  // Rust 문법 검증
  validateRustSyntax(code) {
    const issues = [];
    
    // 기본 문법 체크
    if (!code.includes('fn ')) {
      issues.push('함수 정의 누락');
    }
    
    // 중괄호 매칭
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('중괄호 불일치');
    }
    
    // 세미콜론 체크
    const lines = code.split('\n').filter(line => line.trim());
    const statementsNeedingSemicolon = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.startsWith('//') && 
             !trimmed.endsWith('{') && 
             !trimmed.endsWith('}') && 
             !trimmed.includes('fn ') &&
             !trimmed.startsWith('impl ') &&
             !trimmed.startsWith('struct ') &&
             !trimmed.endsWith(';');
    });
    
    if (statementsNeedingSemicolon.length > 0) {
      issues.push(`세미콜론 누락 ${statementsNeedingSemicolon.length}개`);
    }
    
    return {
      score: Math.max(0, 100 - (issues.length * 20)),
      issues: issues
    };
  }

  // 완성도 평가
  evaluateCompleteness(code, expectedFunction) {
    const issues = [];
    let score = 100;
    
    // 함수명 확인
    if (!code.includes(`fn ${expectedFunction}`)) {
      issues.push('요청된 함수명 없음');
      score -= 30;
    }
    
    // pub 키워드 확인 (public 함수인 경우)
    if (expectedFunction.includes('pub') || code.includes('@visibility pub')) {
      if (!code.includes('pub fn')) {
        issues.push('pub 키워드 누락');
        score -= 20;
      }
    }
    
    // 매개변수 확인
    if (!code.includes('(') || !code.includes(')')) {
      issues.push('매개변수 정의 누락');
      score -= 25;
    }
    
    // 반환 타입 확인
    if (!code.includes('->')) {
      issues.push('반환 타입 정의 누락');
      score -= 15;
    }
    
    // 함수 본문 확인
    if (!code.includes('{') || !code.includes('}')) {
      issues.push('함수 본문 누락');
      score -= 30;
    }
    
    return {
      score: Math.max(0, score),
      issues: issues
    };
  }

  // 동작 가능성 평가
  evaluateFunctionality(code, testCase) {
    const issues = [];
    let score = 100;
    
    switch (testCase.type) {
      case 'add_function':
        if (!code.includes('a + b') && !code.includes('a.wrapping_add(b)')) {
          issues.push('덧셈 로직 없음');
          score -= 40;
        }
        break;
        
      case 'modify_function':
        if (!code.includes('println!')) {
          issues.push('println! 매크로 없음');
          score -= 30;
        }
        if (!code.includes('async') && testCase.expected && testCase.expected.includes('async')) {
          issues.push('async 키워드 누락');
          score -= 25;
        }
        break;
        
      case 'delete_function':
        if (code.includes('deprecated_function')) {
          issues.push('삭제되지 않은 함수');
          score -= 50;
        }
        break;
        
      case 'impl_block':
        if (!code.includes('Self {') && !code.includes('Self{')) {
          issues.push('Self 생성자 없음');
          score -= 40;
        }
        if (!code.includes('value: 0.0')) {
          issues.push('초기값 설정 없음');
          score -= 30;
        }
        break;
    }
    
    return {
      score: Math.max(0, score),
      issues: issues
    };
  }

  // 구조적 완성도 평가
  evaluateStructure(code) {
    const issues = [];
    let score = 100;
    
    // 들여쓰기 확인
    const lines = code.split('\n');
    const inconsistentIndent = lines.some(line => {
      const indent = line.match(/^\s*/)[0];
      return indent.includes('\t') && indent.includes(' ');
    });
    
    if (inconsistentIndent) {
      issues.push('들여쓰기 불일치');
      score -= 20;
    }
    
    // 빈 줄 적절성
    const consecutiveEmptyLines = code.includes('\n\n\n');
    if (consecutiveEmptyLines) {
      issues.push('과도한 빈 줄');
      score -= 10;
    }
    
    // 코드 블록 구조
    const hasProperStructure = code.includes('fn ') && 
                              code.includes('{') && 
                              code.includes('}');
    if (!hasProperStructure) {
      issues.push('불완전한 코드 블록');
      score -= 40;
    }
    
    return {
      score: Math.max(0, score),
      issues: issues
    };
  }

  // 종합 평가
  analyze(code, testCase) {
    const results = {
      syntax: this.validateRustSyntax(code),
      completeness: this.evaluateCompleteness(code, testCase.expectedFunction || 'unknown'),
      functionality: this.evaluateFunctionality(code, testCase),
      structure: this.evaluateStructure(code)
    };

    // 가중평균 계산
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.keys(this.criteria).forEach(key => {
      const weight = this.criteria[key].weight;
      const score = results[key].score;
      totalScore += score * weight;
      totalWeight += weight;
    });

    const overallScore = Math.round(totalScore / totalWeight);
    
    return {
      overallScore,
      details: results,
      summary: this.generateSummary(results)
    };
  }

  generateSummary(results) {
    const allIssues = [];
    Object.keys(results).forEach(category => {
      results[category].issues.forEach(issue => {
        allIssues.push(`${category}: ${issue}`);
      });
    });
    
    return {
      issueCount: allIssues.length,
      issues: allIssues,
      grade: this.getGrade(results)
    };
  }

  getGrade(results) {
    const avgScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / 4;
    if (avgScore >= 90) return 'A';
    if (avgScore >= 80) return 'B';
    if (avgScore >= 70) return 'C';
    if (avgScore >= 60) return 'D';
    return 'F';
  }
}

// 테스트 케이스 정의
const testCases = [
  {
    name: 'Rust - 새 함수 추가',
    type: 'add_function',
    expectedFunction: 'calculate_sum',
    original: `
fn main() {
    println!("Hello, world!");
}

fn greet(name: &str) {
    println!("Hello, {}!", name);
}`,
    prompt: 'Add a new public function called calculate_sum that takes two i32 parameters (a and b) and returns their sum as i32. Use the @visibility pub comment command.',
    expected: `fn calculate_sum(a: i32, b: i32) -> i32 { a + b }`
  },
  {
    name: 'Rust - 함수 수정',
    type: 'modify_function', 
    expectedFunction: 'process_data',
    original: `
fn process_data(data: Vec<i32>) -> i32 {
    data.iter().sum()
}`,
    prompt: 'Modify the process_data function to be async and public. Add a println! statement that shows how many items are being processed.',
    expected: `pub async fn process_data(data: Vec<i32>) -> i32`
  }
];

// 메인 테스트 실행
async function runQualityComparisonTest() {
  console.log('🔍 === CodeBridge 품질 개선 효과 측정 ===\n');
  
  const bridge = new OllamaCodeBridge({ 
    model: 'deepseek-coder:6.7b',
    temperature: 0.3,
    maxTokens: 300
  });
  
  bridge.customPreprocessor = (response, language = 'rust') => {
    const rustPattern = /```(?:rust|rs)?\n?([\s\S]*?)```/g;
    const matches = [...response.matchAll(rustPattern)];
    if (matches.length > 0) {
      return matches[0][1].trim();
    }
    return response.trim();
  };
  
  const analyzer = new CodeQualityAnalyzer();
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n📊 테스트: ${testCase.name}`);
    console.log('='.repeat(50));
    
    try {
      // LLM 원시 출력 + CodeBridge 처리 결과 둘 다 얻기
      const result = await bridge.improveCode(
        testCase.original, 
        testCase.prompt, 
        { fileType: 'rust' }
      );
      
      if (result.success) {
        // 1. LLM 원시 출력 분석
        console.log('\n🤖 LLM 원시 출력 분석:');
        const rawAnalysis = analyzer.analyze(result.improvedSnippet, testCase);
        console.log(`점수: ${rawAnalysis.overallScore}점 (${rawAnalysis.summary.grade}급)`);
        console.log(`문제점: ${rawAnalysis.summary.issueCount}개`);
        rawAnalysis.summary.issues.forEach(issue => console.log(`  - ${issue}`));
        
        // 2. CodeBridge 처리 후 분석
        console.log('\n⚡ CodeBridge 처리 후 분석:');
        const processedAnalysis = analyzer.analyze(result.finalCode, testCase);
        console.log(`점수: ${processedAnalysis.overallScore}점 (${processedAnalysis.summary.grade}급)`);
        console.log(`문제점: ${processedAnalysis.summary.issueCount}개`);
        processedAnalysis.summary.issues.forEach(issue => console.log(`  - ${issue}`));
        
        // 3. 개선 효과
        const improvement = processedAnalysis.overallScore - rawAnalysis.overallScore;
        console.log(`\n📈 개선 효과: ${improvement > 0 ? '+' : ''}${improvement}점 개선`);
        
        results.push({
          testCase: testCase.name,
          raw: rawAnalysis,
          processed: processedAnalysis,
          improvement: improvement
        });
        
      } else {
        console.log(`❌ 테스트 실패: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`❌ 오류: ${error.message}`);
    }
  }
  
  // 종합 결과표
  console.log('\n\n📊 === 종합 품질 비교표 ===');
  console.log('| 테스트 케이스 | LLM 원시 | CodeBridge 처리 | 개선 효과 | 등급 변화 |');
  console.log('|---------------|----------|-----------------|-----------|-----------|');
  
  results.forEach(result => {
    const gradeChange = result.raw.summary.grade === result.processed.summary.grade ? 
                       '동일' : `${result.raw.summary.grade} → ${result.processed.summary.grade}`;
    console.log(`| ${result.testCase} | ${result.raw.overallScore}점 (${result.raw.summary.grade}) | ${result.processed.overallScore}점 (${result.processed.summary.grade}) | ${result.improvement > 0 ? '+' : ''}${result.improvement}점 | ${gradeChange} |`);
  });
  
  return results;
}

if (require.main === module) {
  runQualityComparisonTest().catch(console.error);
}

module.exports = { CodeQualityAnalyzer, runQualityComparisonTest };