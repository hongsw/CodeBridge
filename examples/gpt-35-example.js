/**
 * GPT-3.5 및 저가형 모델과 CodeBridge 사용 예제
 */

const CodeBridge = require('../code-bridge');
const { preprocessGPT35Output } = require('../utils/gpt-35-preprocessor');

// CodeBridge 인스턴스 생성
const processor = new CodeBridge();

// 원본 코드
const originalCode = `
class UserService {
  constructor() {
    this.users = [];
  }
  
  getUser(id) {
    return this.users.find(user => user.id === id);
  }
  
  addUser(user) {
    this.users.push(user);
    return user;
  }
  
  deleteUser(id) {
    const index = this.users.findIndex(user => user.id === id);
    if (index > -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }
}
`;

// GPT-3.5 응답 시뮬레이션 예제들
const gpt35Examples = {
  // 예제 1: 기본적인 메서드 수정
  example1: {
    prompt: "Add error handling to getUser method",
    response: `
Here's the updated getUser method with error handling:

\`\`\`
getUser(id) {
  try {
    if (!id) {
      throw new Error('User ID is required');
    }
    
    const user = this.users.find(user => user.id === id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user:', error.message);
    return null;
  }
}
\`\`\`

This will handle cases where the ID is missing or the user doesn't exist.`
  },
  
  // 예제 2: 명령어 없이 자연어 설명
  example2: {
    prompt: "Make addUser method async and add validation",
    response: `
You should make the method async and add validation like this:

async addUser(user) {
  // Validate user data
  if (!user || !user.id || !user.name) {
    throw new Error('Invalid user data');
  }
  
  // Check if user already exists
  if (this.users.find(u => u.id === user.id)) {
    throw new Error('User already exists');
  }
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  this.users.push(user);
  return user;
}`
  },
  
  // 예제 3: 부정확한 마크다운
  example3: {
    prompt: "Add caching to getUser",
    response: `
To add caching, update the method:

\`\`\`
// Add caching for better performance
getUser(id) {
  // Check cache first
  if (this.cache && this.cache[id]) {
    console.log('Cache hit for user:', id);
    return this.cache[id];
  }
  
  const user = this.users.find(user => user.id === id);
  
  // Store in cache
  if (user && this.cache) {
    this.cache[id] = user;
  }
  
  return user;
}
\`\`\`
`
  },
  
  // 예제 4: 여러 설명과 함께
  example4: {
    prompt: "Make deleteUser safer with soft delete",
    response: `
Instead of permanently deleting users, you should implement soft delete.
This is safer because you can recover deleted data if needed.

Here's how to update the deleteUser method:

First, you'll need to add a 'deleted' flag to users.

deleteUser(id) {
  const user = this.users.find(user => user.id === id);
  
  if (!user) {
    console.warn('User not found:', id);
    return false;
  }
  
  // Soft delete - just mark as deleted
  user.deleted = true;
  user.deletedAt = new Date();
  
  console.log('User soft deleted:', id);
  return true;
}

You might also want to update getUser to exclude deleted users.`
  },
  
  // 예제 5: 매우 간단한 응답
  example5: {
    prompt: "Rename getUser to findUser",
    response: `findUser(id) {
  return this.users.find(user => user.id === id);
}`
  }
};

// 예제 실행 함수
function runExample(exampleName, example) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`예제: ${exampleName}`);
  console.log(`프롬프트: "${example.prompt}"`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log('GPT-3.5 원본 응답:');
  console.log(example.response);
  
  console.log('\n--- 전처리 후 ---\n');
  
  try {
    // 전처리
    const preprocessed = preprocessGPT35Output(example.response);
    console.log('전처리된 코드:');
    console.log(preprocessed);
    
    // CodeBridge로 처리
    const result = processor.process(originalCode, preprocessed, 'js');
    
    console.log('\n--- 최종 결과 ---\n');
    console.log(result);
    
    console.log('\n✅ 성공적으로 처리됨');
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('스택:', error.stack);
  }
}

// 모든 예제 실행
console.log('GPT-3.5 호환성 테스트 시작...\n');

Object.entries(gpt35Examples).forEach(([name, example]) => {
  runExample(name, example);
});

// 사용 가이드 출력
console.log(`\n${'='.repeat(60)}`);
console.log('GPT-3.5 사용 가이드');
console.log(`${'='.repeat(60)}\n`);

console.log(`
1. 명확한 프롬프트 사용:
   - "Return only the updated method code"
   - "Use // @command format for any special instructions"

2. 전처리기 활용:
   const preprocessed = preprocessGPT35Output(gptResponse);
   const result = processor.process(original, preprocessed, 'js');

3. 일반적인 문제 해결:
   - 코드 블록이 없을 때: 전처리기가 자동으로 메서드 추출
   - 자연어 명령어: 전처리기가 @command 형식으로 변환
   - 불필요한 설명: 전처리기가 자동으로 제거

4. 프롬프트 템플릿:
   "Update the [methodName] method to [change description].
    If you need to add decorators or change access, use:
    // @decorator [name]
    // @access [private|public|protected]
    Return only the method code in a code block."
`);

// 대화형 테스트 함수
function testCustomGPT35Response(response) {
  console.log('\n커스텀 GPT-3.5 응답 테스트...\n');
  
  try {
    const preprocessed = preprocessGPT35Output(response);
    console.log('전처리된 코드:', preprocessed);
    
    const result = processor.process(originalCode, preprocessed, 'js');
    console.log('\n결과:', result);
    
    return result;
  } catch (error) {
    console.error('오류:', error.message);
    return null;
  }
}

// Export for testing
module.exports = {
  testCustomGPT35Response,
  gpt35Examples
};