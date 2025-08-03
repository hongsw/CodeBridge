/**
 * Sub-Agent 병렬 처리 성능 테스트
 * 대규모 프로젝트에서 여러 파일을 동시에 처리하는 시나리오
 */

const CodeBridge = require('../code-bridge');
const { Worker } = require('worker_threads');
const path = require('path');
const { performance } = require('perf_hooks');

/**
 * 가상 프로젝트 생성기
 */
class VirtualProjectGenerator {
  generateProject(options = {}) {
    const {
      fileCount = 10,
      avgFunctionsPerFile = 20,
      languages = ['rust', 'javascript', 'html']
    } = options;

    const project = {
      files: [],
      totalSize: 0,
      totalFunctions: 0
    };

    for (let i = 0; i < fileCount; i++) {
      const language = languages[i % languages.length];
      const file = this.generateFile(i, language, avgFunctionsPerFile);
      
      project.files.push(file);
      project.totalSize += file.content.length;
      project.totalFunctions += file.functionCount;
    }

    return project;
  }

  generateFile(index, language, functionCount) {
    let content = '';
    let extension = '';
    
    switch (language) {
      case 'rust':
        extension = 'rs';
        content = this.generateRustFile(index, functionCount);
        break;
      case 'javascript':
        extension = 'js';
        content = this.generateJavaScriptFile(index, functionCount);
        break;
      case 'html':
        extension = 'html';
        content = this.generateHTMLFile(index);
        functionCount = 0; // HTML has no functions
        break;
    }

    return {
      name: `module_${index}.${extension}`,
      language,
      content,
      functionCount,
      size: content.length
    };
  }

  generateRustFile(index, functionCount) {
    let code = `// Module ${index}
use std::collections::HashMap;

pub struct Module${index} {
    data: HashMap<String, i32>,
}

`;

    for (let i = 0; i < functionCount; i++) {
      code += `pub fn process_${index}_${i}(data: Vec<i32>) -> i32 {
    data.iter()
        .filter(|&&x| x > 0)
        .map(|&x| x * 2)
        .sum()
}

`;
    }

    return code;
  }

  generateJavaScriptFile(index, functionCount) {
    let code = `// Module ${index}

class Module${index} {
  constructor() {
    this.cache = new Map();
  }

`;

    for (let i = 0; i < functionCount; i++) {
      code += `  async process${i}(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    const result = data
      .filter(x => x > 0)
      .map(x => x * 2)
      .reduce((sum, x) => sum + x, 0);
    
    this.cache.set(\`result_${i}\`, result);
    return result;
  }

`;
    }

    code += '}\n\nmodule.exports = Module' + index + ';';
    return code;
  }

