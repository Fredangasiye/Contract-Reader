import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLetterTemplates, generateLetter, getUserLetters, getLetter } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './LetterGenerator.css';

export function LetterGenerator() {
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [userInfo, setUserInfo] = useState({ name: '', email: '', phone: '' });
    const [customData, setCustomData] = useState({});
    const [generatedLetter, setGeneratedLetter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, isPremium } = useAuth();

    const TEMPLATES = [
        { id: 'gym_cancellation', name: 'Gym Cancellation', icon: '🏋️', subject: 'Membership Cancellation Request' },
        { id: 'insurance_claim_dispute', name: 'Insurance Dispute', icon: '🛡️', subject: 'Formal Dispute of Claim Denial' },
        { id: 'lease_violation', name: 'Lease Violation', icon: '🏠', subject: 'Notice of Lease Violation and Remedy Request' },
        { id: 'employment_negotiation', name: 'Employment Negotiation', icon: '💼', subject: 'Request to Modify Employment Terms' },
        { id: 'service_cancellation', name: 'Service Cancellation', icon: '🔌', subject: 'Service Cancellation Request' },
        { id: 'other_dispute', name: 'Other / Custom', icon: '📝', subject: 'Formal Dispute Letter' }
    ];

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!isPremium()) {
            navigate('/pricing');
            return;
        }
    }, [user]);

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
            gym_cancellation: [
                { name: 'gym_name', label: 'Gym Name', placeholder: 'e.g. FitLife Gym' },
                { name: 'member_id', label: 'Membership ID', placeholder: 'e.g. 12345678' },
                { name: 'sign_date', label: 'Date Signed', placeholder: 'e.g. January 1, 2023' },
                { name: 'reason', label: 'Reason for Cancellation', placeholder: 'e.g. Relocation, Medical reasons' }
            ],
            insurance_claim_dispute: [
                { name: 'insurance_company', label: 'Insurance Company', placeholder: 'e.g. SafeGuard Insurance' },
                { name: 'policy_number', label: 'Policy Number', placeholder: 'e.g. POL-987654321' },
                { name: 'claim_number', label: 'Claim Number', placeholder: 'e.g. CLM-12345' },
                { name: 'claim_date', label: 'Date of Claim', placeholder: 'e.g. March 15, 2024' },
                { name: 'situation', label: 'Reason for Denial / Dispute Details', placeholder: 'Explain why the claim was denied and why you disagree...' }
            ],
            lease_violation: [
                { name: 'landlord_name', label: 'Landlord / Property Manager', placeholder: 'e.g. John Smith' },
                { name: 'property_address', label: 'Property Address', placeholder: 'e.g. 123 Main St, Apt 4B' },
                { name: 'situation', label: 'Violation Details', placeholder: 'Describe the issue (e.g. lack of heat, mold, noise)...' },
                { name: 'remedy_period', label: 'Requested Remedy Period', placeholder: 'e.g. 7 days' }
            ],
            employment_negotiation: [
                { name: 'employer_name', label: 'Employer / Manager Name', placeholder: 'e.g. Jane Doe' },
                { name: 'company_name', label: 'Company Name', placeholder: 'e.g. Tech Corp' },
                { name: 'position', label: 'Your Position', placeholder: 'e.g. Senior Developer' },
                { name: 'concerns', label: 'Terms to Negotiate', placeholder: 'Describe the terms you want to change (e.g. salary, remote work)...' }
            ],
            service_cancellation: [
                { name: 'service_provider', label: 'Service Provider', placeholder: 'e.g. Internet Co.' },
                { name: 'account_number', label: 'Account Number', placeholder: 'e.g. ACC-55555' },
                { name: 'cancellation_date', label: 'Desired Cancellation Date', placeholder: 'e.g. Immediately' },
                { name: 'reason', label: 'Reason', placeholder: 'e.g. Service quality, moving...' }
            ],
            other_dispute: [
                { name: 'recipient_name', label: 'Recipient Name', placeholder: 'Who is this letter for?' },
                { name: 'recipient_company', label: 'Recipient Company', placeholder: 'Company Name (if applicable)' },
                { name: 'dispute_details', label: 'Dispute Details / Email Content', placeholder: 'Paste the email content or describe the situation in detail here...', type: 'textarea' }
            ]
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
                        {TEMPLATES.map((template) => (
                            <div
                                key={template.id}
                                className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedTemplate(template.id);
                                    setCustomData({}); // Reset custom data on change
                                }}
                            >
                                <div className="template-icon">{template.icon}</div>
                                <h4>{template.name}</h4>
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
                                    <div key={field.name} className="form-group" style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                                        <label>{field.label}</label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                value={customData[field.name] || ''}
                                                onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                                                placeholder={field.placeholder}
                                                required
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={customData[field.name] || ''}
                                                onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                                                placeholder={field.placeholder}
                                                required
                                            />
                                        )}
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
