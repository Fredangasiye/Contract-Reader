const express = require('express');
const router = express.Router();
const multer = require('multer');
const gcs = require('../services/gcs');

// Configure Multer
// We use memory storage to allow the GCS service to handle the file stream or write to disk as needed.
// This gives us flexibility to support both GCS and local storage without Multer pre-saving to disk.
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await gcs.uploadFile(req.file);
        res.json(result);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

module.exports = router;
