const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET;

async function uploadFile(file) {
    if (bucketName) {
        // GCS Upload
        try {
            const bucket = storage.bucket(bucketName);
            const gcsFileName = `${Date.now()}-${file.originalname}`;
            const fileUpload = bucket.file(gcsFileName);

            const stream = fileUpload.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                },
            });

            return new Promise((resolve, reject) => {
                stream.on('error', (err) => {
                    reject(err);
                });

                stream.on('finish', () => {
                    resolve({
                        filename: gcsFileName,
                        path: `gs://${bucketName}/${gcsFileName}`,
                        location: 'gcs'
                    });
                });

                stream.end(file.buffer);
            });
        } catch (error) {
            console.error("GCS Upload Error:", error);
            throw error;
        }
    } else {
        // Local Upload
        // Multer already saved the file to disk if we configured it that way, 
        // but if we are using memory storage for GCS compatibility, we might need to write it.
        // However, the plan says "uses multer to accept multipart file field file; saves to uploads/".
        // If we use DiskStorage for multer, the file is already there.
        // But to support both, it's often easier to use MemoryStorage and then decide.
        // Let's assume Multer is configured with DiskStorage for local dev simplicity in the route, 
        // OR we handle it here. 
        // Actually, the plan says "uses multer ... saves to uploads/". 
        // And "provide two modes: if GCS_BUCKET present ... otherwise save to local uploads/ folder".

        // If we want to support both seamlessly, we should probably use MemoryStorage in the route
        // and then write to disk or GCS here.

        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(uploadsDir, filename);

        // If file.buffer is available (MemoryStorage)
        if (file.buffer) {
            fs.writeFileSync(filePath, file.buffer);
            return {
                filename: filename,
                path: filePath,
                location: 'local'
            };
        } else if (file.path) {
            // Already saved by Multer DiskStorage
            return {
                filename: file.filename,
                path: file.path,
                location: 'local'
            };
        } else {
            throw new Error("File buffer or path not found");
        }
    }
}

module.exports = { uploadFile };
