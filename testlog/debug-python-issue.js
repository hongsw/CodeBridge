/**
 * Python 전처리 문제 디버그 도구
 */

const OllamaCodeBridge = require('../integrations/ollama-integration');
const { preprocessOllamaResponse } = require('../utils/ollama-preprocessor');

async function debugPythonIssue() {
  console.log('🐍 Python 전처리 문제 분석 시작\n');
  
  const pythonCode = `
def calculate_average(numbers):
    total = sum(numbers)
    return total / len(numbers)`;
  
  const task = "Add type hints, docstring, and error handling for empty list";
  
  const ollamaCodeBridge = new OllamaCodeBridge({ 
    model: 'deepseek-coder:6.7b',
    temperature: 0.3 
  });
  
  try {
    // 1. 직접 Ollama API 호출해서 원본 응답 확인
    console.log('🔍 1단계: 원본 LLM 응답 확인');
    console.log('=' + '='.repeat(50));
    
    const prompt = `Original Python code:
\`\`\`python
${pythonCode}
\`\`\`

Task: ${task}

Return only the improved Python code with type hints, docstring, and error handling.`;
    
    const rawResponse = await ollamaCodeBridge.callOllama(prompt);
    console.log('원본 LLM 응답:');
    console.log('---');
    console.log(rawResponse);
    console.log('---\n');
    
    // 2. 전처리기를 통한 처리 과정 확인
    console.log('🔍 2단계: 전처리기 동작 분석');
    console.log('=' + '='.repeat(50));
    
    const processed = preprocessOllamaResponse(rawResponse, 'deepseek-coder', true);
    console.log('전처리 결과:');
    console.log('---');
    console.log(processed);
    console.log('---\n');
    
    // 3. 전처리기 문제점 분석
    console.log('🔍 3단계: 문제점 분석');
    console.log('=' + '='.repeat(50));
    
    // JavaScript 코드 블록 패턴만 찾는지 확인
    const jsBlockPattern = /```(?:javascript|js|jsx|typescript|ts)?\n?([\\s\\S]*?)```/g;
    const pythonBlockPattern = /```(?:python|py)?\n?([\\s\\S]*?)```/g;
    
    const jsMatches = [...rawResponse.matchAll(jsBlockPattern)];
    const pythonMatches = [...rawResponse.matchAll(pythonBlockPattern)];
    
    console.log(`JavaScript 블록 발견: ${jsMatches.length}개`);
    console.log(`Python 블록 발견: ${pythonMatches.length}개`);
    
    if (pythonMatches.length > 0) {
      console.log('\\nPython 블록 내용:');
      pythonMatches.forEach((match, i) => {
        console.log(`--- Python 블록 ${i + 1} ---`);
        console.log(match[1]);
        console.log('---');
      });
    }
    
    // 4. 수동으로 Python 코드 추출 시도
    console.log('\\n🔍 4단계: 수동 Python 코드 추출');
    console.log('=' + '='.repeat(50));
    
    // Python 키워드 기반 추출
    const lines = rawResponse.split('\\n');
    const pythonLines = [];
    let inPythonCode = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Python 코드 시작 감지
      if (trimmed.startsWith('def ') || 
          trimmed.startsWith('class ') ||
          trimmed.startsWith('from ') ||
          trimmed.startsWith('import ') ||
          (trimmed.includes('"""') && pythonLines.length === 0)) {
        inPythonCode = true;
        pythonLines.push(line);
      }
      // Python 코드 계속
      else if (inPythonCode) {
        pythonLines.push(line);
        
        // 빈 줄이 연속으로 나오면 코드 끝으로 간주
        if (trimmed === '' && pythonLines[pythonLines.length - 2]?.trim() === '') {
          break;
        }
      }
    }
    
    const extractedPython = pythonLines.join('\\n').trim();
    console.log('수동 추출 결과:');
    console.log('---');
    console.log(extractedPython);
    console.log('---\\n');
    
    // 5. CodeBridge 호환성 테스트
    console.log('🔍 5단계: CodeBridge 호환성 분석');
    console.log('=' + '='.repeat(50));
    
    console.log('문제 분석:');
    console.log('1. 전처리기가 JavaScript 코드 블록 패턴만 인식');
    console.log('2. Python 문법이 JavaScript 파서로 전달됨'); 
    console.log('3. AST 파싱 실패로 "Unexpected token" 오류 발생');
    
    console.log('\\n해결 방안:');
    console.log('1. 언어별 전처리기 분리');
    console.log('2. Python 전용 코드 추출 로직');
    console.log('3. 언어 자동 감지 시스템');
    
  } catch (error) {
    console.error('디버그 실행 오류:', error.message);
  }
}

// 실행
if (require.main === module) {
  debugPythonIssue().catch(console.error);
}

module.exports = debugPythonIssue;