const fs = require('fs');
const path = require('path');

const libraryPath = path.join(__dirname, '../docs/common_traps_library.json');

function validateRules() {
    console.log("Validating rules library...");

    try {
        const data = fs.readFileSync(libraryPath, 'utf8');
        const library = JSON.parse(data);

        let errorCount = 0;
        const ruleIds = new Set();

        for (const [contractType, rules] of Object.entries(library)) {
            console.log(`Checking contract type: ${contractType}`);

            for (const [ruleId, rule] of Object.entries(rules)) {
                // Check for duplicate IDs (globally or per type? Assuming per type is fine, but IDs should be unique for clarity)
                if (ruleIds.has(ruleId)) {
                    console.warn(`Warning: Duplicate rule ID found: ${ruleId}`);
                }
                ruleIds.add(ruleId);

                // Check required fields
                const requiredFields = ['title', 'patterns', 'explanation', 'default_severity', 'category'];
                for (const field of requiredFields) {
                    if (!rule[field]) {
                        console.error(`Error: Rule ${ruleId} missing required field: ${field}`);
                        errorCount++;
                    }
                }

                // Validate patterns
                if (Array.isArray(rule.patterns)) {
                    for (const pattern of rule.patterns) {
                        try {
                            new RegExp(pattern);
                        } catch (e) {
                            console.error(`Error: Invalid regex in rule ${ruleId}: ${pattern}`);
                            errorCount++;
                        }
                    }
                } else {
                    console.error(`Error: Rule ${ruleId} patterns must be an array`);
                    errorCount++;
                }
            }
        }

        if (errorCount === 0) {
            console.log("Validation successful! No errors found.");
            process.exit(0);
        } else {
            console.error(`Validation failed with ${errorCount} errors.`);
            process.exit(1);
        }

    } catch (err) {
        console.error("Failed to read or parse library file:", err);
        process.exit(1);
    }
}

validateRules();
