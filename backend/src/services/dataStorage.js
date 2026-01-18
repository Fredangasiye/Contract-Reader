const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

/**
 * Data Storage Service
 * Supports both local file storage (dev) and Supabase (production)
 */

// Configuration
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'; // Must be 32 bytes

// Local Storage Paths
const STORAGE_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../../../data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'analyses.json');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const LETTERS_FILE = path.join(STORAGE_DIR, 'letters.json');
const ADVICE_FILE = path.join(STORAGE_DIR, 'advice.json');
const BUNDLED_ADVICE_FILE = path.join(__dirname, '../../data/advice_content.json');

// Supabase Client
let supabase;
if (USE_SUPABASE) {
    console.log('Initializing Supabase client...');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
} else {
    console.log('Supabase credentials not found. Using local file storage.');
}

// Ensure storage directory exists (for local mode)
async function ensureStorageDir() {
    if (USE_SUPABASE) return;
    try {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create storage directory:', error);
    }
}

/**
 * Encrypt text using AES-256
 */
function encrypt(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        // Ensure key is exactly 32 bytes by padding or truncating
        const key = Buffer.alloc(32);
        const keySource = Buffer.from(ENCRYPTION_KEY);
        keySource.copy(key, 0, 0, Math.min(keySource.length, 32));

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return iv.toString('base64') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption failed:', error);
        return text; // Fallback to plain text if encryption fails (better than crashing)
    }
}

/**
 * Decrypt text using AES-256
 */
function decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    try {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'base64');
        const encrypted = parts[1];

        // Ensure key is exactly 32 bytes
        const key = Buffer.alloc(32);
        const keySource = Buffer.from(ENCRYPTION_KEY);
        keySource.copy(key, 0, 0, Math.min(keySource.length, 32));

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Decryption failed:', e);
        return encryptedText;
    }
}

// ==========================================
// ANALYSES
// ==========================================

async function loadAnalysesLocal() {
    await ensureStorageDir();
    try {
        const data = await fs.readFile(STORAGE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function storeAnalysis(data) {
    const analysis = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        source: data.source || 'file',
        sourceUrl: data.sourceUrl || null,
        fullText: encrypt(data.fullText || ''),
        summary: data.summary || '',
        flags: data.flags || [],
        boundingBoxes: data.boundingBoxes || {},
        ocrConfidence: data.ocrConfidence || 0,
        rulesVersion: data.rulesVersion || '1.0.0',
        llmModel: data.llmModel || 'stub',
        metadata: {
            fileType: data.fileType || 'unknown',
            pageCount: data.pageCount || 1,
            processingTimeMs: data.processingTimeMs || 0,
            flagCount: (data.flags || []).length,
            highSeverityCount: (data.flags || []).filter(f => f.severity >= 70).length
        }
    };

    if (USE_SUPABASE) {
        const { error } = await supabase
            .from('analyses')
            .insert({
                id: analysis.id,
                user_id: data.userId || null, // If you pass userId
                source: analysis.source,
                source_url: analysis.sourceUrl,
                full_text: analysis.fullText,
                summary: analysis.summary,
                flags: analysis.flags,
                bounding_boxes: analysis.boundingBoxes,
                ocr_confidence: analysis.ocrConfidence,
                rules_version: analysis.rulesVersion,
                llm_model: analysis.llmModel,
                metadata: analysis.metadata
            });

        if (error) {
            console.error('Supabase storeAnalysis error:', error);
            throw error;
        }
    } else {
        const analyses = await loadAnalysesLocal();
        analyses.push(analysis);
        await fs.writeFile(STORAGE_FILE, JSON.stringify(analyses, null, 2), 'utf8');
    }

    return analysis;
}

async function getAnalysis(id) {
    let analysis;

    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        // Map snake_case to camelCase
        analysis = {
            id: data.id,
            timestamp: data.created_at,
            source: data.source,
            sourceUrl: data.source_url,
            fullText: data.full_text,
            summary: data.summary,
            flags: data.flags,
            boundingBoxes: data.bounding_boxes,
            ocrConfidence: data.ocr_confidence,
            rulesVersion: data.rules_version,
            llmModel: data.llm_model,
            metadata: data.metadata
        };
    } else {
        const analyses = await loadAnalysesLocal();
        analysis = analyses.find(a => a.id === id);
    }

    if (!analysis) return null;

    return {
        ...analysis,
        fullText: decrypt(analysis.fullText)
    };
}

async function getAllAnalyses(options = {}) {
    const { page = 1, pageSize = 20 } = options;
    const start = (page - 1) * pageSize;

    if (USE_SUPABASE) {
        const { data, count, error } = await supabase
            .from('analyses')
            .select('*', { count: 'exact' })
            .range(start, start + pageSize - 1)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const analyses = data.map(a => ({
            id: a.id,
            timestamp: a.created_at,
            source: a.source,
            summary: a.summary,
            flags: a.flags,
            fullText: '[encrypted]',
            metadata: a.metadata
        }));

        return {
            analyses,
            total: count,
            page,
            pageSize
        };
    } else {
        const analyses = await loadAnalysesLocal();
        const end = start + pageSize;
        const paginatedAnalyses = analyses.slice(start, end).map(a => ({
            ...a,
            fullText: '[encrypted]'
        }));

        return {
            analyses: paginatedAnalyses,
            total: analyses.length,
            page,
            pageSize
        };
    }
}

async function getInsights() {
    // For insights, we'll keep it simple: fetch recent analyses and aggregate
    // In a real production app, you'd write a SQL query or RPC for this
    const { analyses } = await getAllAnalyses({ page: 1, pageSize: 100 });

    // ... (Reuse existing aggregation logic)
    // For brevity, using the same logic as before but on the fetched subset
    // In production, move this aggregation to SQL/Supabase

    if (analyses.length === 0) {
        return {
            totalAnalyses: 0,
            flagFrequency: [],
            severityDistribution: {},
            averageConfidence: 0,
            commonPatterns: [],
            trends: []
        };
    }

    const flagFrequency = {};
    const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const analysis of analyses) {
        for (const flag of analysis.flags || []) {
            flagFrequency[flag.id] = (flagFrequency[flag.id] || 0) + 1;
            if (flag.severity >= 90) severityCounts.critical++;
            else if (flag.severity >= 70) severityCounts.high++;
            else if (flag.severity >= 50) severityCounts.medium++;
            else severityCounts.low++;
        }
    }

    const sortedFlags = Object.entries(flagFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, count }));

    return {
        totalAnalyses: analyses.length, // This is just the page size in this simple implementation
        flagFrequency: sortedFlags,
        severityDistribution: severityCounts,
        averageConfidence: 0, // Simplified
        commonPatterns: sortedFlags.slice(0, 5),
        trends: { last30Days: analyses.length }
    };
}

