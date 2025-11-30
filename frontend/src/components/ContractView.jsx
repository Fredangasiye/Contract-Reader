import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

function ContractView({ data, onReset }) {
    const { summary, flags, full_text, fullText } = data;
    const text = full_text || fullText || "";
    const navigate = useNavigate();
    const { user, isPremium } = useAuth();
    const [expandedFlags, setExpandedFlags] = useState({});

    const hasHighSeverityFlags = flags && flags.some(flag => flag.severity >= 70);

    const getSeverityIcon = (severity) => {
        if (severity >= 80) return '🚨';
        if (severity >= 50) return '⚠️';
        return 'ℹ️';
    };

    const toggleFlag = (flagId) => {
        setExpandedFlags(prev => ({
            ...prev,
            [flagId]: !prev[flagId]
        }));
    };

    // Group flags by severity
    const groupedFlags = flags ? {
        high: flags.filter(f => f.severity >= 80),
        medium: flags.filter(f => f.severity >= 50 && f.severity < 80),
        low: flags.filter(f => f.severity < 50)
    } : { high: [], medium: [], low: [] };

    // Bold important keywords in summary
    const formatSummary = (text) => {
        if (!text) return text;

        const keywords = [
            'risk', 'risks', 'liability', 'terminate', 'termination', 'penalty', 'penalties',
            'fee', 'fees', 'payment', 'payments', 'obligation', 'obligations', 'breach',
            'damages', 'indemnify', 'indemnification', 'warranty', 'warranties', 'dispute',
            'arbitration', 'jurisdiction', 'confidential', 'confidentiality', 'non-compete',
            'exclusive', 'exclusivity', 'renewal', 'auto-renew', 'cancellation', 'refund'
        ];

        let formatted = text;
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
            formatted = formatted.replace(regex, '<strong>$1</strong>');
        });

        return formatted;
    };

    const renderFlagGroup = (title, flagList, severity) => {
        if (flagList.length === 0) return null;

        return (
            <div className={`flag-group flag-group-${severity}`}>
                <h4 className="flag-group-title">
                    {getSeverityIcon(flagList[0]?.severity || 0)} {title} ({flagList.length})
                </h4>
                <ul className="flags-list">
                    {flagList.map((flag) => (
                        <li key={flag.id} className={`flag-item severity-${severity} ${expandedFlags[flag.id] ? 'expanded' : ''}`}>
                            <div className="flag-header" onClick={() => toggleFlag(flag.id)}>
                                <h5>
                                    <span>{flag.title}</span>
                                    <span className="severity-badge">{flag.severity}/100</span>
                                </h5>
                                <span className="expand-icon">{expandedFlags[flag.id] ? '−' : '+'}</span>
                            </div>
                            {expandedFlags[flag.id] && (
                                <div className="flag-details">
                                    <p><strong>Risk:</strong> {flag.plain_english}</p>
                                    <div className="evidence">
                                        <strong>Evidence:</strong> "{flag.evidence}"
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className="contract-view">
            <h2>📊 Contract Analysis Results</h2>

            {summary && (
                <div className="section summary-section">
                    <h3>📝 Summary</h3>
                    <p dangerouslySetInnerHTML={{ __html: formatSummary(summary) }}></p>
                </div>
            )}

            {flags && flags.length > 0 && (
                <>
                    <div className="section flags-section">
                        <h3>🚩 Red Flags Detected ({flags.length})</h3>
                        <p className="flags-hint">Click on any flag to view details</p>

                        {renderFlagGroup('Critical Issues', groupedFlags.high, 'high')}
                        {renderFlagGroup('Important Concerns', groupedFlags.medium, 'medium')}
                        {renderFlagGroup('Minor Issues', groupedFlags.low, 'low')}
                    </div>

                    {hasHighSeverityFlags && (
                        <div className="action-cards">
                            <div className="action-card premium-card">
                                <div className="card-icon">✉️</div>
                                <h3>Need Help?</h3>
                                <p>Generate a professional dispute letter to address these issues</p>
                                {user && isPremium() ? (
                                    <button onClick={() => navigate('/letters/generate')} className="action-btn">
                                        Generate Letter
                                    </button>
                                ) : (
                                    <button onClick={() => navigate('/pricing?plan=premium')} className="action-btn upgrade-btn">
                                        Upgrade to Generate Letters
                                    </button>
                                )}
                            </div>

                            <div className="action-card">
                                <div className="card-icon">📚</div>
                                <h3>Learn More</h3>
                                <p>Get expert advice on what to look for in contracts</p>
                                <button onClick={() => navigate('/advice')} className="action-btn">
                                    Browse Advice Library
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="section text-section">
                <h3>📄 Full Contract Text</h3>
                <div className="contract-text">
                    <pre>{text}</pre>
                </div>
            </div>

            <button onClick={onReset} className="reset-button">🔄 Analyze Another Contract</button>
        </div>
    );
}

export default ContractView;

