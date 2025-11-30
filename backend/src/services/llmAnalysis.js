const axios = require('axios');

/**
 * LLM Analysis Service
 * Uses OpenRouter API (or stub mode) for contract analysis
 */

// Initialize LLM client
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'mistralai/mistral-7b-instruct';

/**
 * Generate a plain-language summary of the contract
 * @param {string} text - Contract text
 * @returns {Promise<string>} - Summary
 */
async function generateSummary(text) {
    if (!OPENROUTER_API_KEY) {
        return generateSummaryStub(text);
    }

    try {
        const prompt = `You are a legal contract analyst. Summarize the following insurance contract in plain language, highlighting key points, coverage, exclusions, and obligations. Keep it concise (3-5 sentences).

Contract text:
${text.substring(0, 4000)}

Summary:`;

        const response = await callLLM(prompt, { maxTokens: 300 });
        return response.trim();

    } catch (error) {
        console.error('LLM summary error:', error.message);
        return generateSummaryStub(text);
    }
}

/**
 * Enhance red flags detected by rules engine with LLM insights
 * @param {string} text - Contract text
 * @param {Array} rulesFlags - Flags from rules engine
 * @returns {Promise<Array>} - Enhanced flags
 */
async function enhanceRedFlags(text, rulesFlags) {
    if (!OPENROUTER_API_KEY || rulesFlags.length === 0) {
        return rulesFlags; // Return as-is
    }

    try {
        // Group flags by severity for LLM analysis
        const highSeverityFlags = rulesFlags.filter(f => f.severity >= 70);

        if (highSeverityFlags.length === 0) {
            return rulesFlags;
        }

        const flagSummary = highSeverityFlags
            .map(f => `- ${f.title}: ${f.evidence}`)
            .join('\\n');

        const prompt = `You are a legal contract analyst. Review these detected red flags in an insurance contract and provide additional context or warnings if needed.

Detected issues:
${flagSummary}

Contract excerpt:
${text.substring(0, 2000)}

For each flag, confirm if it's a genuine concern and add any additional insights. Respond in JSON format:
[{"id": "flag_id", "additional_insight": "...", "confirmed": true/false}]`;

        const response = await callLLM(prompt, { maxTokens: 500 });

        // Try to parse JSON response
        // Helper to clean JSON string
        // Helper to extract JSON from potential markdown/text
        const extractJson = (str) => {
            const startIndex = str.indexOf('[');
            const endIndex = str.lastIndexOf(']');
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                return str.substring(startIndex, endIndex + 1);
            }
            return str;
        };

        try {
            const insights = JSON.parse(extractJson(response));


            // Merge insights with original flags
            return rulesFlags.map(flag => {
                const insight = insights.find(i => i.id === flag.id);
                if (insight && insight.additional_insight) {
                    return {
                        ...flag,
                        llm_insight: insight.additional_insight,
                        llm_confirmed: insight.confirmed
                    };
                }
                return flag;
            });
        } catch (parseError) {
            console.warn('Failed to parse LLM insights:', parseError.message);
            return rulesFlags;
        }

    } catch (error) {
        console.error('LLM enhancement error:', error.message);
        return rulesFlags;
    }
}

/**
 * Detect potential blind spots that rules engine might miss
 * @param {string} text - Contract text
 * @returns {Promise<Array>} - Additional flags
 */
async function detectBlindSpots(text) {
    if (!OPENROUTER_API_KEY) {
        return [];
    }

    try {
        const prompt = `You are a legal contract analyst specializing in insurance contracts. Analyze this contract for hidden traps, unusual clauses, or concerning terms that might not be obvious.

Contract text:
${text.substring(0, 3000)}

Identify any concerning clauses and respond in JSON format:
[{"issue": "brief title", "explanation": "why it's concerning", "evidence": "exact quote", "severity": 0-100}]

Focus on:
- Hidden fees or charges
- Unusual exclusions
- Vague or ambiguous terms
- Unfair obligations
- Time-sensitive requirements

Respond with JSON array only:`;

        const response = await callLLM(prompt, { maxTokens: 600 });

        try {
            // Helper to extract JSON
            const extractJson = (str) => {
                const startIndex = str.indexOf('[');
                const endIndex = str.lastIndexOf(']');
                if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                    return str.substring(startIndex, endIndex + 1);
                }
                return str;
            };
            const blindSpots = JSON.parse(extractJson(response));

            // Convert to flag format
            return blindSpots.map((spot, index) => ({
                id: `llm_blind_spot_${index + 1}`,
                title: spot.issue,
                severity: spot.severity || 60,
                confidence: 0.7, // Lower confidence for LLM-only detections
                plain_english: spot.explanation,
                evidence: spot.evidence,
                category: 'llm_detection',
                source: 'llm'
            }));

        } catch (parseError) {
            console.warn('Failed to parse LLM blind spots:', parseError.message);
            return [];
        }

    } catch (error) {
        console.error('LLM blind spot detection error:', error.message);
        return [];
    }
}

/**
 * Call LLM API
 * @param {string} prompt - Prompt text
 * @param {Object} options - Options
 * @returns {Promise<string>} - Response text
 */
async function callLLM(prompt, options = {}) {
    const { maxTokens = 500, temperature = 0.3 } = options;

    const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
            model: DEFAULT_MODEL,
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://contract-reader.app',
                'X-Title': 'Contract Reader'
            },
            timeout: 30000
        }
    );

    return response.data.choices[0].message.content;
}

/**
 * Stub summary generator
 * @param {string} text 
 * @returns {string}
 */
function generateSummaryStub(text) {
    const wordCount = text.split(/\\s+/).length;
    const hasNumbers = /\\d/.test(text);

    return `[STUB LLM SUMMARY] This insurance contract contains approximately ${wordCount} words. ` +
        `${hasNumbers ? 'It includes specific monetary amounts and limits. ' : ''}` +
        `To enable real LLM analysis, set the OPENROUTER_API_KEY environment variable. ` +
        `The contract should be reviewed carefully for coverage limits, exclusions, and obligations.`;
}

module.exports = {
    generateSummary,
    enhanceRedFlags,
    detectBlindSpots
};
