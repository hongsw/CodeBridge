// Python 코드 병합 예시
// 이 파일은 CodeBridge가 Python을 지원하도록 확장될 때 사용할 예시입니다

const pythonOriginal = `
class DataProcessor:
    def __init__(self):
        self.data = []
    
    def process_data(self, input_data):
        """데이터를 처리합니다."""
        return [item * 2 for item in input_data]
    
    def save_data(self, filename):
        with open(filename, 'w') as f:
            f.write(str(self.data))
`;

const pythonSnippet = `
    # @decorator lru_cache(maxsize=128)
    # @type_hints List[int] -> List[int]
    def process_data(self, input_data):
        """
        개선된 데이터 처리 메서드
        
        Args:
            input_data: 처리할 데이터 리스트
            
        Returns:
            처리된 데이터 리스트
        """
        # 캐싱과 함께 더 효율적인 처리
        return [self._transform(item) for item in input_data]
    
    # @add
    # @access private
    def _transform(self, item):
        """개별 아이템 변환"""
        return item * 2 + 1
    
    # @async
    # @rename save_data_async
    def save_data(self, filename):
        """비동기 파일 저장"""
        async with aiofiles.open(filename, 'w') as f:
            await f.write(json.dumps(self.data))
`;

console.log('Python 병합 예시:');
console.log('원본:', pythonOriginal);
console.log('스니펫:', pythonSnippet);
console.log('\n병합 후 예상 결과:');
console.log(`
class DataProcessor:
    def __init__(self):
        self.data = []
    
    @lru_cache(maxsize=128)
    def process_data(self, input_data: List[int]) -> List[int]:
        """
        개선된 데이터 처리 메서드
        
        Args:
            input_data: 처리할 데이터 리스트
            
        Returns:
            처리된 데이터 리스트
        """
        # 캐싱과 함께 더 효율적인 처리
        return [self._transform(item) for item in input_data]
    
    def _transform(self, item):
        """개별 아이템 변환"""
        return item * 2 + 1
    
    async def save_data_async(self, filename):
        """비동기 파일 저장"""
        async with aiofiles.open(filename, 'w') as f:
            await f.write(json.dumps(self.data))
`);