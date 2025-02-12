const CodeBridge = require('../code-bridge');

const processor = new CodeBridge();

// 원본 코드
const originalJS = `
class Example {
    method1() { return 1; }
    method2() { return 2; }
    method3(x, y) { return x + y; }
}
`;

// 다양한 변경사항이 있는 스니펫
const snippetJS = `
    // @access private
    // @decorator log
    // @decorator validate
    method1() { return 10; }

    // @delete
    method2() { }

    // @rename calculate
    // @params a, b, c
    method3(x, y) { return x + y + z; }

    // @access public
    // @decorator async
    newMethod() { return 'new'; }
`;

// JavaScript 처리
const processedJS = processor.process(originalJS, snippetJS, 'js');
console.log('처리된 JavaScript:', processedJS);

/* 출력 결과:
class Example {
    @log
    @validate
    private method1() { return 10; }

    @async
    calculate(a, b, c) { return x + y + z; }

    @async
    public newMethod() { return 'new'; }
}
*/
