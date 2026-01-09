/**
 * Map flagged text to OCR bounding boxes
 * Uses fuzzy matching to find text locations in OCR results
 */

/**
 * Find bounding boxes for a piece of evidence text
 * @param {string} evidenceText - The text to find
 * @param {Array} ocrPages - OCR pages with bounding boxes
 * @returns {Array} - Array of { page, boundingBoxes }
 */
function mapFlagsToBoxes(flags, ocrPages) {
    const results = [];

    for (const flag of flags) {
        const evidence = flag.evidence || flag.pattern || '';
        if (!evidence) {
            results.push({
                ...flag,
                page: null,
                boundingBoxes: []
            });
            continue;
        }

        // Find matching bounding boxes across all pages
        const matches = findTextInPages(evidence, ocrPages);

        if (matches.length > 0) {
            // Use the first match (or best match)
            const bestMatch = matches[0];
            results.push({
                ...flag,
                page: bestMatch.page,
                boundingBoxes: bestMatch.boundingBoxes
            });
        } else {
            // No match found
            results.push({
                ...flag,
                page: null,
                boundingBoxes: []
            });
        }
    }

    return results;
}

/**
 * Find text across all OCR pages
 * @param {string} searchText - Text to find
 * @param {Array} ocrPages - Pages with bounding boxes
 * @returns {Array} - Matches with page number and bounding boxes
 */
function findTextInPages(searchText, ocrPages) {
    const matches = [];
    const normalizedSearch = normalizeForMatching(searchText);

    for (let pageIndex = 0; pageIndex < ocrPages.length; pageIndex++) {
        const page = ocrPages[pageIndex];
        const pageMatches = findTextInPage(normalizedSearch, page, pageIndex + 1);
        matches.push(...pageMatches);
    }

    return matches;
}

/**
 * Find text within a single page
 * @param {string} searchText - Normalized search text
 * @param {Object} page - Page with text and bounding boxes
 * @param {number} pageNumber - Page number (1-indexed)
 * @returns {Array} - Matches
 */
function findTextInPage(searchText, page, pageNumber) {
    const matches = [];
    const pageText = normalizeForMatching(page.text || '');

    // Check if search text exists in page
    if (!pageText.includes(searchText)) {
        return matches;
    }

    // Try to find matching bounding boxes
    const boxes = findMatchingBoxes(searchText, page.boundingBoxes || []);

    if (boxes.length > 0) {
        matches.push({
            page: pageNumber,
            boundingBoxes: boxes
        });
    }

    return matches;
}

/**
 * Find bounding boxes that match the search text
 * @param {string} searchText - Normalized search text
 * @param {Array} boundingBoxes - Array of bounding box objects
 * @returns {Array} - Matching bounding boxes
 */
function findMatchingBoxes(searchText, boundingBoxes) {
    const matchedBoxes = [];
    const searchWords = searchText.split(/\\s+/).filter(w => w.length > 0);

    // Build a sliding window of words from bounding boxes
    for (let i = 0; i < boundingBoxes.length; i++) {
        const windowText = [];
        const windowBoxes = [];

        // Collect words in a window
        for (let j = i; j < Math.min(i + searchWords.length + 5, boundingBoxes.length); j++) {
            const box = boundingBoxes[j];
            const boxText = normalizeForMatching(box.text || '');
            windowText.push(boxText);
            windowBoxes.push(box);
        }

        const combinedText = windowText.join(' ');

        // Check if search text matches this window
        if (combinedText.includes(searchText)) {
            // Find exact matching boxes
            const exactBoxes = findExactMatchingBoxes(searchWords, windowBoxes);
            if (exactBoxes.length > 0) {
                matchedBoxes.push(...exactBoxes);
                break; // Found a match, stop searching
            }
        }
    }

    // If we found boxes, merge adjacent ones into regions
    if (matchedBoxes.length > 0) {
        return mergeAdjacentBoxes(matchedBoxes);
    }

    return [];
}

/**
 * Find exact boxes that match search words
 * @param {Array} searchWords - Words to match
 * @param {Array} boxes - Bounding boxes
 * @returns {Array} - Matched boxes
 */
function findExactMatchingBoxes(searchWords, boxes) {
    const matched = [];
    let searchIndex = 0;

    for (const box of boxes) {
        const boxText = normalizeForMatching(box.text || '');

        if (boxText === searchWords[searchIndex]) {
            matched.push(box);
            searchIndex++;

            if (searchIndex >= searchWords.length) {
                break; // Found all words
            }
        } else if (searchIndex > 0) {
            // Reset if we were in the middle of matching
            searchIndex = 0;
            matched.length = 0;
        }
    }

    return matched;
}

/**
 * Merge adjacent bounding boxes into a single region
 * @param {Array} boxes - Bounding boxes to merge
 * @returns {Array} - Merged bounding box
 */
function mergeAdjacentBoxes(boxes) {
    if (boxes.length === 0) return [];
    if (boxes.length === 1) return [convertToStandardFormat(boxes[0])];

    // Find min/max coordinates
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const box of boxes) {
        const vertices = box.vertices || [];
        for (const vertex of vertices) {
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
        }
    }

    return [{
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    }];
}

/**
 * Convert bounding box to standard format
 * @param {Object} box - Bounding box with vertices
 * @returns {Object} - Standard format { x, y, width, height }
 */
function convertToStandardFormat(box) {
    if (box.x !== undefined) {
        return box; // Already in standard format
    }

    const vertices = box.vertices || [];
    if (vertices.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Normalize text for matching
 * @param {string} text - Text to normalize
 * @returns {string} - Normalized text
 */
function normalizeForMatching(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\\s]/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();
}

module.exports = {
    mapFlagsToBoxes,
    findTextInPages,
    findMatchingBoxes,
    mergeAdjacentBoxes
};