  generateHTMLFile(index) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Module ${index}</title>
    <style>
        .container { max-width: 1200px; margin: 0 auto; }
        .module { padding: 20px; border: 1px solid #ccc; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Module ${index}</h1>
        <div class="module" id="module-${index}">
            <p>Content for module ${index}</p>
            <button onclick="processData()">Process</button>
        </div>
    </div>
    <script>
        function processData() {
            console.log('Processing module ${index}');
        }
    </script>
</body>
</html>`;
  }

  generateModification(file) {
    switch (file.language) {
      case 'rust':
        return `// @visibility pub
// @async
async fn optimized_process(data: Vec<i32>) -> Result<i32, String> {
    Ok(data.iter().sum())
}`;
      
      case 'javascript':
        return `// @decorator cache
// @access private
async processOptimized(data) {
  if (!data?.length) return 0;
  return data.reduce((sum, x) => sum + x, 0);
}`;
      
      case 'html':
        return `<div class="optimized-module" role="region" aria-label="Optimized Module">
    <h2>Optimized Content</h2>
    <button class="btn-primary" aria-label="Process Data">Process</button>
</div>`;
      
      default:
        return '// Modified content';
    }
  }
}

/**
 * Sub-Agent 시뮬레이터
 */
class SubAgentSimulator {
  constructor(agentId) {
    this.agentId = agentId;
    this.codeBridge = new CodeBridge();
  }

  async processFile(file, modification) {
    const startTime = performance.now();
    
    try {
      const result = this.codeBridge.process(
        file.content, 
        modification, 
        file.language
      );
      
      const processingTime = performance.now() - startTime;
      
      return {
        agentId: this.agentId,
        fileName: file.name,
        success: true,
        processingTime,
        outputSize: result.length
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        agentId: this.agentId,
        fileName: file.name,
        success: false,
        processingTime,
        error: error.message
      };
    }
  }
}

/**
 * 병렬 처리 오케스트레이터
 */
class ParallelProcessingOrchestrator {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 4;
    this.generator = new VirtualProjectGenerator();
  }

  async runParallelTest(projectOptions) {
    console.log('🚀 === Sub-Agent 병렬 처리 성능 테스트 ===\n');
    
    // 프로젝트 생성
    console.log('📁 가상 프로젝트 생성 중...');
    const project = this.generator.generateProject(projectOptions);
    
    console.log(`\n📊 프로젝트 통계:`);
    console.log(`  - 파일 수: ${project.files.length}`);
    console.log(`  - 총 크기: ${(project.totalSize / 1024).toFixed(2)} KB`);
    console.log(`  - 총 함수: ${project.totalFunctions}`);
    console.log(`  - 언어: ${[...new Set(project.files.map(f => f.language))].join(', ')}`);
    
    // 1. 순차 처리 테스트
    console.log('\n\n📝 === 순차 처리 (단일 Agent) ===');
    const sequentialResults = await this.runSequential(project);
    
    // 2. 병렬 처리 테스트
    console.log('\n\n⚡ === 병렬 처리 (Multi Sub-Agent) ===');
    const parallelResults = await this.runParallel(project);
    
    // 3. 성능 비교
    this.compareResults(sequentialResults, parallelResults);
  }

  async runSequential(project) {
    const agent = new SubAgentSimulator('main');
    const results = [];
    const totalStartTime = performance.now();
    
    for (const file of project.files) {
      const modification = this.generator.generateModification(file);
      console.log(`처리 중: ${file.name}...`);
      
      const result = await agent.processFile(file, modification);
      results.push(result);
      
      if (result.success) {
        console.log(`  ✅ 완료: ${result.processingTime.toFixed(2)}ms`);
      } else {
        console.log(`  ❌ 실패: ${result.error}`);
      }
    }
    
    const totalTime = performance.now() - totalStartTime;
    
    return {
      type: 'sequential',
      results,
      totalTime,
      successCount: results.filter(r => r.success).length,
      avgProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
    };
  }

  async runParallel(project) {
    const results = [];
    const totalStartTime = performance.now();
    
    // 파일을 청크로 나누기
    const chunks = this.createChunks(project.files, this.maxConcurrency);
    
    console.log(`병렬 처리 구성: ${this.maxConcurrency}개 Sub-Agent 사용`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n청크 ${i + 1}/${chunks.length} 처리 중 (${chunk.length}개 파일)...`);
      