// ==========================================
// USERS
// ==========================================

async function loadUsersLocal() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function createUser(userData) {
    const user = {
        userId: crypto.randomUUID(),
        email: userData.email,
        passwordHash: userData.passwordHash,
        subscriptionTier: userData.subscriptionTier || 'free',
        subscriptionExpiry: userData.subscriptionExpiry || null,
        scanCount: 0,
        stripeCustomerId: userData.stripeCustomerId || null,
        createdAt: new Date().toISOString()
    };

    if (USE_SUPABASE) {
        const { error } = await supabase
            .from('users')
            .insert({
                user_id: user.userId,
                email: user.email,
                password_hash: user.passwordHash,
                subscription_tier: user.subscriptionTier,
                subscription_expiry: user.subscriptionExpiry,
                scan_count: user.scanCount,
                stripe_customer_id: user.stripeCustomerId
            });

        if (error) throw error;
    } else {
        const users = await loadUsersLocal();
        users.push(user);
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    }

    return user;
}

async function getUserByEmail(email) {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) return null;

        return {
            userId: data.user_id,
            email: data.email,
            passwordHash: data.password_hash,
            subscriptionTier: data.subscription_tier,
            subscriptionExpiry: data.subscription_expiry,
            scanCount: data.scan_count,
            stripeCustomerId: data.stripe_customer_id,
            createdAt: data.created_at
        };
    } else {
        const users = await loadUsersLocal();
        return users.find(u => u.email === email);
    }
}

async function getUserById(userId) {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !data) return null;

        return {
            userId: data.user_id,
            email: data.email,
            passwordHash: data.password_hash,
            subscriptionTier: data.subscription_tier,
            subscriptionExpiry: data.subscription_expiry,
            scanCount: data.scan_count,
            stripeCustomerId: data.stripe_customer_id,
            createdAt: data.created_at
        };
    } else {
        const users = await loadUsersLocal();
        return users.find(u => u.userId === userId);
    }
}

