// Test the integrated Vision + LLM + Rules pipeline
const fs = require('fs');
const path = require('path');

// Create a simple test text file
const testText = `INSURANCE POLICY DOCUMENT

Coverage Details:
The maximum payable amount is R20,000 per claim.
Coverage is limited to R10,000 for personal items.

Reporting Requirements:
You must report the incident to the police within 24 hours.
Failure to report within 30 days will result in rejection.

Excess and Deductibles:
An excess of R5,000 applies to all claims.
You are liable for the first amount payable.

Exclusions:
Damage caused by power surge is excluded.
We do not cover wear and tear.
Acts of God are not covered.

Vehicle Requirements:
Vehicle must be roadworthy.
Tyres must be in good condition.
Driver must have a valid licence.

Premium Terms:
Premiums are subject to review.
We reserve the right to increase premiums.
`;

// Save test file
const testFilePath = path.join(__dirname, 'test_contract.txt');
fs.writeFileSync(testFilePath, testText);

console.log('✓ Created test contract file:', testFilePath);
console.log('\\nTo test the /analyze endpoint:');
console.log('1. Make sure backend server is running (npm run dev)');
console.log('2. Run this command:\\n');
console.log('curl -X POST http://localhost:8080/analyze -F "file=@' + testFilePath + '" | jq .');
console.log('\\nOr test with URL:');
console.log('curl -X POST http://localhost:8080/analyze -H "Content-Type: application/json" -d \'{"url": "https://example.com/contract.html"}\' | jq .');
console.log('\\nTo view admin insights:');
console.log('curl http://localhost:8080/admin/insights | jq .');
