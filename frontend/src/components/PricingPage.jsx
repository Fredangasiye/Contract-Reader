import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPricing, createCheckout } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './PricingPage.css';

export function PricingPage() {
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(null);
    const formRef = useRef(null);
    const premiumCardRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isPremium } = useAuth();

    useEffect(() => {
        loadPricing();
    }, []);

    useEffect(() => {
        // Check for plan query param
        const params = new URLSearchParams(location.search);
        const plan = params.get('plan');

        if (plan === 'premium' && premiumCardRef.current && !loading) {
            // Scroll to premium card
            premiumCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add highlight effect
            premiumCardRef.current.classList.add('highlight-plan');
            setTimeout(() => {
                premiumCardRef.current.classList.remove('highlight-plan');
            }, 2000);
        }
    }, [location.search, loading]);

    const loadPricing = async () => {
        try {
            const data = await getPricing();
            setPricing(data);
        } catch (error) {
            console.error('Failed to load pricing:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (type) => {
        if (!user) {
            navigate('/login');
            return;
        }

        setCheckoutLoading(type);
        try {
            const { url } = await createCheckout(type);

            // Redirect to Paystack checkout page
            window.location.href = url;
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to create checkout session. Please try again.');
            setCheckoutLoading(null);
        }
    };

    if (loading) {
        return <div className="pricing-container"><p>Loading pricing...</p></div>;
    }

    return (
        <div className="pricing-container">
            <div className="pricing-header">
                <h1>Choose Your Plan</h1>
                <p>Protect yourself from contract traps</p>
            </div>

            <div className="pricing-cards">
                {/* Free Plan */}
                <div className="pricing-card">
                    <div className="plan-header">
                        <h2>Free</h2>
                        <div className="price">
                            <span className="amount">R0</span>
                            <span className="period">/month</span>
                        </div>
                    </div>
                    <ul className="features">
                        <li>✓ 1 free contract scan</li>
                        <li>✓ Basic red flag analysis</li>
                        <li>✓ Contract advice library</li>
                        <li>✗ Letter generation</li>
                        <li>✗ Priority support</li>
                    </ul>
                    <button
                        className="btn-plan btn-secondary"
                        onClick={() => navigate('/register')}
                        disabled={!!user}
                    >
                        {user ? 'Current Plan' : 'Get Started'}
                    </button>
                </div>

                {/* Per-Scan Plan */}
                <div className="pricing-card">
                    <div className="card-header">
                        <h2>Pay Per Scan</h2>
                        <div className="price">$0.61<span>/scan</span></div>
                    </div>
                    <div className="card-features">
                        <ul>
                            <li><span className="check">✓</span> Instant AI Analysis</li>
                            <li><span className="check">✓</span> Red Flag Detection</li>
                            <li><span className="check">✓</span> Plain English Summary</li>
                            <li><span className="check">✓</span> Basic Export</li>
                        </ul>
                    </div>
                    <button
                        className="choose-btn"
                        onClick={() => handleCheckout('one-time')}
                        disabled={checkoutLoading === 'one-time'}
                    >
                        {checkoutLoading === 'one-time' ? 'Loading...' : 'Buy One Scan'}
                    </button>
                </div>

                {/* Premium Plan */}
                <div className="pricing-card featured" ref={premiumCardRef}>
                    <div className="badge">Most Popular</div>
                    <div className="promo-warning">⚠️ Promotional Price - Ending Soon!</div>
                    <div className="card-header">
                        <h2>Premium</h2>
                        <div className="price">$13.00<span>/month</span></div>
                        <div className="promo-text">Cancel Anytime</div>
                    </div>
                    <div className="card-features">
                        <ul>
                            <li><span className="check">✓</span> Unlimited Scans</li>
                            <li><span className="check">✓</span> Advanced AI Analysis</li>
                            <li><span className="check">✓</span> <strong>AI Dispute Letters</strong></li>
                            <li><span className="check">✓</span> Priority Support</li>
                            <li><span className="check">✓</span> Contract Storage</li>
                        </ul>
                    </div>
                    <button
                        className="choose-btn featured-btn"
                        onClick={() => handleCheckout('subscription')}
                        disabled={isPremium() || checkoutLoading === 'subscription'}
                    >
                        {isPremium() ? 'Current Plan' : checkoutLoading === 'subscription' ? 'Loading...' : 'Get Premium'}
                    </button>
                </div>
            </div>

            <div className="pricing-footer">
                <p>✓ Cancel anytime • ✓ Secure payment via PayFast • ✓ Money-back guarantee</p>
            </div>
        </div>
    );
}