async function updateUser(userId, updates) {
    if (USE_SUPABASE) {
        // Map camelCase updates to snake_case for DB
        const dbUpdates = {};
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.subscriptionTier) dbUpdates.subscription_tier = updates.subscriptionTier;
        if (updates.scanCount !== undefined) dbUpdates.scan_count = updates.scanCount;
        if (updates.scanCredits !== undefined) dbUpdates.scan_credits = updates.scanCredits;
        if (updates.subscriptionExpiry !== undefined) dbUpdates.subscription_expiry = updates.subscriptionExpiry;
        if (updates.payfastToken) dbUpdates.payfast_token = updates.payfastToken;
        if (updates.stripeCustomerId) dbUpdates.stripe_customer_id = updates.stripeCustomerId;

        const { data, error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return {
            userId: data.user_id,
            email: data.email,
            subscriptionTier: data.subscription_tier,
            scanCount: data.scan_count
        };
    } else {
        const users = await loadUsersLocal();
        const index = users.findIndex(u => u.userId === userId);
        if (index === -1) return null;
        users[index] = { ...users[index], ...updates };
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        return users[index];
    }
}

async function incrementScanCount(userId) {
    if (USE_SUPABASE) {
        // Use RPC or simple update
        const user = await getUserById(userId);
        if (!user) return 0;

        const newCount = (user.scanCount || 0) + 1;
        await updateUser(userId, { scanCount: newCount });
        return newCount;
    } else {
        const users = await loadUsersLocal();
        const index = users.findIndex(u => u.userId === userId);
        if (index !== -1) {
            users[index].scanCount = (users[index].scanCount || 0) + 1;
            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            return users[index].scanCount;
        }
        return 0;
    }
}

// ==========================================
// LETTERS
// ==========================================

