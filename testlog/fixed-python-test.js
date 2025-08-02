/**
 * 수정된 Python 테스트 - 전처리기 문제 해결
 */

const fs = require('fs').promises;
const path = require('path');
const OllamaCodeBridge = require('../integrations/ollama-integration');

// 개선된 다중 언어 전처리기
function enhancedPreprocessor(response, language = 'javascript') {
  console.log(`🔧 언어별 전처리 시작: ${language}`);
  
  // 1. 언어별 코드 블록 패턴
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
      /```(?:cpp|c\+\+|c)?\n?([\s\S]*?)```/g,
      /```\n?([\s\S]*?)```/g
    ]
  };
  
  const patterns = languagePatterns[language] || languagePatterns.javascript;
  
  // 2. 코드 블록 추출
  for (const pattern of patterns) {
    const matches = [...response.matchAll(pattern)];
    if (matches.length > 0) {
      const longestMatch = matches.reduce((prev, current) => 
        current[1].length > prev[1].length ? current : prev
      );
      
      let extracted = longestMatch[1].trim();
      console.log(`✅ 코드 블록 추출 성공 (${extracted.length} 문자)`);
      
      // 3. 언어별 키워드 검증
      const languageKeywords = {
        python: /\b(def|class|import|from|if|for|while|return|raise|try|except)\b/,
        javascript: /\b(function|class|const|let|var|if|for|while|return|throw|try|catch)\b/,
        rust: /\b(fn|struct|impl|use|if|for|while|return|match|pub|mod)\b/,
        cpp: /\b(class|struct|int|void|if|for|while|return|throw|try|catch|#include)\b/
      };
      
      const keywordPattern = languageKeywords[language];
      if (keywordPattern && keywordPattern.test(extracted)) {
        console.log(`✅ ${language} 키워드 검증 통과`);
        return extracted;
      }
      
      return extracted;
    }
  }
  
  // 4. 코드 블록이 없다면 직접 추출 시도 (언어별)
  console.log('⚠️ 코드 블록 없음, 직접 추출 시도');
  
  const lines = response.split('\n');
  const codeLines = [];
  let inCode = false;
  
  if (language === 'python') {
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Python 코드 시작 감지
      if (!inCode && (
        trimmed.startsWith('def ') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('from ') ||
        trimmed.startsWith('import ') ||
        /^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(trimmed)
      )) {
        inCode = true;
        codeLines.push(line);
      }
      // 코드 계속
      else if (inCode) {
        codeLines.push(line);
        
        // 연속 빈 줄로 끝 감지
        if (trimmed === '' && codeLines[codeLines.length - 2]?.trim() === '') {
          break;
        }
      }
    }
  }
  
  const extracted = codeLines.join('\n').trim();
  console.log(`📏 직접 추출 결과: ${extracted.length} 문자`);
  return extracted;
}

async function testFixedPythonProcessing() {
  console.log('🐍 수정된 Python 처리 테스트\n');
  
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
    console.log('🔍 1단계: 원본 Python 코드');
    console.log('---');
    console.log(pythonCode);
    console.log('---\n');
    
    console.log('🔍 2단계: LLM 응답 생성');
    const prompt = `Original Python code:
\`\`\`python
${pythonCode}
\`\`\`

Task: ${task}

Return only the improved Python code with type hints, docstring, and error handling. Use proper Python syntax.`;
    
    const rawResponse = await ollamaCodeBridge.callOllama(prompt);
    console.log('원본 LLM 응답:');
    console.log('---');
    console.log(rawResponse);
    console.log('---\n');
    
    console.log('🔍 3단계: 개선된 전처리기 적용');
    const improvedCode = enhancedPreprocessor(rawResponse, 'python');
    console.log('전처리 결과:');
    console.log('---');
    console.log(improvedCode);
    console.log('---\n');
    
    console.log('🔍 4단계: Python 코드 품질 분석');
    const hasTypeHints = improvedCode.includes('->') || improvedCode.includes(': ');
    const hasDocstring = improvedCode.includes('"""') || improvedCode.includes("'''");
    const hasErrorHandling = improvedCode.includes('raise') || improvedCode.includes('except');
    const hasImports = improvedCode.includes('import') || improvedCode.includes('from');
    
    console.log('품질 메트릭:');
    console.log(`  타입 힌트: ${hasTypeHints ? '✅' : '❌'}`);
    console.log(`  독스트링: ${hasDocstring ? '✅' : '❌'}`);
    console.log(`  에러 처리: ${hasErrorHandling ? '✅' : '❌'}`);
    console.log(`  임포트: ${hasImports ? '✅' : '❌'}`);
    
    const qualityScore = [hasTypeHints, hasDocstring, hasErrorHandling, hasImports]
      .filter(Boolean).length;
    console.log(`\\n품질 점수: ${qualityScore}/4 (${(qualityScore/4*100).toFixed(1)}%)`);
    
    // 결과 저장
    const result = {
      timestamp: new Date().toISOString(),
      originalCode: pythonCode,
      task,
      rawResponse,
      improvedCode,
      qualityMetrics: {
        hasTypeHints,
        hasDocstring, 
        hasErrorHandling,
        hasImports
      },
      qualityScore: qualityScore / 4,
      success: improvedCode.length > 0 && qualityScore >= 2
    };
    
    const logFile = path.join(__dirname, 'fixed-python-test-result.json');
    await fs.writeFile(logFile, JSON.stringify(result, null, 2));
    console.log(`\\n💾 결과 저장: ${logFile}`);
    
    if (result.success) {
      console.log('\\n🎉 Python 처리 성공! 전처리기 문제 해결됨');
    } else {
      console.log('\\n⚠️ 아직 개선이 필요함');
    }
    
  } catch (error) {
    console.error('테스트 실행 오류:', error.message);
  }
}

// 실행
if (require.main === module) {
  testFixedPythonProcessing().catch(console.error);
}

module.exports = { enhancedPreprocessor, testFixedPythonProcessing };