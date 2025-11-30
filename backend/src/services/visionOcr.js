const vision = require('@google-cloud/vision');
const sharp = require('sharp');

// Polyfill for pdf-parse/pdfjs-dist on Node 18+
if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
        constructor() { this.m = [1, 0, 0, 1, 0, 0]; }
    };
}
const pdf = require('pdf-parse');

// Initialize Vision API client
// If credentials are not set, this will use a stub mode
let visionClient = null;

try {
    // Prefer API key over service account (to avoid billing issues)
    if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
        visionClient = new vision.ImageAnnotatorClient({
            apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY
        });
        console.log('✓ Google Cloud Vision API initialized with API key');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        visionClient = new vision.ImageAnnotatorClient();
        console.log('✓ Google Cloud Vision API initialized with service account');
    } else {
        console.warn('⚠ No Google Cloud Vision credentials found. Using stub mode.');
    }
} catch (error) {
    console.warn('⚠ Failed to initialize Vision API:', error.message);
    console.warn('⚠ Using stub mode for OCR');
}

/**
 * Compress and optimize image for Vision API
 * @param {Buffer} buffer - Image buffer
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {Promise<Buffer>}
 */
async function compressImage(buffer, maxSizeMB = 10) {
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (buffer.length <= maxBytes) {
        return buffer;
    }

    console.log(`Compressing image from ${(buffer.length / 1024 / 1024).toFixed(2)}MB...`);

    // Calculate compression quality
    const ratio = maxBytes / buffer.length;
    const quality = Math.max(20, Math.min(90, Math.floor(ratio * 100)));

    const compressed = await sharp(buffer)
        .jpeg({ quality, progressive: true })
        .toBuffer();

    console.log(`Compressed to ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
    return compressed;
}

/**
 * Extract text from image/PDF using Google Cloud Vision API
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} - { fullText, pages, confidence }
 */
async function extractTextFromFile(buffer, mimeType = 'image/jpeg', password = '') {
    // Stub mode if no Vision API
    if (!visionClient) {
        return extractTextStub(buffer, mimeType);
    }

    try {
        // Handle plain text files natively without Vision API
        if (mimeType === 'text/plain') {
            const text = buffer.toString('utf-8');
            return {
                fullText: text,
                pages: [{
                    text: text,
                    boundingBoxes: [] // No bounding boxes for plain text
                }],
                confidence: 1.0,
                isStub: false
            };
        }

        // Try local PDF extraction first
        if (mimeType === 'application/pdf') {
            try {
                console.log('Attempting local PDF extraction...');
                console.log('Password provided:', password ? 'Yes' : 'No');
                const options = password ? { password } : {};
                const pdfData = await pdf(buffer, options);

                if (pdfData.text && pdfData.text.trim().length > 0) {
                    console.log('✓ Local PDF extraction successful');
                    return {
                        fullText: pdfData.text,
                        pages: [{
                            text: pdfData.text,
                            boundingBoxes: []
                        }],
                        confidence: 1.0,
                        isStub: false,
                        source: 'local_pdf'
                    };
                }
                console.log('Local PDF extraction yielded no text');
                // Note: Vision API cannot process PDF buffers directly
                // Would need to convert PDF to images first (not implemented)
                throw new Error('No text found in PDF');
            } catch (pdfError) {
                if (pdfError.message.includes('password')) {
                    console.error('PDF is password-protected. Please provide the correct password.');
                    throw new Error('PDF is password-protected. Please provide the correct password.');
                }
                console.warn('Local PDF extraction failed:', pdfError.message);
                throw pdfError; // Don't try to send PDF to Vision API
            }
        }

        // Compress if needed
        if (mimeType.startsWith('image/')) {
            buffer = await compressImage(buffer);
        }

        const request = {
            image: { content: buffer },
            features: [
                { type: 'DOCUMENT_TEXT_DETECTION' },
                { type: 'TEXT_DETECTION' }
            ]
        };

        const [result] = await visionClient.annotateImage(request);

        if (result.error) {
            throw new Error(`Vision API error: ${result.error.message}`);
        }

        const fullTextAnnotation = result.fullTextAnnotation;
        const textAnnotations = result.textAnnotations;

        if (!fullTextAnnotation && !textAnnotations) {
            return {
                fullText: '',
                pages: [],
                confidence: 0,
                error: 'No text detected in document'
            };
        }

        // Extract full text
        const fullText = fullTextAnnotation?.text || textAnnotations[0]?.description || '';

        // Extract pages with bounding boxes
        const pages = [];

        if (fullTextAnnotation?.pages) {
            for (const page of fullTextAnnotation.pages) {
                const pageData = {
                    text: '',
                    boundingBoxes: []
                };

                for (const block of page.blocks || []) {
                    for (const paragraph of block.paragraphs || []) {
                        let paragraphText = '';

                        for (const word of paragraph.words || []) {
                            const wordText = word.symbols
                                .map(s => s.text)
                                .join('');

                            paragraphText += wordText + ' ';

                            // Store bounding box for each word
                            if (word.boundingBox) {
                                pageData.boundingBoxes.push({
                                    text: wordText,
                                    vertices: word.boundingBox.vertices.map(v => ({
                                        x: v.x || 0,
                                        y: v.y || 0
                                    })),
                                    confidence: word.confidence || 0
                                });
                            }
                        }

                        pageData.text += paragraphText.trim() + '\\n';
                    }
                }

                pages.push(pageData);
            }
        } else {
            // Fallback: single page with text annotations
            const pageData = {
                text: fullText,
                boundingBoxes: []
            };

            if (textAnnotations && textAnnotations.length > 1) {
                // Skip first annotation (full text)
                for (let i = 1; i < textAnnotations.length; i++) {
                    const annotation = textAnnotations[i];
                    pageData.boundingBoxes.push({
                        text: annotation.description,
                        vertices: annotation.boundingPoly.vertices.map(v => ({
                            x: v.x || 0,
                            y: v.y || 0
                        })),
                        confidence: 1.0
                    });
                }
            }

            pages.push(pageData);
        }

        // Calculate average confidence
        let totalConfidence = 0;
        let count = 0;

        for (const page of pages) {
            for (const box of page.boundingBoxes) {
                if (box.confidence) {
                    totalConfidence += box.confidence;
                    count++;
                }
            }
        }

        const confidence = count > 0 ? totalConfidence / count : 0.95;

        return {
            fullText,
            pages,
            confidence: Math.round(confidence * 100) / 100
        };

    } catch (error) {
        console.error('Vision API error:', error.message);

        // Don't fallback to stub if it's a password error - propagate it
        if (error.message.includes('password')) {
            throw error;
        }

        // Fallback to stub if API fails (e.g. billing not enabled)
        console.warn('⚠ Falling back to stub mode due to Vision API error');
        return extractTextStub(buffer, mimeType);
    }
}

/**
 * Stub implementation for when Vision API is not available
 * @param {Buffer} buffer 
 * @param {string} mimeType 
 * @returns {Object}
 */
function extractTextStub(buffer, mimeType) {
    console.log('Using stub OCR (no Vision API credentials)');

    // Generate realistic-looking stub data
    const stubText = `[STUB OCR OUTPUT]

This is a placeholder text extraction. In production, this would contain the actual 
text extracted from the uploaded document using Google Cloud Vision API.

To enable real OCR:
1. Set up Google Cloud Vision API credentials
2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
3. Or set GOOGLE_CLOUD_VISION_API_KEY

Document type: ${mimeType}
Buffer size: ${(buffer.length / 1024).toFixed(2)} KB

Sample insurance contract text for testing:
The maximum payable amount is R20,000 per claim.
You must report incidents to the police within 24 hours.
An excess of R5,000 applies to all claims.`;

    return {
        fullText: stubText,
        pages: [{
            text: stubText,
            boundingBoxes: [
                {
                    text: 'maximum payable amount is R20,000',
                    vertices: [
                        { x: 100, y: 200 },
                        { x: 500, y: 200 },
                        { x: 500, y: 250 },
                        { x: 100, y: 250 }
                    ],
                    confidence: 0.98
                },
                {
                    text: 'report incidents to the police within 24 hours',
                    vertices: [
                        { x: 100, y: 300 },
                        { x: 600, y: 300 },
                        { x: 600, y: 350 },
                        { x: 100, y: 350 }
                    ],
                    confidence: 0.97
                },
                {
                    text: 'excess of R5,000',
                    vertices: [
                        { x: 100, y: 400 },
                        { x: 350, y: 400 },
                        { x: 350, y: 450 },
                        { x: 100, y: 450 }
                    ],
                    confidence: 0.99
                }
            ]
        }],
        confidence: 0.98,
        isStub: true
    };
}

/**
 * Extract text from URL (fetch and process)
 * @param {string} url - URL to process
 * @returns {Promise<Object>}
 */
async function extractTextFromUrl(url) {
    // This will be implemented in urlProcessor.js
    throw new Error('URL processing not yet implemented. Use urlProcessor.extractTextFromUrl()');
}

module.exports = {
    extractTextFromFile,
    extractTextFromUrl,
    compressImage
};
