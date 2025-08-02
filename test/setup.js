// 테스트 환경 설정
console.log('테스트 환경을 초기화합니다...');

// 전역 테스트 헬퍼 함수
global.createTestClass = (className, methods) => {
  const methodsCode = Object.entries(methods)
    .map(([name, body]) => `  ${name}() { ${body} }`)
    .join('\n');
  
  return `
class ${className} {
${methodsCode}
}`;
};

// LLM 출력 시뮬레이터
global.simulateLLMOutput = (code, style = 'claude') => {
  const styles = {
    claude: (code) => `\`\`\`javascript\n${code}\n\`\`\``,
    gpt4: (code) => `Here's the improved code:\n\n\`\`\`js\n${code}\n\`\`\``,
    gemini: (code) => `개선된 코드:\n\n\`\`\`\n${code}\n\`\`\``,
    raw: (code) => code
  };
  
  return styles[style](code);
};

// 코드 정규화 헬퍼
global.normalizeCode = (code) => {
  return code
    .replace(/\s+/g, ' ')
    .replace(/\s*{\s*/g, ' { ')
    .replace(/\s*}\s*/g, ' } ')
    .trim();
};

// 테스트 타임아웃 설정
jest.setTimeout(10000);

// 전역 에러 핸들러
process.on('unhandledRejection', (error) => {
  console.error('처리되지 않은 Promise 거부:', error);
});