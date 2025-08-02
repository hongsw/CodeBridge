module.exports = {
  testEnvironment: 'node',
  
  // 테스트 파일 패턴
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],
  
  // 커버리지 설정
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'code-bridge.js',
    'enhanced-code-bridge.js',
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/examples/**'
  ],
  
  // 커버리지 임계값
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  
  // 리포터 설정
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  
  // 테스트 타임아웃
  testTimeout: 10000,
  
  // 변환 설정
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  
  // 모듈 확장자
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
  
  // 테스트 환경 설정
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // 상세 출력
  verbose: true,
  
  // 테스트 실행 전 설정 파일
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // 무시할 경로
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ]
};