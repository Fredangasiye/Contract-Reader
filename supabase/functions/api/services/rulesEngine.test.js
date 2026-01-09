const { findRedFlags, loadRules } = require('./rulesEngine');
const fs = require('fs');
const path = require('path');

// Load examples
const examplesPath = path.join(__dirname, '../../../docs/common_traps_examples.json');
const examples = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));

describe('Rules Engine', () => {
    test('should load rules correctly', () => {
        const rules = loadRules('insurance');
        expect(Object.keys(rules).length).toBeGreaterThan(0);
    });

    describe('Rule Verification', () => {
        // Iterate over each rule in the examples file
        Object.entries(examples).forEach(([ruleId, data]) => {
            describe(`Rule: ${ruleId}`, () => {
                // Positive tests
                data.positive.forEach((text, index) => {
                    test(`should detect positive example ${index + 1}`, async () => {
                        const flags = await findRedFlags(text, 'insurance');
                        const detected = flags.find(f => f.id === ruleId);
                        expect(detected).toBeDefined();
                        expect(detected.id).toBe(ruleId);
                    });
                });

                // Negative tests
                data.negative.forEach((text, index) => {
                    test(`should NOT detect negative example ${index + 1}`, async () => {
                        const flags = await findRedFlags(text, 'insurance');
                        const detected = flags.find(f => f.id === ruleId);
                        expect(detected).toBeUndefined();
                    });
                });
            });
        });
    });

    describe('Edge Cases', () => {
        test('should handle short text', async () => {
            const text = "Too short";
            const flags = await findRedFlags(text, 'insurance');
            expect(flags).toBeDefined();
        });

        test('should handle empty text', async () => {
            const flags = await findRedFlags('', 'insurance');
            expect(flags).toEqual([]);
        });

        test('should handle numeric formats', async () => {
            const text = "The maximum payable amount is R20,000.";
            const flags = await findRedFlags(text, 'insurance');
            const payoutFlag = flags.find(f => f.id === 'payout_limit');
            expect(payoutFlag).toBeDefined();
        });
    });
});
