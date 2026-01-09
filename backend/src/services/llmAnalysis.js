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
        console.warn('OpenRouter API key missing. Using stub summary.');
        return generateSummaryStub(text);
    }

    try {
        const prompt = `You are a legal contract analyst. Summarize the following contract in plain language.
        
CRITICAL: Highlight whole phrases or sentences that are most important for the user by wrapping them in <strong> tags. 
Do NOT just bold random single words. Bold meaningful clauses, limits, or obligations.

Keep the summary concise (3-5 sentences).

Contract text:
${text.substring(0, 4000)}

Summary:`;

        const response = await callLLM(prompt, { maxTokens: 400 });
        return response.trim();

    } catch (error) {
        console.error('LLM summary error:', error.message);
        throw new Error(`Failed to generate summary: ${error.message}`);
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
            .join('\n');

        const prompt = `You are a legal contract analyst. Review these detected red flags in an insurance contract and provide additional context or warnings if needed.

Detected issues:
${flagSummary}

Contract excerpt:
${text.substring(0, 2000)}

For each flag, confirm if it's a genuine concern and add any additional insights. Respond in JSON format:
[{"id": "flag_id", "additional_insight": "...", "confirmed": true/false}]`;

        const response = await callLLM(prompt, { maxTokens: 500 });

        // Try to parse JSON response
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

CRITICAL: Focus on common reasons for claim rejections and payout issues:
- Payout rejection triggers (e.g., strict reporting windows, maintenance obligations)
- Over-insuring (paying for cover you can't claim) and Under-insuring (average clause)
- Replacement value vs. Cash payout (market value) terms
- Unusual exclusions that lead to claim denials
- Hidden fees or ambiguous terms

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
    const wordCount = text.split(/\s+/).length;
    const hasNumbers = /\d/.test(text);

    return `[STUB LLM SUMMARY] This contract contains approximately ${wordCount} words. ` +
        `${hasNumbers ? 'It includes <strong>specific monetary amounts and limits</strong>. ' : ''}` +
        `To enable <strong>real LLM analysis</strong>, set the OPENROUTER_API_KEY environment variable. ` +
        `The contract should be <strong>reviewed carefully for coverage limits, exclusions, and obligations</strong>.`;
}

/**
 * Generate specific content for a letter based on contract and user situation
 * @param {string} contractText - Contract text
 * @param {string} letterType - Type of letter
 * @param {string} userSituation - User's specific situation/reason
 * @returns {Promise<string>} - Generated content
 */
async function generateLetterContent(contractText, letterType, userSituation) {
    if (!OPENROUTER_API_KEY) {
        console.warn('OpenRouter API key missing. Returning raw user situation.');
        return userSituation;
    }

    try {
        const prompt = `You are a legal assistant helping a user write a formal letter.
        
Letter Type: ${letterType}
User's Situation: ${userSituation}

Contract Excerpt:
${contractText.substring(0, 3000)}

Task: Write a persuasive and professional paragraph (or two) to be included in the letter. 
- Reference specific relevant clauses from the contract if possible.
- Argue why the user's request is valid based on the contract terms and their situation.
- Keep it concise, professional, and firm.
- Do NOT include salutations or signatures, just the body paragraphs.

Generated Content:`;

        const response = await callLLM(prompt, { maxTokens: 400, temperature: 0.5 });
        return response.trim();

    } catch (error) {
        console.error('LLM letter generation error:', error.message);
        return userSituation; // Fallback to user's raw input
    }
}

/**
 * Extract relevant fields from contract for letter generation
 * @param {string} contractText - Contract text
 * @param {string} contractType - Type of contract (insurance, lease, employment, etc.)
 * @returns {Promise<Object>} - Extracted fields
 */
async function extractContractFields(contractText, contractType) {
    if (!OPENROUTER_API_KEY) {
        console.warn('OpenRouter API key missing. Returning empty fields.');
        return {
            suggestedLetterType: mapContractTypeToLetterType(contractType),
            fields: {}
        };
    }

    try {
        const prompt = `You are a legal assistant analyzing a ${contractType} contract to help a user write a dispute letter.

Contract Text:
${contractText.substring(0, 3000)}

Task: Extract relevant information from this contract that would be useful for writing a dispute letter. Return ONLY a JSON object with these fields (use null for any field you cannot find):

For insurance contracts:
{
  "insurance_company": "company name",
  "policy_number": "policy number if found",
  "claim_number": null,
  "claim_date": null
}

For lease contracts:
{
  "landlord_name": "landlord or property manager name",
  "property_address": "property address"
}

For employment contracts:
{
  "employer_name": "employer or company name",
  "company_name": "company name",
  "position": "job title or position"
}

For gym/service contracts:
{
  "gym_name": "gym or service provider name",
  "member_id": "membership or account number if found",
  "service_provider": "provider name",
  "account_number": "account number if found"
}

Return ONLY the JSON object, no other text:`;

        const response = await callLLM(prompt, { maxTokens: 300, temperature: 0.2 });

        // Extract JSON from response
        const extractJson = (str) => {
            const startIndex = str.indexOf('{');
            const endIndex = str.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                return str.substring(startIndex, endIndex + 1);
            }
            return str;
        };

        try {
            const fields = JSON.parse(extractJson(response));
            return {
                suggestedLetterType: mapContractTypeToLetterType(contractType),
                fields: fields
            };
        } catch (parseError) {
            console.warn('Failed to parse extracted fields:', parseError.message);
            return {
                suggestedLetterType: mapContractTypeToLetterType(contractType),
                fields: {}
            };
        }

    } catch (error) {
        console.error('LLM field extraction error:', error.message);
        return {
            suggestedLetterType: mapContractTypeToLetterType(contractType),
            fields: {}
        };
    }
}

/**
 * Map contract type to letter type
 * @param {string} contractType - Contract type from rulesEngine
 * @returns {string} - Letter type
 */
function mapContractTypeToLetterType(contractType) {
    const mapping = {
        'insurance': 'insurance_claim_dispute',
        'lease': 'lease_violation',
        'employment': 'employment_negotiation',
        'software': 'service_cancellation',
        'general': 'other_dispute'
    };

    return mapping[contractType] || 'other_dispute';
}

module.exports = {
    generateSummary,
    enhanceRedFlags,
    detectBlindSpots,
    generateLetterContent,
    extractContractFields
};
