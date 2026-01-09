/**
 * Normalizes text by removing extra whitespace and converting smart quotes.
 * @param {string} text 
 * @returns {string}
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Finds the shortest sentence containing the match.
 * @param {string} text 
 * @param {number} start 
 * @param {number} end 
 * @returns {string}
 */
function findShortestSentenceContaining(text, start, end) {
    if (!text) return '';

    // Simple sentence boundary detection
    // Look backwards for sentence start
    let sentenceStart = start;
    while (sentenceStart > 0) {
        const char = text[sentenceStart - 1];
        if (/[.?!;\n]/.test(char)) {
            break;
        }
        sentenceStart--;
    }

    // Look forwards for sentence end
    let sentenceEnd = end;
    while (sentenceEnd < text.length) {
        const char = text[sentenceEnd];
        if (/[.?!;\n]/.test(char)) {
            sentenceEnd++; // Include the punctuation
            break;
        }
        sentenceEnd++;
    }

    return text.substring(sentenceStart, sentenceEnd).trim();
}

/**
 * Formats the evidence by highlighting the matched text.
 * @param {string} sentence 
 * @param {string} matchText 
 * @returns {string}
 */
function formatEvidence(sentence, matchText) {
    if (!sentence || !matchText) return sentence;
    // Case insensitive replacement
    const regex = new RegExp(escapeRegExp(matchText), 'gi');
    return sentence.replace(regex, (match) => `<em>${match}</em>`);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    normalizeText,
    findShortestSentenceContaining,
    formatEvidence
};
