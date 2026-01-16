import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLetterTemplates, generateLetter, getUserLetters, getLetter } from '../api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import UploadForm from './UploadForm';
import './LetterGenerator.css';

export function LetterGenerator() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isPremium } = useAuth();

    // Restore analysis data from navigation state if available
    const initialAnalysis = location.state?.analysisData || null;

    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [userInfo, setUserInfo] = useState({ name: '', email: '', phone: '' });
    const [customData, setCustomData] = useState({});
    const [generatedLetter, setGeneratedLetter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [contractAnalysis, setContractAnalysis] = useState(initialAnalysis);

    const TEMPLATES = [
        { id: 'gym_cancellation', name: 'Gym Cancellation', icon: '🏋️', subject: 'Membership Cancellation Request', description: 'Cancel gym memberships due to relocation, medical issues, or unfair terms.' },
        { id: 'insurance_claim_dispute', name: 'Insurance Dispute', icon: '🛡️', subject: 'Formal Dispute of Claim Denial', description: 'Challenge denied insurance claims and request a formal review.' },
        { id: 'lease_violation', name: 'Lease Violation', icon: '🏠', subject: 'Notice of Lease Violation', description: 'Notify landlords of maintenance issues or lease violations.' },
        { id: 'employment_negotiation', name: 'Employment Negotiation', icon: '💼', subject: 'Employment Terms Negotiation', description: 'Negotiate salary, benefits, or other employment terms.' },
        { id: 'service_cancellation', name: 'Service Cancellation', icon: '🔌', subject: 'Service Cancellation Request', description: 'Cancel internet, cable, or other recurring services.' },
        { id: 'other_dispute', name: 'Other / Custom', icon: '📝', subject: 'Formal Dispute Letter', description: 'Create a custom dispute letter for any other situation.' }
    ];

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!isPremium()) {
            navigate('/pricing?plan=premium');
            return;
        }
    }, [user]);

    const handleNext = (e) => {
        e?.preventDefault();
        setStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
            setStep(5); // Move to result step
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate letter');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLetter.content);
        // Could add a toast notification here
        const btn = document.getElementById('copy-btn');
        if (btn) {
            const originalText = btn.innerText;
            btn.innerText = '✅ Copied!';
            setTimeout(() => btn.innerText = originalText, 2000);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([generatedLetter.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate}_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getTemplateFields = (templateId) => {
        const fields = {
            gym_cancellation: [
                { name: 'gym_name', label: 'Gym Name', placeholder: 'e.g. FitLife Gym' },
                { name: 'member_id', label: 'Membership ID', placeholder: 'e.g. 12345678' },
                { name: 'sign_date', label: 'Date Signed', placeholder: 'e.g. January 1, 2023' },
                { name: 'reason', label: 'Reason for Cancellation', placeholder: 'e.g. Relocation, Medical reasons', type: 'textarea' }
            ],
            insurance_claim_dispute: [
                { name: 'insurance_company', label: 'Insurance Company', placeholder: 'e.g. SafeGuard Insurance' },
                { name: 'policy_number', label: 'Policy Number', placeholder: 'e.g. POL-987654321' },
                { name: 'claim_number', label: 'Claim Number', placeholder: 'e.g. CLM-12345' },
                { name: 'claim_date', label: 'Date of Claim', placeholder: 'e.g. March 15, 2024', type: 'date' },
                { name: 'situation', label: 'Reason for Denial / Dispute Details', placeholder: 'Explain why the claim was denied and why you disagree...', type: 'textarea' }
            ],
            lease_violation: [
                { name: 'landlord_name', label: 'Landlord / Property Manager', placeholder: 'e.g. John Smith' },
                { name: 'property_address', label: 'Property Address', placeholder: 'e.g. 123 Main St, Apt 4B' },
                { name: 'remedy_period', label: 'Requested Remedy Period', placeholder: 'e.g. 7 days' },
                { name: 'situation', label: 'Violation Details', placeholder: 'Describe the issue (e.g. lack of heat, mold, noise)...', type: 'textarea' }
            ],
            employment_negotiation: [
                { name: 'employer_name', label: 'Employer / Manager Name', placeholder: 'e.g. Jane Doe' },
                { name: 'company_name', label: 'Company Name', placeholder: 'e.g. Tech Corp' },
                { name: 'position', label: 'Your Position', placeholder: 'e.g. Senior Developer' },
                { name: 'concerns', label: 'Terms to Negotiate', placeholder: 'Describe the terms you want to change (e.g. salary, remote work)...', type: 'textarea' }
            ],
            service_cancellation: [
                { name: 'service_provider', label: 'Service Provider', placeholder: 'e.g. Internet Co.' },
                { name: 'account_number', label: 'Account Number', placeholder: 'e.g. ACC-55555' },
                { name: 'cancellation_date', label: 'Desired Cancellation Date', placeholder: 'e.g. Immediately' },
                { name: 'reason', label: 'Reason', placeholder: 'e.g. Service quality, moving...', type: 'textarea' }
            ],
            other_dispute: [
                { name: 'recipient_name', label: 'Recipient Name', placeholder: 'Who is this letter for?' },
                { name: 'recipient_company', label: 'Recipient Company', placeholder: 'Company Name (if applicable)' },
                { name: 'dispute_details', label: 'Dispute Details / Email Content', placeholder: 'Paste the email content or describe the situation in detail here...', type: 'textarea' }
            ]
        };
        return fields[templateId] || [];
    };

    const renderStepIndicator = () => (
        <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                <div className="step-number">{step > 1 ? '✓' : '1'}</div>
                <div className="step-label">Upload</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                <div className="step-number">{step > 2 ? '✓' : '2'}</div>
                <div className="step-label">Type</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                <div className="step-number">{step > 3 ? '✓' : '3'}</div>
                <div className="step-label">Details</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
                <div className="step-number">{step > 4 ? '✓' : '4'}</div>
                <div className="step-label">Info</div>
            </div>
        </div>
    );

    if (generatedLetter && step === 5) {
        return (
            <div className="letter-generator-container">
                <div className="letter-preview-wrapper">
                    <div className="preview-header">
                        <h2>Your Generated Letter</h2>
                        <button onClick={() => { setGeneratedLetter(null); setStep(2); }} className="btn-secondary">
                            Generate Another
                        </button>
                    </div>

                    <div className="paper-preview">
                        <div className="letter-subject">
                            <strong>Subject:</strong> {generatedLetter.subject}
                        </div>
                        <div className="letter-body">
                            {generatedLetter.content}
                        </div>
                    </div>

                    <div className="letter-actions">
                        <button id="copy-btn" onClick={handleCopy} className="btn-primary">
                            📋 Copy to Clipboard
                        </button>
                        <button onClick={handleDownload} className="btn-outline">
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
                <p>Create professional dispute letters in minutes</p>
                {contractAnalysis && (
                    <button
                        onClick={() => navigate('/', { state: { analysisData: contractAnalysis } })}
                        className="back-to-analysis-link"
                    >
                        ← Back to Analysis
                    </button>
                )}
            </div>

            {renderStepIndicator()}

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleGenerate} className="generator-form">
                {/* Step 1: Upload Contract (Optional) */}
                {step === 1 && (
                    <div className="form-section fade-in">
                        <h3>Upload Contract (Optional)</h3>
                        <p className="step-description">
                            Upload your contract to automatically extract details, or skip this step to enter them manually.
                        </p>

                        <div className="upload-wrapper">
                            <UploadForm onAnalysisComplete={(result) => {
                                setContractAnalysis(result);

                                // Auto-fill fields from extracted data
                                if (result.extracted_fields) {
                                    const extracted = result.extracted_fields;
                                    const newCustomData = { contractText: result.fullText };

                                    // Merge extracted fields into customData
                                    Object.keys(extracted).forEach(key => {
                                        if (extracted[key] !== null && extracted[key] !== undefined) {
                                            newCustomData[key] = extracted[key];
                                        }
                                    });

                                    setCustomData(newCustomData);
                                }

                                // Auto-select suggested letter type
                                if (result.suggested_letter_type) {
                                    setSelectedTemplate(result.suggested_letter_type);
                                }

                                // Move to step 2 (template selection)
                                setStep(2);
                            }} />
                        </div>

                        <div className="wizard-actions right">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleNext}
                            >
                                Skip for now →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Template */}
                {step === 2 && (
                    <div className="form-section fade-in">
                        <h3>Select Letter Type</h3>
                        <div className="template-grid">
                            {TEMPLATES.map((template) => (
                                <div
                                    key={template.id}
                                    className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedTemplate(template.id);
                                        setCustomData({});
                                    }}
                                >
                                    <div className="template-icon">{template.icon}</div>
                                    <h4>{template.name}</h4>
                                    <p className="template-desc">{template.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="wizard-actions">
                            <button type="button" className="btn-secondary" onClick={handleBack}>
                                ← Back
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                disabled={!selectedTemplate}
                                onClick={handleNext}
                            >
                                Next Step →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Details */}
                {step === 3 && (
                    <div className="form-section fade-in">
                        <h3>Letter Details</h3>

                        {/* AI Context Upload */}
                        {!contractAnalysis && (
                            <div className="ai-context-box">
                                <div className="ai-header">
                                    <span className="ai-icon">✨</span>
                                    <h4>Enhance with AI</h4>
                                </div>
                                <p>Upload your contract here to let our AI write a stronger, more specific argument based on your actual terms.</p>
                                <div className="upload-mini-wrapper">
                                    <UploadForm onAnalysisComplete={(result) => {
                                        setContractAnalysis(result);
                                        // Add contract text to customData for backend AI generation
                                        setCustomData(prev => ({ ...prev, contractText: result.fullText }));
                                    }} />
                                </div>
                            </div>
                        )}

                        {contractAnalysis && (
                            <div className="ai-context-active">
                                <span className="ai-icon">✅</span>
                                <span>Contract loaded! AI will use it to generate your letter.</span>
                            </div>
                        )}

                        <div className="form-grid">
                            {getTemplateFields(selectedTemplate).map((field) => (
                                <div key={field.name} className="form-group" style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                                    <label>{field.label}</label>
                                    {field.type === 'textarea' ? (
                                        <div className="textarea-wrapper">
                                            <textarea
                                                value={customData[field.name] || ''}
                                                onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                                                placeholder={field.placeholder}
                                                required
                                            />
                                            <div className="char-count">
                                                {(customData[field.name] || '').length} characters
                                            </div>
                                        </div>
                                    ) : field.type === 'date' ? (
                                        <input
                                            type="date"
                                            value={customData[field.name] || ''}
                                            onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
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
                        <div className="wizard-actions">
                            <button type="button" className="btn-secondary" onClick={handleBack}>
                                ← Back
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleNext}
                            >
                                Next Step →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: User Info */}
                {step === 4 && (
                    <div className="form-section fade-in">
                        <h3>Your Information</h3>
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
                        <div className="wizard-actions">
                            <button type="button" className="btn-secondary" onClick={handleBack}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-generate" disabled={loading}>
                                {loading ? <LoadingSpinner size="small" color="white" /> : '✨ Generate Letter'}
                            </button>
                        </div>
                    </div>
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
