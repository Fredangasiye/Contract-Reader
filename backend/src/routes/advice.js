const express = require('express');
const router = express.Router();
const { getAdviceByType, getAdviceByTypeAndSection, searchAdvice, loadAdvice, saveAdvice } = require('../services/dataStorage');
const path = require('path');
const fs = require('fs').promises;

// Initialize advice content from JSON file on first load
let adviceInitialized = false;

async function initializeAdviceContent() {
    if (adviceInitialized) return;

    try {
        // Check if advice already exists in storage
        const existingAdvice = await loadAdvice();
        if (existingAdvice && existingAdvice.length > 0) {
            adviceInitialized = true;
            console.log('Advice already exists in storage, skipping initialization');
            return;
        }

        const adviceFilePath = path.join(__dirname, '../../data/advice_content.json');
        const adviceJson = await fs.readFile(adviceFilePath, 'utf8');
        const adviceContent = JSON.parse(adviceJson);

        // Save to storage
        await saveAdvice(adviceContent);
        adviceInitialized = true;
        console.log('Advice content initialized from JSON file');
    } catch (error) {
        console.error('Failed to initialize advice content:', error);
    }
}

// Initialize on module load
initializeAdviceContent();

/**
 * GET /advice
 * Get all available contract types
 */
router.get('/', async (req, res) => {
    try {
        await initializeAdviceContent();
        const advice = await loadAdvice();

        // Get unique contract types
        const contractTypes = [...new Set(advice.map(a => a.contractType))];

        const types = contractTypes.map(type => ({
            id: type,
            name: formatContractTypeName(type),
            sectionCount: advice.filter(a => a.contractType === type).length
        }));

        res.json({ contractTypes: types });
    } catch (error) {
        console.error('Get contract types error:', error);
        res.status(500).json({ error: 'Failed to get contract types', message: error.message });
    }
});

/**
 * GET /advice/:contractType
 * Get all advice for a specific contract type
 */
router.get('/:contractType', async (req, res) => {
    try {
        await initializeAdviceContent();
        const advice = await getAdviceByType(req.params.contractType);

        if (!advice || advice.length === 0) {
            return res.status(404).json({ error: 'Contract type not found' });
        }

        res.json({
            contractType: req.params.contractType,
            contractTypeName: formatContractTypeName(req.params.contractType),
            sections: advice
        });
    } catch (error) {
        console.error('Get advice error:', error);
        res.status(500).json({ error: 'Failed to get advice', message: error.message });
    }
});

/**
 * GET /advice/:contractType/:section
 * Get specific section of advice for a contract type
 */
router.get('/:contractType/:section', async (req, res) => {
    try {
        await initializeAdviceContent();
        const advice = await getAdviceByTypeAndSection(req.params.contractType, req.params.section);

        if (!advice) {
            return res.status(404).json({ error: 'Advice section not found' });
        }

        res.json(advice);
    } catch (error) {
        console.error('Get advice section error:', error);
        res.status(500).json({ error: 'Failed to get advice section', message: error.message });
    }
});

/**
 * GET /advice/search
 * Search advice content
 */
router.get('/search', async (req, res) => {
    try {
        await initializeAdviceContent();
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const results = await searchAdvice(q);

        res.json({
            query: q,
            results: results,
            count: results.length
        });
    } catch (error) {
        console.error('Search advice error:', error);
        res.status(500).json({ error: 'Failed to search advice', message: error.message });
    }
});

/**
 * Helper function to format contract type names
 */
function formatContractTypeName(type) {
    const names = {
        'gym': 'Gym Membership',
        'insurance-medical': 'Medical Insurance',
        'insurance-car': 'Car Insurance',
        'rental': 'Rental/Lease Agreement',
        'employment': 'Employment Contract',
        'mortgage': 'Home Loan/Mortgage',
        'phone': 'Phone/Internet Contract'
    };

    return names[type] || type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = router;
