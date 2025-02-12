const CodeBridge = require('../code-bridge');

const processor = new CodeBridge();

// HTML 예시
const originalHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Example</title>
</head>
<body>
    <div id="app">
        <h1>Original Content</h1>
    </div>
    <script>
        class Example {
            method1() { return 1; }
        }
    </script>
</body>
</html>
`;

const snippetHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Example</title>
</head>
<body>
    <div id="app">
        <h1>Snippet Content</h1>
    </div>
    <script>
        class Example {
            method1() { return 1; }
              method2() { return 2; }
      }
    </script>
</body>
</html>
`;

// HTML 처리
const processedHTML = processor.process(originalHTML, snippetHTML, 'html');
console.log('처리된 HTML:', processedHTML);

// JavaScript 예시
const originalJS = `
class Example {
    method1() { return 1; }
    method2() { return 2; }
}
`;

const snippetJS = `
    method1() { return 10; }
`;

// JavaScript 처리
const processedJS = processor.process(originalJS, snippetJS, 'js');
console.log('처리된 JavaScript:', processedJS);
