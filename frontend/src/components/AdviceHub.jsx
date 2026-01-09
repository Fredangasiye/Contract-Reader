import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getContractTypes, getAdviceForType, searchAdvice } from '../api';
import './AdviceHub.css';

const contractIcons = {
    'gym': '🏋️',
    'insurance-medical': '🏥',
    'insurance-car': '🚗',
    'rental': '🏠',
    'employment': '💼',
    'mortgage': '🏡',
    'phone': '📱'
};

export function AdviceHub() {
    const [contractTypes, setContractTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    useEffect(() => {
        loadContractTypes();
    }, []);

    const loadContractTypes = async () => {
        try {
            const data = await getContractTypes();
            setContractTypes(data.contractTypes);
        } catch (error) {
            console.error('Failed to load contract types:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        try {
            const results = await searchAdvice(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    if (loading) {
        return <div className="advice-container"><p>Loading advice...</p></div>;
    }

    return (
        <div className="advice-container">
            <div className="advice-header">
                <h1>Contract Advice Library</h1>
                <p>Learn what to look for before you sign</p>

                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="text"
                        placeholder="Search advice..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="search-btn">Search</button>
                </form>
            </div>

            {searchResults ? (
                <div className="search-results">
                    <div className="results-header">
                        <h2>Search Results for "{searchResults.query}"</h2>
                        <button onClick={() => setSearchResults(null)} className="clear-search">
                            ✕ Clear Search
                        </button>
                    </div>
                    {searchResults.results.length === 0 ? (
                        <div className="no-results">
                            <p>No results found. Try a different search term.</p>
                        </div>
                    ) : (
                        <div className="results-list">
                            {searchResults.results.map((result) => (
                                <div key={result.adviceId} className="result-card">
                                    <div className="result-meta">
                                        <span className="result-icon">{contractIcons[result.contractType] || '📄'}</span>
                                        <span className="result-type">{result.contractType.replace(/-/g, ' ')}</span>
                                    </div>
                                    <h3>{result.title}</h3>
                                    <p className="result-preview">{result.content.substring(0, 160)}...</p>
                                    <Link to={`/advice/${result.contractType}`} className="view-link">
                                        View Full Advice <span>→</span>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="contract-types-grid">
                    {contractTypes.map((type) => (
                        <Link
                            key={type.id}
                            to={`/advice/${type.id}`}
                            className="contract-type-card"
                        >
                            <div className="card-icon">{contractIcons[type.id] || '📄'}</div>
                            <h3>{type.name}</h3>
                            <p>{type.sectionCount} advice sections</p>
                            <span className="view-arrow">View Advice →</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export function AdviceDetail({ contractType }) {
    const [advice, setAdvice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        loadAdvice();
    }, [contractType]);

    const loadAdvice = async () => {
        try {
            const data = await getAdviceForType(contractType);
            setAdvice(data);
        } catch (error) {
            console.error('Failed to load advice:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabIcons = {
        'Overview': '📋',
        'Red Flags': '🚩',
        'Key Terms': '🔑',
        'Your Rights': '⚖️',
        'Negotiation Tips': '🤝'
    };

    const formatContent = (content) => {
        if (!content) return null;

        return content.split('\n\n').map((block, idx) => {
            // Handle bullet points
            if (block.includes('\n- ') || block.startsWith('- ')) {
                const items = block.split('\n').map(item => item.replace(/^- /, '').trim()).filter(Boolean);
                return (
                    <ul key={idx}>
                        {items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                );
            }

            // Handle bold text
            const parts = block.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={idx}>
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    if (loading) {
        return <div className="advice-container"><p>Loading...</p></div>;
    }

    if (!advice || !advice.sections || advice.sections.length === 0) {
        return (
            <div className="advice-detail-container">
                <Link to="/advice" className="back-link">← Back to All Advice</Link>
                <p>Advice not found</p>
            </div>
        );
    }

    return (
        <div className="advice-detail-container">
            <Link to="/advice" className="back-link">← Back to All Advice</Link>

            <div className="advice-detail-header">
                <h1>{advice.contractTypeName}</h1>
            </div>

            <div className="advice-tabs">
                {advice.sections.map((section, index) => (
                    <button
                        key={section.adviceId}
                        className={`tab-btn ${activeTab === index ? 'active' : ''}`}
                        onClick={() => setActiveTab(index)}
                    >
                        <span className="tab-icon">{tabIcons[section.title] || '📄'}</span>
                        {section.title}
                    </button>
                ))}
            </div>

            <div className="tab-content">
                <h2>{advice.sections[activeTab].title}</h2>
                <div className="content-body">
                    {formatContent(advice.sections[activeTab].content)}
                </div>
            </div>
        </div>
    );
}
