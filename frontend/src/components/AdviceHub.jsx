import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getContractTypes, getAdviceForType, searchAdvice } from '../api';
import './AdviceHub.css';

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

    const contractIcons = {
        'gym': '🏋️',
        'insurance-medical': '🏥',
        'insurance-car': '🚗',
        'rental': '🏠',
        'employment': '💼',
        'mortgage': '🏡',
        'phone': '📱'
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
                            Clear Search
                        </button>
                    </div>
                    {searchResults.results.length === 0 ? (
                        <p>No results found. Try a different search term.</p>
                    ) : (
                        <div className="results-list">
                            {searchResults.results.map((result) => (
                                <div key={result.adviceId} className="result-card">
                                    <h3>{result.title}</h3>
                                    <p className="result-type">{result.contractType}</p>
                                    <p className="result-preview">{result.content.substring(0, 200)}...</p>
                                    <Link to={`/advice/${result.contractType}`} className="view-link">
                                        View Full Advice →
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

    if (loading) {
        return <div className="advice-container"><p>Loading...</p></div>;
    }

    if (!advice) {
        return <div className="advice-container"><p>Advice not found</p></div>;
    }

    return (
        <div className="advice-detail-container">
            <Link to="/advice" className="back-link">← Back to All Advice</Link>

            <div className="advice-detail-header">
                <h1>{advice.contractTypeName}</h1>
            </div>

            <div className="advice-sections">
                {advice.sections.map((section) => (
                    <div key={section.adviceId} className="advice-section">
                        <h2>{section.title}</h2>
                        <div className="advice-content">
                            {section.content.split('\n\n').map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
