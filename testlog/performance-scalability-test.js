/**
 * 코드량에 따른 성능 확장성 테스트
 * CodeBridge AST 처리 성능이 코드 크기에 따라 어떻게 변화하는지 측정
 */

const CodeBridge = require('../code-bridge');
const { PerformanceProfiler } = require('./performance-profiler');

/**
 * 다양한 크기의 Rust 코드 생성기
 */
class RustCodeGenerator {
  generateCode(options = {}) {
    const {
      functionCount = 10,
      linesPerFunction = 10,
      includeComments = true,
      includeImplBlocks = true,
      complexity = 'medium' // simple, medium, complex
    } = options;

    let code = `// Rust 성능 테스트 코드
use std::collections::HashMap;
use std::sync::Arc;

`;

    // 구조체 생성
    if (includeImplBlocks) {
      code += `pub struct DataProcessor {
    cache: HashMap<String, Vec<i32>>,
    counter: Arc<usize>,
}\n\n`;
    }

    // 함수 생성
    for (let i = 0; i < functionCount; i++) {
      if (includeComments) {
        code += `/// Function ${i} documentation\n`;
      }
      
      code += `pub fn process_data_${i}(`;
      
      // 복잡도에 따른 매개변수
      if (complexity === 'simple') {
        code += `value: i32`;
      } else if (complexity === 'medium') {
        code += `data: Vec<i32>, factor: f64`;
      } else {
        code += `data: Vec<i32>, config: &Config, options: ProcessOptions`;
      }
      
      code += `) -> Result<i32, String> {\n`;
      
      // 함수 본문 생성
      for (let j = 0; j < linesPerFunction; j++) {
        if (complexity === 'simple') {
          code += `    let temp_${j} = value * ${j + 1};\n`;
        } else if (complexity === 'medium') {
          code += `    let result_${j} = data.iter().map(|x| x * ${j + 1}).sum::<i32>();\n`;
        } else {
          code += `    let processed_${j} = data.iter()
        .filter(|&&x| x > ${j})
        .map(|&x| x * factor as i32)
        .collect::<Vec<_>>();\n`;
        }
      }
      
      code += `    Ok(42)
}\n\n`;
    }

    // impl 블록 추가
    if (includeImplBlocks) {
      code += `impl DataProcessor {
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
            counter: Arc::new(0),
        }
    }
    
    pub fn process(&mut self, key: String, values: Vec<i32>) {
        self.cache.insert(key, values);
    }
}\n`;
    }

    return code;
  }

  generateSnippet(functionName, operation = 'modify') {
    if (operation === 'add') {
      return `// @visibility pub
fn ${functionName}_optimized(data: Vec<i32>) -> i32 {
    data.iter().sum()
}`;
    } else if (operation === 'modify') {
      return `// @async
// @visibility pub
async fn ${functionName}(data: Vec<i32>, factor: f64) -> Result<i32, String> {
    println!("Processing {} items with factor {}", data.len(), factor);
    let sum = data.iter().sum::<i32>();
    Ok(sum)
}`;
    } else if (operation === 'delete') {
      return `// @delete
fn ${functionName}() {}`;
    }
  }
}

/**
 * 성능 테스트 실행기
 */
class PerformanceScalabilityTester {
  constructor() {
    this.codeBridge = new CodeBridge();
    this.generator = new RustCodeGenerator();
    this.results = [];
  }

