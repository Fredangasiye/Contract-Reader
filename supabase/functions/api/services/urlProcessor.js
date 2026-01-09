const axios = require('axios');
const cheerio = require('cheerio');
const { extractTextFromFile } = require('./visionOcr');

/**
 * Fetch and convert URL content to processable format
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} - { buffer, mimeType, text }
 */
async function fetchAndConvert(url) {
    try {
        // Validate URL
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            throw new Error('Only HTTP and HTTPS URLs are supported');
        }

        // Fetch content
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            maxRedirects: 5,
            timeout: 30000,
            headers: {
                'User-Agent': 'Contract-Reader-Bot/1.0'
            }
        });

        const contentType = response.headers['content-type'] || '';
        const buffer = Buffer.from(response.data);

        // Handle different content types
        if (contentType.includes('text/html')) {
            // Extract text from HTML
            const html = buffer.toString('utf-8');
            const text = extractTextFromHtml(html);

            return {
                buffer: Buffer.from(text, 'utf-8'),
                mimeType: 'text/plain',
                text,
                sourceType: 'html'
            };
        } else if (contentType.includes('application/pdf')) {
            return {
                buffer,
                mimeType: 'application/pdf',
                sourceType: 'pdf'
            };
        } else if (contentType.startsWith('image/')) {
            return {
                buffer,
                mimeType: contentType,
                sourceType: 'image'
            };
        } else {
            throw new Error(`Unsupported content type: ${contentType}`);
        }

    } catch (error) {
        if (error.response) {
            throw new Error(`Failed to fetch URL (${error.response.status}): ${error.message}`);
        }
        throw new Error(`Failed to fetch URL: ${error.message}`);
    }
}

/**
 * Extract clean text from HTML
 * @param {string} html - HTML content
 * @returns {string} - Extracted text
 */
function extractTextFromHtml(html) {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript').remove();

    // Get text from main content areas
    let text = '';

    // Try to find main content
    const mainSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.main-content',
        '#main-content',
        '.content',
        '#content'
    ];

    let mainContent = null;
    for (const selector of mainSelectors) {
        mainContent = $(selector).first();
        if (mainContent.length > 0) break;
    }

    if (mainContent && mainContent.length > 0) {
        text = mainContent.text();
    } else {
        // Fallback to body
        text = $('body').text();
    }

    // Clean up whitespace
    text = text
        .replace(/\\s+/g, ' ')
        .replace(/\\n+/g, '\\n')
        .trim();

    return text;
}

/**
 * Process URL and extract text using Vision OCR if needed
 * @param {string} url - URL to process
 * @returns {Promise<Object>} - OCR result
 */
async function extractTextFromUrl(url) {
    const { buffer, mimeType, text, sourceType } = await fetchAndConvert(url);

    // If we already have text (HTML), return it directly
    if (text) {
        return {
            fullText: text,
            pages: [{
                text,
                boundingBoxes: []
            }],
            confidence: 1.0,
            sourceType,
            sourceUrl: url
        };
    }

    // Otherwise, use Vision OCR for images/PDFs
    const ocrResult = await extractTextFromFile(buffer, mimeType);
    return {
        ...ocrResult,
        sourceType,
        sourceUrl: url
    };
}

module.exports = {
    fetchAndConvert,
    extractTextFromHtml,
    extractTextFromUrl
};
