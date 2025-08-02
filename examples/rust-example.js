// Rust 코드 병합 예시
// 이 파일은 CodeBridge가 Rust를 지원하도록 확장될 때 사용할 예시입니다

const rustOriginal = `
struct Calculator {
    value: f64,
}

impl Calculator {
    fn new() -> Self {
        Calculator { value: 0.0 }
    }
    
    fn add(&mut self, x: f64) {
        self.value += x;
    }
    
    fn get_value(&self) -> f64 {
        self.value
    }
}
`;

const rustSnippet = `
    // @visibility pub
    // @const
    fn new() -> Self {
        Calculator { value: 0.0 }
    }
    
    // @visibility pub
    // @attributes #[inline]
    fn add(&mut self, x: f64) {
        self.value += x;
    }
    
    // @visibility pub
    // @attributes #[inline]
    fn get_value(&self) -> f64 {
        self.value
    }
    
    // @add
    // @visibility pub
    // @generic <T: Into<f64>>
    fn add_generic<T: Into<f64>>(&mut self, x: T) {
        self.value += x.into();
    }
    
    // @add
    // @visibility pub
    // @async
    async fn calculate_async(&self, operation: &str) -> Result<f64, String> {
        match operation {
            "double" => Ok(self.value * 2.0),
            "square" => Ok(self.value * self.value),
            _ => Err("Unknown operation".to_string()),
        }
    }
`;

console.log('Rust 병합 예시:');
console.log('원본:', rustOriginal);
console.log('스니펫:', rustSnippet);
console.log('\n병합 후 예상 결과:');
console.log(`
struct Calculator {
    value: f64,
}

impl Calculator {
    pub const fn new() -> Self {
        Calculator { value: 0.0 }
    }
    
    #[inline]
    pub fn add(&mut self, x: f64) {
        self.value += x;
    }
    
    #[inline]
    pub fn get_value(&self) -> f64 {
        self.value
    }
    
    pub fn add_generic<T: Into<f64>>(&mut self, x: T) {
        self.value += x.into();
    }
    
    pub async fn calculate_async(&self, operation: &str) -> Result<f64, String> {
        match operation {
            "double" => Ok(self.value * 2.0),
            "square" => Ok(self.value * self.value),
            _ => Err("Unknown operation".to_string()),
        }
    }
}
`);