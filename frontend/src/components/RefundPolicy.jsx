import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPages.css'; // Reusing auth page styles for consistency

const RefundPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="auth-container policy-page">
            <div className="auth-box policy-box">
                <button className="back-btn" onClick={() => navigate('/')}>← Back to Home</button>

                <h1>Refund & Cancellation Policy</h1>
                <p className="last-updated">Last Updated: January 16, 2026</p>

                <div className="policy-content">
                    <section>
                        <h2>1. Satisfaction Guarantee</h2>
                        <p>
                            At Contract Reader, we strive to provide high-quality AI-powered contract analysis.
                            If you are not satisfied with the quality of our analysis or if the service failed to identify critical issues
                            that were clearly present in your document, you may be eligible for a refund.
                        </p>
                    </section>

                    <section>
                        <h2>2. Refund Eligibility</h2>
                        <p>Refunds are generally considered under the following circumstances:</p>
                        <ul>
                            <li><strong>Technical Errors:</strong> If the application failed to process your document due to a system error.</li>
                            <li><strong>Non-Delivery:</strong> If you were charged but did not receive your analysis results.</li>
                            <li><strong>Quality Issues:</strong> If the analysis was factually incorrect or missed major red flags (subject to review).</li>
                        </ul>
                        <p>
                            Refund requests must be submitted within <strong>7 days</strong> of the transaction date.
                        </p>
                    </section>

                    <section>
                        <h2>3. Subscription Cancellation</h2>
                        <p>
                            You may cancel your Premium subscription at any time.
                            Cancellation will prevent future billing, and you will retain access to Premium features until the end of your current billing cycle.
                        </p>
                        <p>
                            To cancel, please go to your Account Settings or contact support.
                            We do not provide prorated refunds for unused time in the current billing cycle.
                        </p>
                    </section>

                    <section>
                        <h2>4. How to Request a Refund</h2>
                        <p>
                            To request a refund, please contact our support team at <strong>support@contractreader.app</strong> with:
                        </p>
                        <ul>
                            <li>Your account email address</li>
                            <li>Transaction ID or date</li>
                            <li>Reason for the refund request</li>
                        </ul>
                        <p>
                            We aim to process all refund requests within 5-7 business days.
                        </p>
                    </section>

                    <section>
                        <h2>5. Changes to This Policy</h2>
                        <p>
                            We reserve the right to modify this Refund Policy at any time.
                            Changes will be effective immediately upon posting to the website.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;
