import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './PaymentSuccess.css';

export function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        // Refresh user data to get updated subscription status
        refreshUser();

        // Countdown redirect
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="payment-success-container">
            <div className="success-card">
                <div className="success-icon">✅</div>
                <h1>Payment Successful!</h1>
                <p>Thank you for your purchase. Your account has been updated.</p>

                <div className="success-details">
                    <p>You can now enjoy all premium features including:</p>
                    <ul>
                        <li>Unlimited contract scans</li>
                        <li>AI-powered letter generation</li>
                        <li>Full contract advice library</li>
                        <li>Priority support</li>
                    </ul>
                </div>

                <p className="redirect-message">
                    Redirecting to homepage in {countdown} seconds...
                </p>

                <button onClick={() => navigate('/')} className="btn-primary">
                    Go to Homepage Now
                </button>
            </div>
        </div>
    );
}
