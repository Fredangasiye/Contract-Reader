const fs = require('fs');
const path = require('path');

async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
        try {
            const text = fs.readFileSync(filePath, 'utf8');
            return text;
        } catch (err) {
            console.error("Error reading text file:", err);
            return "Error reading file";
        }
    } else if (ext === '.pdf') {
        // Stub for PDF
        return "OCR stub - PDF text extraction not yet implemented. (Simulated extraction)";
    } else {
        return "OCR stub - no text extracted";
    }
}

module.exports = { extractText };
