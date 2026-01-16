const axios = require('axios');

const OPENROUTER_API_KEY = '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';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'mistralai/mistral-7b-instruct';

async function testOpenRouter() {
    console.log('Testing OpenRouter API key...');
    try {
        const response = await axios.post(
            `${OPENROUTER_BASE_URL}/chat/completions`,
            {
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'user', content: 'Say hello' }
                ],
                max_tokens: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Success! Response:', response.data.choices[0].message.content);
    } catch (err) {
        console.error('OpenRouter test failed:', err.response?.status, err.response?.data || err.message);
    }
}

testOpenRouter();
