const express = require('express');
const router = express.Router();
const { getInsights, getAllAnalyses, getAnalysis } = require('../services/dataStorage');

/**
 * GET /admin/insights
 * Get aggregated statistics and trends
 */
router.get('/insights', async (req, res) => {
    try {
        const insights = await getInsights();
        res.json(insights);
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({
            error: 'Failed to get insights',
            message: error.message
        });
    }
});

/**
 * GET /admin/analyses
 * List all analyses (paginated)
 */
router.get('/analyses', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const result = await getAllAnalyses({ page, pageSize });
        res.json(result);
    } catch (error) {
        console.error('List analyses error:', error);
        res.status(500).json({
            error: 'Failed to list analyses',
            message: error.message
        });
    }
});

/**
 * GET /admin/analyses/:id
 * Get a specific analysis by ID
 */
router.get('/analyses/:id', async (req, res) => {
    try {
        const analysis = await getAnalysis(req.params.id);

        if (!analysis) {
            return res.status(404).json({
                error: 'Analysis not found'
            });
        }

        res.json(analysis);
    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({
            error: 'Failed to get analysis',
            message: error.message
        });
    }
});

module.exports = router;
