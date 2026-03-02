// Test case for media parser whitespace handling
const testCases = [
  "MEDIA:/path/to/file.jpg",
  "  MEDIA : /path/to/file.jpg",
  "\tMEDIA:\t/path/to/file.jpg",
  "MEDIA   :   /path/to/file.jpg",
  " \t MEDIA \t : \t /path/to/file.jpg"
];

testCases.forEach((testCase, index) => {
  const result = testCase.replace(/^\s*MEDIA\s*:\s*/i, "");
  console.log(`Test ${index + 1}: "${testCase}" -> "${result}"`);
});