  async runScalabilityTest() {
    console.log('🚀 === 코드량별 성능 확장성 테스트 ===\n');
    
    const testConfigs = [
      { name: '소규모 (10 함수)', functionCount: 10, linesPerFunction: 10 },
      { name: '중규모 (50 함수)', functionCount: 50, linesPerFunction: 15 },
      { name: '대규모 (100 함수)', functionCount: 100, linesPerFunction: 20 },
      { name: '초대규모 (200 함수)', functionCount: 200, linesPerFunction: 25 },
      { name: '기업급 (500 함수)', functionCount: 500, linesPerFunction: 30 }
    ];

    for (const config of testConfigs) {
      console.log(`\n📊 테스트: ${config.name}`);
      console.log('='.repeat(50));
      
      const profiler = new PerformanceProfiler();
      
      // 코드 생성
      profiler.start('코드 생성');
      const originalCode = this.generator.generateCode({
        functionCount: config.functionCount,
        linesPerFunction: config.linesPerFunction,
        complexity: 'medium'
      });
      profiler.end('코드 생성');
      
      const codeSize = originalCode.length;
      const lineCount = originalCode.split('\n').length;
      
      console.log(`📝 코드 통계:`);
      console.log(`  - 전체 크기: ${(codeSize / 1024).toFixed(2)} KB`);
      console.log(`  - 줄 수: ${lineCount.toLocaleString()}`);
      console.log(`  - 함수 개수: ${config.functionCount}`);
      
      // AST 처리 테스트
      const snippet = this.generator.generateSnippet('process_data_5', 'modify');
      
      profiler.start('CodeBridge AST 처리');
      try {
        const result = this.codeBridge.process(originalCode, snippet, 'rust');
        profiler.end('CodeBridge AST 처리');
        
        const processingTime = profiler.timings['CodeBridge AST 처리'].duration;
        const bytesPerMs = codeSize / processingTime;
        
        this.results.push({
          name: config.name,
          functionCount: config.functionCount,
          codeSize: codeSize,
          lineCount: lineCount,
          processingTime: processingTime,
          throughput: bytesPerMs,
          success: true
        });
        
        console.log(`\n✅ 처리 성공!`);
        console.log(`⏱️  처리 시간: ${processingTime}ms`);
        console.log(`📈 처리량: ${(bytesPerMs / 1024).toFixed(2)} KB/ms`);
        
      } catch (error) {
        profiler.end('CodeBridge AST 처리');
        console.log(`❌ 처리 실패: ${error.message}`);
        
        this.results.push({
          name: config.name,
          functionCount: config.functionCount,
          codeSize: codeSize,
          lineCount: lineCount,
          processingTime: null,
          throughput: null,
          success: false,
          error: error.message
        });
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n\n📊 === 성능 확장성 종합 분석 ===');
    console.log('| 코드 규모 | 크기 (KB) | 줄 수 | 처리 시간 (ms) | 처리량 (KB/ms) | 상태 |');
    console.log('|-----------|-----------|-------|-----------------|-----------------|------|');
    
    this.results.forEach(result => {
      const sizeKB = (result.codeSize / 1024).toFixed(2);
      const throughputKB = result.throughput ? (result.throughput / 1024).toFixed(2) : 'N/A';
      const status = result.success ? '✅ 성공' : '❌ 실패';
      
      console.log(`| ${result.name} | ${sizeKB} | ${result.lineCount.toLocaleString()} | ${result.processingTime || 'N/A'} | ${throughputKB} | ${status} |`);
    });
    
    // 성능 추세 분석
    const successfulResults = this.results.filter(r => r.success);
    if (successfulResults.length >= 2) {
      console.log('\n📈 === 성능 추세 분석 ===');
      
      // 선형성 분석
      const firstResult = successfulResults[0];
      const lastResult = successfulResults[successfulResults.length - 1];
      
      const sizeRatio = lastResult.codeSize / firstResult.codeSize;
      const timeRatio = lastResult.processingTime / firstResult.processingTime;
      
      console.log(`코드 크기 증가: ${sizeRatio.toFixed(1)}배`);
      console.log(`처리 시간 증가: ${timeRatio.toFixed(1)}배`);
      
      if (timeRatio < sizeRatio * 1.2) {
        console.log('✅ 선형적 확장성: 코드량 증가에 비례한 성능 유지');
      } else if (timeRatio < sizeRatio * 2) {
        console.log('⚠️ 준선형적 확장성: 약간의 성능 저하 관찰');
      } else {
        console.log('❌ 비선형적 확장성: 대규모 코드에서 성능 저하');
      }
      
      // 평균 처리량 계산
      const avgThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
      console.log(`\n평균 처리량: ${(avgThroughput / 1024).toFixed(2)} KB/ms`);
    }
  }
}

/**
 * 복잡도별 성능 테스트
 */
async function runComplexityTest() {
  console.log('\n\n🔧 === 복잡도별 성능 테스트 ===\n');
  
  const codeBridge = new CodeBridge();
  const generator = new RustCodeGenerator();
  
  const complexityLevels = ['simple', 'medium', 'complex'];
  const results = [];
  
  for (const complexity of complexityLevels) {
    console.log(`\n📊 복잡도: ${complexity}`);
    console.log('='.repeat(30));
    
    const code = generator.generateCode({
      functionCount: 50,
      linesPerFunction: 20,
      complexity: complexity
    });
    
    const snippet = generator.generateSnippet('process_data_10', 'modify');
    
    const startTime = Date.now();
    try {
      codeBridge.process(code, snippet, 'rust');
      const processingTime = Date.now() - startTime;
      
      results.push({
        complexity,
        processingTime,
        success: true
      });
      
      console.log(`✅ 처리 시간: ${processingTime}ms`);
    } catch (error) {
      console.log(`❌ 실패: ${error.message}`);
      results.push({
        complexity,
        processingTime: null,
        success: false
      });
    }
  }
  
  console.log('\n📊 복잡도별 성능 비교:');
  results.forEach(r => {
    console.log(`${r.complexity}: ${r.processingTime ? r.processingTime + 'ms' : '실패'}`);
  });
}

// 메인 실행
async function main() {
  const tester = new PerformanceScalabilityTester();
  
  // 1. 코드량별 확장성 테스트
  await tester.runScalabilityTest();
  
  // 2. 복잡도별 성능 테스트
  await runComplexityTest();
  
  console.log('\n\n✅ 모든 성능 테스트 완료!');
  console.log('💡 Apple M4 Pro 24GB 환경에서 측정된 결과입니다.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  PerformanceScalabilityTester, 
  RustCodeGenerator,
  runComplexityTest 
};