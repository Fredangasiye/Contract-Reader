const express = require('express');
const router = express.Router();
const { authenticateToken, requirePremium } = require('../middleware/auth');
const { storeLetter, getLetter, getUserLetters, updateLetter } = require('../services/dataStorage');
const { generateLetter, getLetterTemplates } = require('../services/letterGenerator');

/**
 * POST /letters/generate
 * Generate a new dispute letter (premium feature)
 */
router.post('/generate', authenticateToken, requirePremium, async (req, res) => {
    try {
        const {
            contractId,
            letterType,
            userInfo,
            customData
        } = req.body;

        // Validate required fields
        if (!letterType) {
            return res.status(400).json({ error: 'Letter type is required' });
        }

        // Generate the letter
        const generatedLetter = await generateLetter({
            contractId,
            letterType,
            userInfo: userInfo || {},
            customData: customData || {}
        });

        // Store the letter
        const storedLetter = await storeLetter({
            userId: req.user.userId,
            contractId,
            letterType,
            generatedContent: generatedLetter.content,
            customizations: {
                subject: generatedLetter.subject,
                userInfo,
                customData
            }
        });

        res.json({
            letterId: storedLetter.letterId,
            subject: generatedLetter.subject,
            content: generatedLetter.content,
            generatedAt: generatedLetter.generatedAt,
            createdAt: storedLetter.createdAt
        });
    } catch (error) {
        console.error('Letter generation error:', error);
        res.status(500).json({ error: 'Failed to generate letter', message: error.message });
    }
});

/**
 * GET /letters/templates
 * Get available letter templates
 */
router.get('/templates', (req, res) => {
    try {
        const templates = getLetterTemplates();
        res.json({ templates });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to get templates', message: error.message });
    }
});

/**
 * GET /letters
 * Get all letters for the current user
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const letters = await getUserLetters(req.user.userId);
        res.json({ letters });
    } catch (error) {
        console.error('Get letters error:', error);
        res.status(500).json({ error: 'Failed to get letters', message: error.message });
    }
});

/**
 * GET /letters/:id
 * Get a specific letter by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const letter = await getLetter(req.params.id);

        if (!letter) {
            return res.status(404).json({ error: 'Letter not found' });
        }

        // Verify ownership
        if (letter.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(letter);
    } catch (error) {
        console.error('Get letter error:', error);
        res.status(500).json({ error: 'Failed to get letter', message: error.message });
    }
});

/**
 * PUT /letters/:id
 * Update/customize a generated letter
 */
router.put('/:id', authenticateToken, requirePremium, async (req, res) => {
    try {
        const { generatedContent, customizations } = req.body;

        // Get existing letter to verify ownership
        const existingLetter = await getLetter(req.params.id);

        if (!existingLetter) {
            return res.status(404).json({ error: 'Letter not found' });
        }

        if (existingLetter.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Update letter
        const updates = {};
        if (generatedContent) updates.generatedContent = generatedContent;
        if (customizations) updates.customizations = { ...existingLetter.customizations, ...customizations };

        const updatedLetter = await updateLetter(req.params.id, updates);

        res.json({
            message: 'Letter updated successfully',
            letterId: updatedLetter.letterId
        });
    } catch (error) {
        console.error('Update letter error:', error);
        res.status(500).json({ error: 'Failed to update letter', message: error.message });
    }
});

module.exports = router;
