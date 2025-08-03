const CodeBridge = require('../code-bridge');

// Rust 코드 병합 예제

const bridge = new CodeBridge();

// 예제 1: 새로운 함수 추가
console.log('=== 예제 1: 새로운 Rust 함수 추가 ===');
const originalRust1 = `
fn main() {
    println!("Hello, world!");
}

fn greet(name: &str) {
    println!("Hello, {}!", name);
}
`;

const snippetRust1 = `
// @visibility pub
fn calculate_sum(a: i32, b: i32) -> i32 {
    a + b
}
`;

const result1 = bridge.process(originalRust1, snippetRust1, 'rust');
console.log('결과:');
console.log(result1);
console.log('\n---\n');

// 예제 2: 기존 함수 수정 및 주석 명령어 사용
console.log('=== 예제 2: 기존 함수 수정 ===');
const originalRust2 = `
fn process_data(data: Vec<i32>) -> i32 {
    data.iter().sum()
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5];
    let result = process_data(numbers);
    println!("Sum: {}", result);
}
`;

const snippetRust2 = `
// @async
// @visibility pub
fn process_data(data: Vec<i32>) -> i32 {
    // 비동기 처리를 위한 개선된 버전
    let sum: i32 = data.iter().sum();
    println!("Processing {} items, sum: {}", data.len(), sum);
    sum
}
`;

const result2 = bridge.process(originalRust2, snippetRust2, 'rust');
console.log('결과:');
console.log(result2);
console.log('\n---\n');

// 예제 3: 함수 이름 변경
console.log('=== 예제 3: 함수 이름 변경 ===');
const originalRust3 = `
pub struct Calculator;

impl Calculator {
    pub fn add(a: f64, b: f64) -> f64 {
        a + b
    }
    
    pub fn subtract(a: f64, b: f64) -> f64 {
        a - b
    }
}
`;

const snippetRust3 = `
// @rename sub
pub fn subtract(a: f64, b: f64) -> f64 {
    a - b
}
`;

const result3 = bridge.process(originalRust3, snippetRust3, 'rust');
console.log('결과:');
console.log(result3);
console.log('\n---\n');

// 예제 4: 함수 삭제
console.log('=== 예제 4: 함수 삭제 ===');
const originalRust4 = `
fn helper_function() {
    println!("This is a helper");
}

fn deprecated_function() {
    println!("This function is deprecated");
}

fn main() {
    helper_function();
}
`;

const snippetRust4 = `
// @delete
fn deprecated_function() {
    // 이 함수는 삭제됩니다
}
`;

const result4 = bridge.process(originalRust4, snippetRust4, 'rust');
console.log('결과:');
console.log(result4);
console.log('\n---\n');

// 예제 5: unsafe 함수 추가
console.log('=== 예제 5: Unsafe 함수 추가 ===');
const originalRust5 = `
use std::ptr;

pub struct RawBuffer {
    ptr: *mut u8,
    len: usize,
}
`;

const snippetRust5 = `
// @unsafe
// @visibility pub
fn raw_copy(src: *const u8, dst: *mut u8, len: usize) {
    ptr::copy_nonoverlapping(src, dst, len);
}
`;

const result5 = bridge.process(originalRust5, snippetRust5, 'rust');
console.log('결과:');
console.log(result5);

console.log('\n=== Rust 예제 완료 ===');