async function loadLettersLocal() {
    try {
        const data = await fs.readFile(LETTERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function storeLetter(letterData) {
    const letter = {
        letterId: crypto.randomUUID(),
        userId: letterData.userId,
        contractId: letterData.contractId || null,
        letterType: letterData.letterType,
        generatedContent: encrypt(letterData.generatedContent),
        customizations: letterData.customizations || {},
        createdAt: new Date().toISOString()
    };

    if (USE_SUPABASE) {
        const { error } = await supabase
            .from('letters')
            .insert({
                letter_id: letter.letterId,
                user_id: letter.userId,
                contract_id: letter.contractId,
                letter_type: letter.letterType,
                generated_content: letter.generatedContent,
                customizations: letter.customizations
            });

        if (error) throw error;
    } else {
        const letters = await loadLettersLocal();
        letters.push(letter);
        await fs.writeFile(LETTERS_FILE, JSON.stringify(letters, null, 2), 'utf8');
    }

    return letter;
}

async function getLetter(letterId) {
    let letter;

    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('letters')
            .select('*')
            .eq('letter_id', letterId)
            .single();

        if (error || !data) return null;

        letter = {
            letterId: data.letter_id,
            userId: data.user_id,
            generatedContent: data.generated_content,
            // ... other fields
        };
    } else {
        const letters = await loadLettersLocal();
        letter = letters.find(l => l.letterId === letterId);
    }

    if (!letter) return null;

    return {
        ...letter,
        generatedContent: decrypt(letter.generatedContent)
    };
}

async function getUserLetters(userId) {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('letters')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        return data.map(l => ({
            letterId: l.letter_id,
            userId: l.user_id,
            letterType: l.letter_type,
            generatedContent: '[encrypted]',
            createdAt: l.created_at
        }));
    } else {
        const letters = await loadLettersLocal();
        return letters
            .filter(l => l.userId === userId)
            .map(l => ({
                ...l,
                generatedContent: '[encrypted]'
            }));
    }
}

async function updateLetter(letterId, updates) {
    if (updates.generatedContent) {
        updates.generatedContent = encrypt(updates.generatedContent);
    }

    if (USE_SUPABASE) {
        const dbUpdates = {};
        if (updates.generatedContent) dbUpdates.generated_content = updates.generatedContent;

        const { data, error } = await supabase
            .from('letters')
            .update(dbUpdates)
            .eq('letter_id', letterId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const letters = await loadLettersLocal();
        const index = letters.findIndex(l => l.letterId === letterId);
        if (index === -1) return null;
        letters[index] = { ...letters[index], ...updates };
        await fs.writeFile(LETTERS_FILE, JSON.stringify(letters, null, 2), 'utf8');
        return letters[index];
    }
}

// ==========================================
// ADVICE
// ==========================================

async function loadAdvice() {
    if (USE_SUPABASE) {
        try {
            const { data, error } = await supabase
                .from('advice')
                .select('*');

            if (error) throw error;

            return data.map(a => ({
                adviceId: a.advice_id,
                contractType: a.contract_type,
                section: a.section,
                title: a.title,
                content: a.content,
                lastUpdated: a.last_updated
            }));
        } catch (error) {
            console.error('Supabase loadAdvice error, falling back to local:', error);
        }
    }

    try {
        // Try local cache first, then bundled file
        let data;
        try {
            data = await fs.readFile(ADVICE_FILE, 'utf8');
        } catch (e) {
            data = await fs.readFile(BUNDLED_ADVICE_FILE, 'utf8');
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load advice from any source:', error);
        return [];
    }
}

async function saveAdvice(advice) {
    if (USE_SUPABASE) {
        // Upsert advice items
        const dbAdvice = advice.map(a => ({
            advice_id: a.adviceId,
            contract_type: a.contractType,
            section: a.section,
            title: a.title,
            content: a.content,
            last_updated: a.lastUpdated || new Date().toISOString()
        }));

        const { error } = await supabase
            .from('advice')
            .upsert(dbAdvice, { onConflict: 'advice_id' });

        if (error) {
            console.error('Supabase saveAdvice error:', error);
            throw error;
        }
    } else {
        await ensureStorageDir();
        await fs.writeFile(ADVICE_FILE, JSON.stringify(advice, null, 2), 'utf8');
    }
}

async function getAdviceByType(contractType) {
    if (USE_SUPABASE) {
        try {
            const { data, error } = await supabase
                .from('advice')
                .select('*')
                .eq('contract_type', contractType);

            if (error) throw error;

            return data.map(a => ({
                adviceId: a.advice_id,
                contractType: a.contract_type,
                section: a.section,
                title: a.title,
                content: a.content,
                lastUpdated: a.last_updated
            }));
        } catch (error) {
            console.error('Supabase getAdviceByType error, falling back to local:', error);
        }
    }

    const advice = await loadAdvice();
    return advice.filter(a => a.contractType === contractType);
}

async function getAdviceByTypeAndSection(contractType, section) {
    if (USE_SUPABASE) {
        try {
            const { data, error } = await supabase
                .from('advice')
                .select('*')
                .eq('contract_type', contractType)
                .eq('section', section)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // Not found
                throw error;
            }

            return {
                adviceId: data.advice_id,
                contractType: data.contract_type,
                section: data.section,
                title: data.title,
                content: data.content,
                lastUpdated: data.last_updated
            };
        } catch (error) {
            console.error('Supabase getAdviceByTypeAndSection error, falling back to local:', error);
        }
    }

    const advice = await loadAdvice();
    return advice.find(a => a.contractType === contractType && a.section === section);
}

async function searchAdvice(query) {
    if (USE_SUPABASE) {
        try {
            // Use full-text search if possible, or simple ilike
            const { data, error } = await supabase
                .from('advice')
                .select('*')
                .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

            if (error) throw error;

            return data.map(a => ({
                adviceId: a.advice_id,
                contractType: a.contract_type,
                section: a.section,
                title: a.title,
                content: a.content,
                lastUpdated: a.last_updated
            }));
        } catch (error) {
            console.error('Supabase searchAdvice error, falling back to local:', error);
        }
    }

    const advice = await loadAdvice();
    const lowerQuery = query.toLowerCase();
    return advice.filter(a =>
        (a.content || '').toLowerCase().includes(lowerQuery) ||
        (a.contractType || '').toLowerCase().includes(lowerQuery) ||
        (a.section || '').toLowerCase().includes(lowerQuery) ||
        (a.title || '').toLowerCase().includes(lowerQuery)
    );
}

module.exports = {
    storeAnalysis,
    getAnalysis,
    getAllAnalyses,
    getInsights,
    createUser,
    getUserByEmail,
    getUserById,
    updateUser,
    incrementScanCount,
    storeLetter,
    getLetter,
    getUserLetters,
    updateLetter,
    getAdviceByType,
    getAdviceByTypeAndSection,
    searchAdvice,
    saveAdvice,
    loadAdvice,
    encrypt,
    decrypt
};
