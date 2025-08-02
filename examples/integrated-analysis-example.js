// 통합 정적 분석 예제
// CodeBridge + 정적 분석 도구 통합 시나리오

const CodeBridge = require('../code-bridge');
const { StaticAnalysisIntegrator } = require('../static-analysis-integrator');

// 예제 1: JavaScript 코드 병합 후 정적 분석
async function exampleJavaScriptMerge() {
  const processor = new CodeBridge();
  const analyzer = new StaticAnalysisIntegrator();
  
  // 원본 코드
  const originalJS = `
  class DataService {
    constructor() {
      this.cache = {};
    }
    
    async fetchData(id) {
      if (this.cache[id]) {
        return this.cache[id];
      }
      
      const response = await fetch(\`/api/data/\${id}\`);
      const data = await response.json();
      this.cache[id] = data;
      return data;
    }
    
    clearCache() {
      this.cache = {};
    }
  }
  `;
  
  // Claude의 개선 스니펫 (주석 명령어 포함)
  const snippetJS = `
    // @decorator memoize
    // @decorator logPerformance
    async fetchData(id) {
      // 입력 검증 추가
      if (!id || typeof id !== 'string') {
        throw new TypeError('Invalid ID parameter');
      }
      
      if (this.cache[id]) {
        console.log(\`Cache hit for ID: \${id}\`);
        return this.cache[id];
      }
      
      try {
        // XSS 방지를 위한 입력 살균
        const sanitizedId = this.sanitizeInput(id);
        const response = await fetch(\`/api/data/\${sanitizedId}\`);
        
        // 응답 상태 검증
        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        
        const data = await response.json();
        
        // 데이터 검증
        if (!this.validateData(data)) {
          throw new Error('Invalid data format received');
        }
        
        this.cache[id] = data;
        return data;
      } catch (error) {
        console.error(\`Failed to fetch data for ID: \${id}\`, error);
        throw error;
      }
    }
    
    // @add
    // @access private
    sanitizeInput(input) {
      // HTML 특수 문자 이스케이프
      return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    
    // @add
    // @access private
    validateData(data) {
      return data && typeof data === 'object' && 'id' in data;
    }
  `;
  
  console.log('=== JavaScript 병합 및 분석 ===\n');
  
  // 1. 코드 병합
  const mergedCode = processor.process(originalJS, snippetJS, 'js');
  console.log('병합 완료 ✓');
  
  // 2. 정적 분석 실행
  const analysisResult = await analyzer.analyzeAndStabilize(mergedCode, 'javascript', {
    autoFix: true,
    strict: true
  });
  
  console.log('\n📊 분석 결과:');
  console.log(`안정성 점수: ${analysisResult.stabilityScore.score}/100 (${analysisResult.stabilityScore.grade})`);
  console.log('\n🔍 발견된 문제:');
  
  if (analysisResult.analysis.syntax.length > 0) {
    console.log('문법 오류:', analysisResult.analysis.syntax);
  }
  
  if (analysisResult.analysis.security.length > 0) {
    console.log('보안 이슈:', analysisResult.analysis.security);
  }
  
  console.log('\n✅ 자동 수정 적용 완료');
  console.log('최종 코드:\n', analysisResult.code);
}

// 예제 2: Python 코드 병합 후 정적 분석
async function examplePythonMerge() {
  const processor = new CodeBridge();
  const analyzer = new StaticAnalysisIntegrator();
  
  const originalPython = `
class DataProcessor:
    def __init__(self):
        self.results = []
    
    def process_batch(self, items):
        processed = []
        for item in items:
            result = self.transform(item)
            processed.append(result)
        return processed
    
    def transform(self, item):
        return item * 2
  `;
  
  const snippetPython = `
    # @decorator lru_cache(maxsize=1000)
    # @type_hints List[Any] -> List[ProcessedItem]
    def process_batch(self, items: List[Any]) -> List[ProcessedItem]:
        """
        배치 처리 함수 (개선된 버전)
        
        Args:
            items: 처리할 아이템 리스트
            
        Returns:
            처리된 아이템 리스트
            
        Raises:
            ValueError: 빈 리스트가 입력된 경우
        """
        if not items:
            raise ValueError("Items list cannot be empty")
        
        # 병렬 처리를 위한 청크 분할
        chunk_size = 100
        chunks = [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]
        
        processed = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_to_chunk = {
                executor.submit(self._process_chunk, chunk): chunk 
                for chunk in chunks
            }
            
            for future in concurrent.futures.as_completed(future_to_chunk):
                try:
                    result = future.result()
                    processed.extend(result)
                except Exception as exc:
                    logger.error(f'Chunk processing failed: {exc}')
                    raise
        
        return processed
    
    # @add
    # @access private
    def _process_chunk(self, chunk: List[Any]) -> List[ProcessedItem]:
        """청크 단위 처리"""
        return [self.transform(item) for item in chunk if self.validate_item(item)]
    
    # @add
    def validate_item(self, item: Any) -> bool:
        """아이템 유효성 검증"""
        return item is not None and hasattr(item, '__mul__')
  `;
  
  console.log('\n\n=== Python 병합 및 분석 ===\n');
  
  // 병합 및 분석
  const mergedPython = processor.process(originalPython, snippetPython, 'python');
  const pythonAnalysis = await analyzer.analyzeAndStabilize(mergedPython, 'python', {
    autoFix: true
  });
  
  console.log('📊 Python 분석 결과:');
  console.log(`안정성 점수: ${pythonAnalysis.stabilityScore.score}/100`);
  console.log('타입 안전성:', pythonAnalysis.analysis.semantic.typeSafety);
  console.log('코드 복잡도:', pythonAnalysis.analysis.performance.complexity);
}

