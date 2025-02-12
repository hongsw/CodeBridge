const CodeBridge = require('../code-bridge');

const processor = new CodeBridge();

// 원본 코드 (다양한 주석 포함)
const originalJS = `
/**
 * 예제 클래스
 * @class Example
 */
class Example {
    /**
     * 첫 번째 메서드
     * @returns {number}
     */
    method1() { 
        // 1을 반환
        return 1; 
    };

    /* 두 번째 메서드 */
    method2() { 
        /* 
         * 멀티라인 주석
         */
        return 2; 
    };

    // 세 번째 메서드
    // @param x {number}
    // @param y {number}
    method3(x, y) { return x + y; };
}
`;

// 스니펫 (다양한 주석과 명령어 포함)
const snippetJS = `
    /**
     * 메서드1 수정
     */
    // @access private
    // @decorator log
    // @decorator validate
    method1() { 
        // 수정된 값 반환
        return 10; 
    };

    /*
     * 메서드2 삭제
     */
    // @delete
    method2() { };

    // 메서드3 이름 변경 및 매개변수 수정
    // @rename calculate
    // @params a, b, c
    // @returns {number}
    method3(x, y) { 
        // 새로운 계산 로직
        return x + y + z; 
    };

    /**
     * 새로운 메서드
     * @access public
     */
    // @access public
    // @decorator async
    newMethod() { 
        // 새로운 기능
        return 'new'; 
    };
`;

try {
    // JavaScript 처리
    const processedJS = processor.process(originalJS, snippetJS, 'js');
    console.log('처리된 JavaScript:', processedJS);
} catch (error) {
    console.error('처리 중 오류 발생:', error);
    console.error('오류 위치:', error.loc);
    console.error('오류 코드:', error.code);
}
