import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLetterTemplates, generateLetter, getUserLetters, getLetter } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './LetterGenerator.css';

export function LetterGenerator() {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [userInfo, setUserInfo] = useState({ name: '', email: '', phone: '' });
    const [customData, setCustomData] = useState({});
    const [generatedLetter, setGeneratedLetter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, isPremium } = useAuth();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!isPremium()) {
            navigate('/pricing');
            return;
        }
        loadTemplates();
    }, [user]);

    const loadTemplates = async () => {
        try {
            const data = await getLetterTemplates();
            setTemplates(data.templates);
        } catch (err) {
            setError('Failed to load templates');
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const letter = await generateLetter({
                letterType: selectedTemplate,
                userInfo,
                customData
            });
            setGeneratedLetter(letter);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate letter');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLetter.content);
        alert('Letter copied to clipboard!');
    };

    const handleDownload = () => {
        const blob = new Blob([generatedLetter.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getTemplateFields = (templateId) => {
        const fields = {
            gym_cancellation: ['gym_name', 'member_id', 'sign_date', 'reason'],
            insurance_claim_dispute: ['insurance_company', 'claim_number', 'claim_date', 'policy_number', 'situation'],
            lease_violation: ['landlord_name', 'property_address', 'situation', 'remedy_period'],
            employment_negotiation: ['employer_name', 'position', 'company_name', 'concerns'],
            service_cancellation: ['service_provider', 'account_number', 'cancellation_date', 'reason']
        };
        return fields[templateId] || [];
    };

    if (generatedLetter) {
        return (
            <div className="letter-generator-container">
                <div className="letter-preview">
                    <div className="preview-header">
                        <h2>Your Generated Letter</h2>
                        <button onClick={() => setGeneratedLetter(null)} className="btn-secondary">
                            Generate Another
                        </button>
                    </div>

                    <div className="letter-subject">
                        <strong>Subject:</strong> {generatedLetter.subject}
                    </div>

                    <div className="letter-content">
                        <pre>{generatedLetter.content}</pre>
                    </div>

                    <div className="letter-actions">
                        <button onClick={handleCopy} className="btn-primary">
                            📋 Copy to Clipboard
                        </button>
                        <button onClick={handleDownload} className="btn-primary">
                            ⬇️ Download as Text
                        </button>
                    </div>

                    <div className="disclaimer">
                        <strong>⚠️ Disclaimer:</strong> This letter is generated based on templates and your input.
                        It is not legal advice. Please consult with a licensed attorney for your specific situation.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="letter-generator-container">
            <div className="generator-header">
                <h1>Letter Generator</h1>
                <p>Create professional dispute letters based on your contract issues</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleGenerate} className="generator-form">
                <div className="form-section">
                    <h3>1. Select Letter Type</h3>
                    <div className="template-grid">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                onClick={() => setSelectedTemplate(template.id)}
                            >
                                <h4>{template.name}</h4>
                                <p>{template.subject}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedTemplate && (
                    <>
                        <div className="form-section">
                            <h3>2. Your Information</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Your Name *</label>
                                    <input
                                        type="text"
                                        value={userInfo.name}
                                        onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                                        required
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={userInfo.email}
                                        onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="tel"
                                        value={userInfo.phone}
                                        onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>3. Letter Details</h3>
                            <div className="form-grid">
                                {getTemplateFields(selectedTemplate).map((field) => (
                                    <div key={field} className="form-group">
                                        <label>{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                                        <input
                                            type="text"
                                            value={customData[field] || ''}
                                            onChange={(e) => setCustomData({ ...customData, [field]: e.target.value })}
                                            placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="btn-generate" disabled={loading}>
                            {loading ? 'Generating...' : '✨ Generate Letter'}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}

export function MyLetters() {
    const [letters, setLetters] = useState([]);
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadLetters();
    }, [user]);

    const loadLetters = async () => {
        try {
            const data = await getUserLetters();
            setLetters(data.letters);
        } catch (err) {
            console.error('Failed to load letters:', err);
        } finally {
            setLoading(false);
        }
    };

    const viewLetter = async (letterId) => {
        try {
            const letter = await getLetter(letterId);
            setSelectedLetter(letter);
        } catch (err) {
            console.error('Failed to load letter:', err);
        }
    };

    if (loading) {
        return <div className="loading-container">Loading your letters...</div>;
    }

    if (selectedLetter) {
        return (
            <div className="letter-generator-container">
                <div className="letter-preview">
                    <button onClick={() => setSelectedLetter(null)} className="back-link">
                        ← Back to My Letters
                    </button>
                    <h2>Letter from {new Date(selectedLetter.createdAt).toLocaleDateString()}</h2>
                    <div className="letter-content">
                        <pre>{selectedLetter.generatedContent}</pre>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="letter-generator-container">
            <div className="generator-header">
                <h1>My Letters</h1>
                <p>View and manage your generated letters</p>
            </div>

            {letters.length === 0 ? (
                <div className="empty-state">
                    <p>You haven't generated any letters yet.</p>
                    <button onClick={() => navigate('/letters/generate')} className="btn-primary">
                        Generate Your First Letter
                    </button>
                </div>
            ) : (
                <div className="letters-list">
                    {letters.map((letter) => (
                        <div key={letter.letterId} className="letter-card" onClick={() => viewLetter(letter.letterId)}>
                            <h3>{letter.letterType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                            <p className="letter-date">
                                Created: {new Date(letter.createdAt).toLocaleDateString()}
                            </p>
                            <span className="view-link">View Letter →</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
