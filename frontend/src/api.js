import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

// Helper to get auth token from localStorage
const getAuthToken = () => localStorage.getItem('authToken');

// Helper to set auth headers
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`
});

// Contract Analysis
export async function analyzeContract(file, password = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (password) {
        formData.append('password', password);
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...getAuthHeaders()
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error analyzing contract:", error);
        throw error;
    }
}

// User Authentication
export async function register(email, password) {
    const response = await axios.post(`${API_BASE_URL}/users/register`, { email, password });
    if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
}

export async function login(email, password) {
    const response = await axios.post(`${API_BASE_URL}/users/login`, { email, password });
    if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
}

export async function getProfile() {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
        headers: getAuthHeaders()
    });
    return response.data;
}

export async function updateProfile(updates) {
    const response = await axios.put(`${API_BASE_URL}/users/profile`, updates, {
        headers: getAuthHeaders()
    });
    return response.data;
}

export function logout() {
    localStorage.removeItem('authToken');
}

export function isAuthenticated() {
    return !!getAuthToken();
}

// Payments
export async function createCheckout(type = 'subscription') {
    const response = await axios.post(`${API_BASE_URL}/payments/create-checkout`,
        { type },
        { headers: getAuthHeaders() }
    );
    return response.data;
}

export async function getSubscriptionStatus() {
    const response = await axios.get(`${API_BASE_URL}/payments/subscription-status`, {
        headers: getAuthHeaders()
    });
    return response.data;
}

export async function cancelSubscription() {
    const response = await axios.post(`${API_BASE_URL}/payments/cancel-subscription`, {}, {
        headers: getAuthHeaders()
    });
    return response.data;
}

export async function getPricing() {
    const response = await axios.get(`${API_BASE_URL}/payments/pricing`);
    return response.data;
}

// Letters
export async function generateLetter(letterData) {
    const response = await axios.post(`${API_BASE_URL}/letters/generate`, letterData, {
        headers: getAuthHeaders()
    });
    return response.data;
}

export async function getLetterTemplates() {
    const response = await axios.get(`${API_BASE_URL}/letters/templates`);
    return response.data;
}

export async function getUserLetters() {
    const response = await axios.get(`${API_BASE_URL}/letters`, {
        headers: getAuthHeaders()
    });
    return response.data;
}

export async function getLetter(letterId) {
    const response = await axios.get(`${API_BASE_URL}/letters/${letterId}`, {
        headers: getAuthHeaders()
    });
    return response.data;
}

export async function updateLetter(letterId, updates) {
    const response = await axios.put(`${API_BASE_URL}/letters/${letterId}`, updates, {
        headers: getAuthHeaders()
    });
    return response.data;
}

// Advice
export async function getContractTypes() {
    const response = await axios.get(`${API_BASE_URL}/advice`);
    return response.data;
}

export async function getAdviceForType(contractType) {
    const response = await axios.get(`${API_BASE_URL}/advice/${contractType}`);
    return response.data;
}

export async function getAdviceSection(contractType, section) {
    const response = await axios.get(`${API_BASE_URL}/advice/${contractType}/${section}`);
    return response.data;
}

export async function searchAdvice(query) {
    const response = await axios.get(`${API_BASE_URL}/advice/search?q=${encodeURIComponent(query)}`);
    return response.data;
}
