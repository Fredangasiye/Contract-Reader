const axios = require('axios');

/**
 * LLM Analysis Service
 * Uses OpenRouter API (or stub mode) for contract analysis
 */

// Initialize LLM client
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Model Configuration with Fallbacks
const MODELS = [
    'mistralai/mixtral-8x7b-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free'
];

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
        // First, check if it's actually a contract
        const checkPrompt = `Analyze the following text and determine if it is a legal contract (like a lease, insurance policy, employment agreement, etc.).
        
        Text excerpt:
        ${text.substring(0, 1000)}
        
        Respond with ONLY "YES" if it is a contract, or "NO: [Reason]" if it is not (e.g., "NO: Meeting Minutes", "NO: News Article").`;

        const checkResponse = await callLLMWithFallback(checkPrompt, { maxTokens: 50 });

        let contextPrefix = "";
        if (checkResponse && !checkResponse.toUpperCase().startsWith("YES")) {
            console.warn(`Document might not be a contract: ${checkResponse}`);
            contextPrefix = `WARNING: The uploaded document appears to be ${checkResponse.replace('NO:', '').trim()}, NOT a standard legal contract. Analyze it as best as possible in that context.\n\n`;
        }

        const prompt = `${contextPrefix}You are a legal contract analyst. Summarize the following document in plain language.
        
        CRITICAL: Highlight whole phrases or sentences that are most important for the user by wrapping them in <strong> tags. 
        Do NOT just bold random single words. Bold meaningful clauses, limits, or obligations.
        
        Keep the summary concise (3-5 sentences).
        
        Document text:
        ${text.substring(0, 4000)}
        
        Summary:`;

        const response = await callLLMWithFallback(prompt, { maxTokens: 400 });
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

        const prompt = `You are a legal contract analyst. Review these detected red flags and provide additional context or warnings.

Detected issues:
${flagSummary}

Contract excerpt:
${text.substring(0, 2000)}

For each flag, confirm if it's a genuine concern and add any additional insights. Respond in JSON format:
[{"id": "flag_id", "additional_insight": "...", "confirmed": true/false}]`;

        const response = await callLLMWithFallback(prompt, { maxTokens: 500 });

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
        const prompt = `You are a legal contract analyst. Analyze this document for hidden traps, unusual clauses, or concerning terms that might not be obvious.

Document text:
${text.substring(0, 3000)}

Identify any concerning clauses and respond in JSON format:
[{"issue": "brief title", "explanation": "why it's concerning", "evidence": "exact quote", "severity": 0-100}]

CRITICAL: Focus on common reasons for claim rejections, payout issues, or unfair obligations.

Respond with JSON array only:`;

        const response = await callLLMWithFallback(prompt, { maxTokens: 600 });

        try {
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
 * Generate complete letter content based on contract and user situation
 * @param {string} contractText - Contract text
 * @param {string} letterType - Type of letter
 * @param {string} userSituation - User's specific situation/reason
 * @param {Object} customData - Additional data from the form
 * @param {Object} userInfo - User information (name, email, phone)
 * @returns {Promise<string>} - Generated complete letter
 */
async function generateLetterContent(contractText, letterType, userSituation, customData = {}, userInfo = {}) {
    if (!OPENROUTER_API_KEY) {
        console.warn('OpenRouter API key missing. Cannot generate AI letter.');
        return null;
    }

    try {
        // Build context from customData
        const contextDetails = buildContextDetails(letterType, customData);

        const prompt = `You are an expert legal advocate in South Africa. Write a LEGALLY ENFORCEABLE, high-stakes formal dispute letter.

LETTER TYPE: ${letterType.replace(/_/g, ' ').toUpperCase()}

USER'S SITUATION:
${userSituation}

${contextDetails}

CONTRACT EXCERPT:
${contractText.substring(0, 4000)}

INSTRUCTIONS:
1.  **GOAL**: Write a letter with the HIGHEST PROBABILITY OF WINNING the dispute.
2.  **CITATIONS**: You MUST quote specific clauses from the contract text provided. Use quotation marks and reference the clause number if available.
3.  **LEGAL FRAMEWORK**: Apply South African law aggressively:
    *   **Consumer Protection Act (CPA)**: Cite Section 14 (Cancellation), Section 40 (Unconscionable Conduct), or Section 48 (Unfair Terms) where applicable.
    *   **Insurance**: Cite Policyholder Protection Rules (PPRs) and Short-term Insurance Act (STIA). Mention "Treating Customers Fairly" (TCF) outcomes.
    *   **Rental**: Cite the Rental Housing Act and Unfair Practice Regulations.
4.  **TONE**: Professional, firm, authoritative, and demanding. Do not be passive.
5.  **STRUCTURE**:
    *   **Header**: Standard business letter format.
    *   **Opening**: State the purpose clearly (e.g., "Formal Notice of Dispute").
    *   **The Facts**: Briefly summarize the situation.
    *   **The Contract**: Quote the specific contract terms that support the user OR explain why the opposing party's reliance on a term is unlawful.
    *   **The Law**: Apply the relevant SA legal acts to override unfair contract terms.
    *   **The Demand**: State exactly what is required (refund, cancellation, payout) and a deadline (e.g., 7 days).
    *   **The Consequence**: Mention further action (Ombudsman, NCC, legal counsel) if demands are not met.
6.  **NO PLACEHOLDERS**: Do NOT use brackets like [Insert Date] or [Specific concerns]. Fill every section based on the provided data or logical inference.

USER INFORMATION:
Name: ${userInfo.name || 'The Consumer'}
Email: ${userInfo.email || ''}
Phone: ${userInfo.phone || ''}
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Write the complete letter now:`;

        const response = await callLLMWithFallback(prompt, { maxTokens: 1500, temperature: 0.7 });
        return response.trim();

    } catch (error) {
        console.error('LLM complete letter generation error:', error.message);
        return null;
    }
}

/**
 * Call LLM API with Fallback Logic
 * @param {string} prompt - Prompt text
 * @param {Object} options - Options
 * @returns {Promise<string>} - Response text
 */
async function callLLMWithFallback(prompt, options = {}) {
    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`🤖 Calling OpenRouter with model: ${model}`);
            const response = await callLLM(prompt, { ...options, model });
            return response; // Success!
        } catch (error) {
            console.warn(`⚠️ Model ${model} failed: ${error.message}`);
            lastError = error;
            // Continue to next model
        }
    }

    // If all models fail
    console.error('❌ All LLM models failed.');
    throw lastError || new Error('All LLM models failed');
}

