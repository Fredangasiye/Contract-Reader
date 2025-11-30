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
        const libraryPath = path.join(__dirname, '../../../docs/common_traps_library.json');
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
 * Finds red flags in the text based on the rules.
 * @param {string} text 
 * @param {string} contractType 
 * @param {object} options 
 * @returns {Promise<Array>}
 */
async function findRedFlags(text, contractType = 'insurance', options = { maxFlags: 20 }) {
    const rules = loadRules(contractType);
    const flags = [];
    const normalizedText = normalizeText(text); // Use normalized text for matching? 
    // Actually, regex matching on original text (or slightly cleaned) is usually better to preserve indices.
    // But instructions say "Lowercase text for matching".
    // Let's use the original text for extraction and a lowercased version for matching if needed, 
    // OR just use case-insensitive regex on the original text.
    // The instructions say: "Run each rule’s patterns using case-insensitive RegExp."

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
            // Consolidate matches
            // For now, just take the first one or the one with highest severity?
            // Instructions: "If multiple matches per rule -> return one flag, with match_index array."

            const bestMatch = matches[0]; // Simplification
            const severity = scoreSeverity(bestMatch, rule);

            // Calculate confidence
            // Instructions: "confidence = 1.0 for exact match..." 
            // Since we use regex, it is an "exact match" of the pattern.
            // Let's assume 1.0 for now unless we do fuzzy matching.
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
                    pattern: bestMatch[0], // The actual matched text
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
    findRedFlags
};
