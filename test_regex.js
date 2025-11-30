// Quick test to debug regex matching
const text = "Tyres must be in good condition.";
const pattern = "good\\s+condition";
const regex = new RegExp(pattern, 'gi');
const match = regex.exec(text);

console.log('Text:', text);
console.log('Pattern:', pattern);
console.log('Match:', match);

// Test another one
const text2 = "The maximum payable amount is R20 000.";
const pattern2 = "maximum(?:\\s+payable)?(?:\\s+amount)?\\s+(?:is|shall not exceed)\\s+R?\\s?\\d[\\d\\s,]*";
const regex2 = new RegExp(pattern2, 'gi');
const match2 = regex2.exec(text2);

console.log('\nText2:', text2);
console.log('Pattern2:', pattern2);
console.log('Match2:', match2);
