import { useState } from 'react';
import { analyzeContract } from '../api';
import axios from 'axios';

function UploadForm({ onAnalysisComplete }) {
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [password, setPassword] = useState('');
    const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setUrl('');
            setUploadMode('file');
            setError(null);
        }
    };

    const handleUrlChange = (e) => {
        setUrl(e.target.value);
        setFile(null);
        setUploadMode('url');
        setError(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0]);
            setUrl('');
            setUploadMode('file');
            setError(null);
        }
    };

    const simulateProgress = () => {
        setUploadProgress(0);
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 300);
        return interval;
    };

    const handleUpload = async () => {
        if (!file && !url) {
            setError("Please select a file or enter a URL.");
            return;
        }

        setIsUploading(true);
        setError(null);
        const progressInterval = simulateProgress();

        try {
            console.log("Starting analysis...");
            let analysisResult;

            if (uploadMode === 'url' && url) {
                // Analyze from URL
                const response = await axios.post('http://localhost:8080/analyze',
                    { url },
                    { headers: { 'Content-Type': 'application/json' } }
                );
                analysisResult = response.data;
            } else {
                // Analyze from file
                analysisResult = await analyzeContract(file, password);
            }

            console.log("Analysis success:", analysisResult);

            clearInterval(progressInterval);
            setUploadProgress(100);

            setTimeout(() => {
                onAnalysisComplete(analysisResult);
            }, 500);
        } catch (err) {
            console.error("Error in analysis flow:", err);
            clearInterval(progressInterval);
            setError("Failed to process contract. Please try again.");
        } finally {
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 600);
        }
    };

    const getFileIcon = (fileName) => {
        if (fileName.endsWith('.pdf')) return '📄';
        if (fileName.match(/\.(jpg|jpeg|png)$/i)) return '🖼️';
        return '📄';
    };

    return (
        <div className="upload-container">
            <div
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !file && !url && document.getElementById('file-input').click()}
            >
                <input
                    type="file"
                    id="file-input"
                    onChange={handleFileChange}
                    accept=".txt,.pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                />

                <div className="drop-zone-content">
                    {file ? (
                        <div className="file-selected">
                            <span className="file-selected-icon">{getFileIcon(file.name)}</span>
                            <span>{file.name}</span>
                        </div>
                    ) : url ? (
                        <div className="file-selected">
                            <span className="file-selected-icon">🔗</span>
                            <span>{url}</span>
                        </div>
                    ) : (
                        <>
                            <div className="upload-icon">📤</div>
                            <label htmlFor="file-input" className="drop-label">
                                Drag & drop your contract here
                            </label>
                            <p className="drop-sublabel">or click to browse</p>
                            <p className="drop-sublabel" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                                Supports PDF, TXT, JPG, PNG
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="url-divider">
                <span>OR</span>
            </div>

            <input
                type="url"
                placeholder="Enter contract URL (e.g., https://example.com/contract.pdf)"
                value={url}
                onChange={handleUrlChange}
                className="url-input"
                disabled={!!file}
            />

            {file && file.name.endsWith('.pdf') && (
                <input
                    type="password"
                    placeholder="PDF password (if protected)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="password-input"
                />
            )}

            {isUploading && (
                <div className="progress-container">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="progress-text">
                        {uploadProgress < 100 ? `Analyzing contract... ${uploadProgress}%` : 'Complete! ✓'}
                    </p>
                </div>
            )}

            <button onClick={handleUpload} disabled={(!file && !url) || isUploading} className="analyze-btn">
                {isUploading ? (
                    <>
                        <span className="animate-pulse">🔍</span> Analyzing...
                    </>
                ) : (
                    <>🚀 Analyze Contract</>
                )}
            </button>

            {error && <p className="error">⚠️ {error}</p>}
        </div>
    );
}

export default UploadForm;