      // 병렬로 처리
      const promises = chunk.map(async (file, index) => {
        const agent = new SubAgentSimulator(`agent-${i}-${index}`);
        const modification = this.generator.generateModification(file);
        return agent.processFile(file, modification);
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
      
      // 결과 출력
      chunkResults.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.fileName}: ${result.processingTime.toFixed(2)}ms (${result.agentId})`);
        } else {
          console.log(`  ❌ ${result.fileName}: ${result.error} (${result.agentId})`);
        }
      });
    }
    
    const totalTime = performance.now() - totalStartTime;
    
    return {
      type: 'parallel',
      results,
      totalTime,
      successCount: results.filter(r => r.success).length,
      avgProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
      concurrency: this.maxConcurrency
    };
  }

  createChunks(files, chunkSize) {
    const chunks = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }
    return chunks;
  }

  compareResults(sequential, parallel) {
    console.log('\n\n📊 === 성능 비교 분석 ===');
    console.log('| 처리 방식 | 총 시간 | 평균 처리 시간 | 성공률 | 처리량 |');
    console.log('|-----------|---------|----------------|--------|--------|');
    
    const seqThroughput = sequential.results.length / (sequential.totalTime / 1000);
    const parThroughput = parallel.results.length / (parallel.totalTime / 1000);
    
    console.log(`| 순차 처리 | ${sequential.totalTime.toFixed(0)}ms | ${sequential.avgProcessingTime.toFixed(2)}ms | ${(sequential.successCount / sequential.results.length * 100).toFixed(1)}% | ${seqThroughput.toFixed(2)} files/s |`);
    console.log(`| 병렬 처리 | ${parallel.totalTime.toFixed(0)}ms | ${parallel.avgProcessingTime.toFixed(2)}ms | ${(parallel.successCount / parallel.results.length * 100).toFixed(1)}% | ${parThroughput.toFixed(2)} files/s |`);
    
    const speedup = sequential.totalTime / parallel.totalTime;
    const efficiency = (speedup / parallel.concurrency) * 100;
    
    console.log(`\n🚀 성능 향상:`);
    console.log(`  - 속도 향상: ${speedup.toFixed(2)}배`);
    console.log(`  - 병렬 효율성: ${efficiency.toFixed(1)}%`);
    console.log(`  - 시간 절약: ${(sequential.totalTime - parallel.totalTime).toFixed(0)}ms`);
    
    if (efficiency > 75) {
      console.log('  ✅ 우수한 병렬 효율성');
    } else if (efficiency > 50) {
      console.log('  ⚠️ 적절한 병렬 효율성');
    } else {
      console.log('  ❌ 낮은 병렬 효율성 (오버헤드 과다)');
    }
  }
}

/**
 * 다양한 시나리오 테스트
 */
async function runScenarioTests() {
  console.log('\n\n🎭 === 시나리오별 병렬 처리 테스트 ===\n');
  
  const scenarios = [
    {
      name: '소규모 프로젝트',
      options: { fileCount: 10, avgFunctionsPerFile: 20 },
      concurrency: 2
    },
    {
      name: '중규모 프로젝트',
      options: { fileCount: 50, avgFunctionsPerFile: 30 },
      concurrency: 4
    },
    {
      name: '대규모 프로젝트',
      options: { fileCount: 100, avgFunctionsPerFile: 40 },
      concurrency: 8
    },
    {
      name: '다국어 프로젝트',
      options: { 
        fileCount: 30, 
        avgFunctionsPerFile: 25,
        languages: ['rust', 'javascript', 'html', 'rust', 'javascript']
      },
      concurrency: 6
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 시나리오: ${scenario.name}`);
    console.log(`${'='.repeat(60)}`);
    
    const orchestrator = new ParallelProcessingOrchestrator({
      maxConcurrency: scenario.concurrency
    });
    
    await orchestrator.runParallelTest(scenario.options);
  }
}

// 메인 실행
async function main() {
  console.log('🏁 Sub-Agent 병렬 처리 성능 테스트 시작\n');
  console.log('환경: Apple M4 Pro 24GB\n');
  
  // 1. 기본 병렬 처리 테스트
  const orchestrator = new ParallelProcessingOrchestrator({ maxConcurrency: 4 });
  await orchestrator.runParallelTest({
    fileCount: 20,
    avgFunctionsPerFile: 25,
    languages: ['rust', 'javascript', 'html']
  });
  
  // 2. 시나리오별 테스트
  await runScenarioTests();
  
  console.log('\n\n✅ 모든 병렬 처리 테스트 완료!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  VirtualProjectGenerator,
  SubAgentSimulator,
  ParallelProcessingOrchestrator
};