/**
 * Call LLM API (Single Request)
 * @param {string} prompt - Prompt text
 * @param {Object} options - Options
 * @returns {Promise<string>} - Response text
 */
async function callLLM(prompt, options = {}) {
    const { maxTokens = 500, temperature = 0.3, model = MODELS[0] } = options;

    try {
        const response = await axios.post(
            `${OPENROUTER_BASE_URL}/chat/completions`,
            {
                model: model,
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
                    'HTTP-Referer': 'https://frontend-nine-alpha-95.vercel.app',
                    'X-Title': 'Contract Reader'
                },
                timeout: 45000 // Increased timeout for better reliability
            }
        );

        if (!response.data || !response.data.choices || response.data.choices.length === 0) {
            throw new Error('Invalid response format from LLM provider');
        }

        return response.data.choices[0].message.content;
    } catch (error) {
        if (error.response) {
            console.error('OpenRouter API Error:', error.response.status, JSON.stringify(error.response.data));
            // Mask the key in the error message if we re-throw
            const maskedKey = OPENROUTER_API_KEY ? `${OPENROUTER_API_KEY.substring(0, 10)}...` : 'MISSING';
            throw new Error(`OpenRouter failed (${error.response.status}) with key ${maskedKey}: ${JSON.stringify(error.response.data)}`);
        }
        console.error('LLM Request Error:', error.message);
        throw error;
    }
}

/**
 * Build context details from customData for the letter
 */
function buildContextDetails(letterType, customData) {
    let details = '';

    if (letterType === 'insurance_claim_dispute') {
        details = `CLAIM DETAILS:
- Insurance Company: ${customData.insurance_company || 'Not provided'}
- Policy Number: ${customData.policy_number || 'Not provided'}
- Claim Number: ${customData.claim_number || 'Not provided'}
- Claim Date: ${customData.claim_date || 'Not provided'}`;
    } else if (letterType === 'gym_cancellation') {
        details = `MEMBERSHIP DETAILS:
- Gym Name: ${customData.gym_name || 'Not provided'}
- Member ID: ${customData.member_id || 'Not provided'}
- Sign Date: ${customData.sign_date || 'Not provided'}`;
    } else if (letterType === 'lease_violation') {
        details = `PROPERTY DETAILS:
- Landlord/Property Manager: ${customData.landlord_name || 'Not provided'}
- Property Address: ${customData.property_address || 'Not provided'}
- Requested Remedy Period: ${customData.remedy_period || '7'} days`;
    } else if (letterType === 'employment_negotiation') {
        details = `EMPLOYMENT DETAILS:
- Employer/Manager: ${customData.employer_name || 'Not provided'}
- Company: ${customData.company_name || 'Not provided'}
- Position: ${customData.position || 'Not provided'}`;
    } else if (letterType === 'service_cancellation') {
        details = `SERVICE DETAILS:
- Service Provider: ${customData.service_provider || 'Not provided'}
- Account Number: ${customData.account_number || 'Not provided'}
- Desired Cancellation Date: ${customData.cancellation_date || 'Immediately'}`;
    } else if (letterType === 'other_dispute') {
        details = `RECIPIENT DETAILS:
- Recipient Name: ${customData.recipient_name || 'Not provided'}
- Company: ${customData.recipient_company || 'Not provided'}`;
    }

    return details;
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

        const response = await callLLMWithFallback(prompt, { maxTokens: 300, temperature: 0.2 });

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