// 예제 3: 통합 웹페이지 병합 및 분석
async function exampleWebPageMerge() {
  const processor = new CodeBridge();
  const analyzer = new StaticAnalysisIntegrator();
  
  const originalHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard</title>
    <style>
        .container { width: 100%; }
        .data-table { border: 1px solid #ccc; }
    </style>
</head>
<body>
    <div class="container">
        <table class="data-table">
            <tr><td>Data</td></tr>
        </table>
    </div>
    <script>
        function loadData() {
            fetch('/api/data')
                .then(response => response.json())
                .then(data => displayData(data));
        }
        
        function displayData(data) {
            // 테이블에 데이터 표시
        }
    </script>
</body>
</html>
  `;
  
  const snippetHTML = `
<!-- 보안 및 성능 개선 -->
<style>
    /* @override */
    .container { 
        width: 100%; 
        max-width: 1200px; 
        margin: 0 auto;
    }
    
    /* @add - 반응형 디자인 */
    @media (max-width: 768px) {
        .container { padding: 10px; }
        .data-table { font-size: 14px; }
    }
    
    /* @add - 접근성 개선 */
    .data-table {
        border-collapse: collapse;
        width: 100%;
    }
    
    .data-table th,
    .data-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    
    .data-table tr:hover {
        background-color: #f5f5f5;
    }
    
    /* @add - 다크 모드 지원 */
    @media (prefers-color-scheme: dark) {
        .container {
            background-color: #1a1a1a;
            color: #e0e0e0;
        }
        
        .data-table {
            border-color: #444;
        }
    }
</style>

<script>
    // @replace - 보안 강화된 데이터 로딩
    async function loadData() {
        try {
            // CSRF 토큰 추가
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            
            const response = await fetch('/api/data', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken || ''
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(\`HTTP error! status: \${response.status}\`);
            }
            
            const data = await response.json();
            
            // 데이터 검증
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format');
            }
            
            displayData(data);
        } catch (error) {
            console.error('Failed to load data:', error);
            showErrorMessage('데이터를 불러올 수 없습니다.');
        }
    }
    
    // @replace - XSS 방지 처리 추가
    function displayData(data) {
        const table = document.querySelector('.data-table');
        
        // 기존 내용 제거
        table.innerHTML = '';
        
        // 헤더 추가
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>ID</th><th>Name</th><th>Value</th>';
        table.appendChild(headerRow);
        
        // 데이터 행 추가 (XSS 방지)
        data.forEach(item => {
            const row = document.createElement('tr');
            
            // textContent 사용으로 XSS 방지
            const idCell = document.createElement('td');
            idCell.textContent = item.id || '';
            
            const nameCell = document.createElement('td');
            nameCell.textContent = item.name || '';
            
            const valueCell = document.createElement('td');
            valueCell.textContent = item.value || '';
            
            row.appendChild(idCell);
            row.appendChild(nameCell);
            row.appendChild(valueCell);
            
            table.appendChild(row);
        });
    }
    
    // @add - 에러 메시지 표시
    function showErrorMessage(message) {
        const container = document.querySelector('.container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.setAttribute('role', 'alert');
        container.prepend(errorDiv);
        
        // 5초 후 자동 제거
        setTimeout(() => errorDiv.remove(), 5000);
    }
    
    // @add - 페이지 로드 시 실행
    document.addEventListener('DOMContentLoaded', loadData);
</script>
  `;
  
  console.log('\n\n=== 웹페이지 병합 및 분석 ===\n');
  
  const mergedWeb = processor.process(originalHTML, snippetHTML, 'html');
  const webAnalysis = await analyzer.analyzeAndStabilize(mergedWeb, 'web', {
    checkAccessibility: true,
    checkSecurity: true,
    checkPerformance: true
  });
  
  console.log('📊 웹페이지 분석 결과:');
  console.log('보안 점수:', webAnalysis.analysis.security.score);
  console.log('접근성 점수:', webAnalysis.analysis.accessibility.score);
  console.log('성능 점수:', webAnalysis.analysis.performance.score);
  console.log('\n개선 사항:');
  console.log('- XSS 방지 구현 ✓');
  console.log('- CSRF 보호 추가 ✓');
  console.log('- 반응형 디자인 적용 ✓');
  console.log('- 다크 모드 지원 ✓');
  console.log('- 에러 처리 강화 ✓');
}

// 모든 예제 실행
async function runAllExamples() {
  try {
    await exampleJavaScriptMerge();
    await examplePythonMerge();
    await exampleWebPageMerge();
    
    console.log('\n\n✅ 모든 예제 실행 완료!');
    console.log('CodeBridge와 정적 분석 도구의 통합으로 안전하고 품질 높은 코드 병합이 가능합니다.');
  } catch (error) {
    console.error('예제 실행 중 오류:', error);
  }
}

// 실행
runAllExamples();