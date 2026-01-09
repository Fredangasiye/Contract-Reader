const fs = require('fs');
const path = require('path');
const { normalizeText, findShortestSentenceContaining } = require('./rulesHelpers');

let rulesLibrary = null;

/**
 * Loads the rules library for a specific contract type.
 * @param {string} contractType 
 * @returns {object}
 */
function loadRules(contractType = 'insurance') {
    if (!rulesLibrary) {
        const libraryPath = path.join(__dirname, '../../data/common_traps_library.json');
        try {
            const data = fs.readFileSync(libraryPath, 'utf8');
            rulesLibrary = JSON.parse(data);
        } catch (err) {
            console.error("Failed to load rules library:", err);
            return {};
        }
    }
    return rulesLibrary[contractType] || {};
}

/**
 * Scores the severity of a match based on the rule and context.
 * @param {object} match 
 * @param {object} rule 
 * @returns {number}
 */
function scoreSeverity(match, rule) {
    let score = rule.default_severity || 50;
    const text = match.input || '';
    const evidence = findShortestSentenceContaining(text, match.index, match.index + match[0].length);

    // Adjustments
    if (/\d/.test(match[0])) {
        score += 10; // Numeric cap detected
    }
    if (/(?:reasonable|sufficient)/i.test(evidence)) {
        score += 10; // Ambiguous terms
    }
    if (/(?:except|unless|provided that)/i.test(evidence)) {
        score -= 10; // Exceptions/mitigations
    }

    return Math.min(100, Math.max(0, score));
}

/**
 * Detects the type of contract based on keywords in the text.
 * @param {string} text 
 * @returns {string} - 'lease', 'employment', 'software', 'insurance', or 'general'
 */
function detectContractType(text) {
    const lowerText = text.toLowerCase().slice(0, 5000); // Check first 5000 chars for better context

    const scores = {
        insurance: 0,
        lease: 0,
        employment: 0,
        software: 0
    };

    // Insurance keywords
    if (/(?:insurance|policy|coverage|premium|deductible|insurer|insured|claim|hollard|naked)/.test(lowerText)) {
        scores.insurance += 10;
        // Boost if multiple keywords found
        const matches = lowerText.match(/(?:insurance|policy|coverage|premium|deductible|insurer|insured|claim)/g) || [];
        scores.insurance += matches.length;
    }

    // Lease keywords
    if (/(?:lease|tenancy|tenant|landlord|rental agreement|premises|lessor|lessee)/.test(lowerText)) {
        scores.lease += 10;
        const matches = lowerText.match(/(?:lease|tenancy|tenant|landlord|rental agreement|premises)/g) || [];
        scores.lease += matches.length;
    }

    // Employment keywords
    if (/(?:employment|employee|employer|salary|probation|termination|workplace|remuneration)/.test(lowerText)) {
        scores.employment += 10;
        const matches = lowerText.match(/(?:employment|employee|employer|salary|probation|termination)/g) || [];
        scores.employment += matches.length;
    }

    // Software keywords (more specific to avoid false positives in insurance exclusions)
    if (/(?:software license|saas agreement|end user license|eula|software subscription|api license)/.test(lowerText)) {
        scores.software += 10;
    }
    // Lower weight for general software terms
    if (/(?:software|developer|api|platform)/.test(lowerText)) {
        scores.software += 2;
    }

    // Find the highest score
    let bestType = 'general';
    let maxScore = 5; // Minimum threshold

    for (const [type, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestType = type;
        }
    }

    return bestType;
}

/**
 * Finds red flags in the text based on the rules.
 * @param {string} text 
 * @param {string} contractType - Optional, will auto-detect if not provided
 * @param {object} options 
 * @returns {Promise<Array>}
 */
async function findRedFlags(text, contractType = null, options = { maxFlags: 20 }) {
    // Auto-detect type if not provided
    const typeToUse = contractType || detectContractType(text);
    console.log(`Analyzing document as type: ${typeToUse}`);

    const rules = loadRules(typeToUse);

    // If no specific rules found, try 'general' or fallback to empty
    if (!rules || Object.keys(rules).length === 0) {
        console.log(`No rules found for type ${typeToUse}, falling back to general`);
        // You might want to load 'general' rules here if you have them
    }

    const flags = [];

    for (const [ruleId, rule] of Object.entries(rules)) {
        if (flags.length >= options.maxFlags) break;

        const patterns = rule.patterns || [];
        const matches = [];

        for (const patternStr of patterns) {
            try {
                const regex = new RegExp(patternStr, 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    matches.push(match);
                }
            } catch (err) {
                console.error(`Invalid regex for rule ${ruleId}: ${patternStr}`, err);
            }
        }

        if (matches.length > 0) {
            const bestMatch = matches[0]; // Simplification
            const severity = scoreSeverity(bestMatch, rule);
            const confidence = 1.0;

            if (confidence >= 0.4) {
                const evidence = findShortestSentenceContaining(text, bestMatch.index, bestMatch.index + bestMatch[0].length);

                flags.push({
                    id: ruleId,
                    title: rule.title,
                    severity: severity,
                    confidence: confidence,
                    plain_english: rule.explanation,
                    evidence: evidence,
                    pattern: bestMatch[0],
                    match_index: [bestMatch.index, bestMatch.index + bestMatch[0].length],
                    category: rule.category
                });
            }
        }
    }

    return flags.sort((a, b) => b.severity - a.severity);
}

module.exports = {
    loadRules,
    scoreSeverity,
    findRedFlags,
    detectContractType
};
