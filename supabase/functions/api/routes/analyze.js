
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

// Import services
const { extractTextFromFile } = require('../services/visionOcr');
const { extractTextFromUrl } = require('../services/urlProcessor');
const { findRedFlags } = require('../services/rulesEngine');
const { generateSummary, enhanceRedFlags, detectBlindSpots, extractContractFields } = require('../services/llmAnalysis');
const { mapFlagsToBoxes } = require('../services/boundingBoxMapper');
const { storeAnalysis } = require('../services/dataStorage');

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/tiff',
            'image/heic',
            'application/pdf',
            'text/plain' // For testing
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    }
});

/**
 * POST /analyze
 * Accepts file upload OR URL and performs complete analysis
 */
router.post('/', upload.single('file'), async (req, res) => {
    const startTime = Date.now();

    try {
        let ocrResult;
        let source = 'file';
        let fileType = 'unknown';

        // Process file upload or URL
        if (req.file) {
            // File upload
            const buffer = await fs.readFile(req.file.path);
            fileType = req.file.mimetype;
            const password = req.body.password || '';

            ocrResult = await extractTextFromFile(buffer, req.file.mimetype, password);

            // Clean up uploaded file
            await fs.unlink(req.file.path).catch(() => { });

        } else if (req.body.url) {
            // URL processing
            source = 'url';
            ocrResult = await extractTextFromUrl(req.body.url);
            fileType = ocrResult.sourceType || 'url';

        } else {
            return res.status(400).json({
                error: 'Either file upload or URL is required'
            });
        }

        const fullText = ocrResult.fullText || '';
        const pages = ocrResult.pages || [];
        const ocrConfidence = ocrResult.confidence || 0;

        if (!fullText) {
            return res.status(400).json({
                error: 'No text could be extracted from the document'
            });
        }

        // Step 1: Run rules engine (auto-detect type)
        console.log('Running rules engine...');
        // Pass null to trigger auto-detection in findRedFlags
        let flags = await findRedFlags(fullText, null);

        // We can get the detected type by checking the rules engine or re-running detection
        // For simplicity, let's re-detect here to send to frontend
        const { detectContractType } = require('../services/rulesEngine');
        const detectedType = detectContractType(fullText);

        // Step 2: Generate LLM summary
        console.log('Generating summary...');
        const summary = await generateSummary(fullText);

        // Step 3: Enhance flags with LLM insights
        console.log('Enhancing flags with LLM...');
        flags = await enhanceRedFlags(fullText, flags);

        // Step 4: Detect blind spots
        console.log('Detecting blind spots...');
        const blindSpots = await detectBlindSpots(fullText);
        flags = [...flags, ...blindSpots];

        // Step 5: Extract fields for letter generation
        console.log('Extracting contract fields...');
        const extractedData = await extractContractFields(fullText, detectedType);

        // Step 6: Map flags to bounding boxes
        console.log('Mapping bounding boxes...');
        flags = mapFlagsToBoxes(flags, pages);

        // Step 7: Store analysis
        console.log('Storing analysis...');
        const processingTimeMs = Date.now() - startTime;

        const storedAnalysis = await storeAnalysis({
            source,
            sourceUrl: req.body.url || null,
            fullText,
            summary,
            flags,
            ocrConfidence,
            rulesVersion: '1.0.0',
            llmModel: process.env.OPENROUTER_API_KEY ? 'mistral-7b' : 'stub',
            fileType,
            pageCount: pages.length,
            processingTimeMs,
            metadata: {
                contractType: detectedType,
                extractedFields: extractedData.fields,
                suggestedLetterType: extractedData.suggestedLetterType
            }
        });

        // Return comprehensive response
        res.json({
            id: storedAnalysis.id,
            full_text: fullText,
            summary,
            contract_type: detectedType,
            flags: flags.map(f => ({
                id: f.id,
                title: f.title,
                severity: f.severity,
                confidence: f.confidence,
                plain_english: f.plain_english,
                evidence: f.evidence,
                page: f.page,
                bounding_boxes: f.boundingBoxes || [],
                category: f.category,
                llm_insight: f.llm_insight,
                source: f.source || 'rules'
            })),
            ocr_confidence: ocrConfidence,
            rules_version: '1.0.0',
            processing_time_ms: processingTimeMs,
            page_count: pages.length,
            is_stub: ocrResult.isStub || false,
            extracted_fields: extractedData.fields,
            suggested_letter_type: extractedData.suggestedLetterType
        });

    } catch (error) {
        console.error('Analyze error:', error);

        // Clean up file if it exists
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to analyze document',
            message: error.message
        });
    }
});

module.exports = router;
