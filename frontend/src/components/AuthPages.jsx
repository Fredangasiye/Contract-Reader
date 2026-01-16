import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login as apiLogin, register as apiRegister } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './AuthPages.css';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDemo, setShowDemo] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('mode') === 'demo') {
            setShowDemo(true);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiLogin(email, password);
            login(response.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = (e) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address.');
            return;
        }
        setResetSent(true);
        setError('');
    };

    if (showForgotPassword) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h1>Reset Password</h1>
                    <p className="auth-subtitle">Enter your email to receive a reset link</p>

                    {error && <div className="error-message">{error}</div>}
                    {resetSent && (
                        <div className="success-message">
                            If an account exists for {email}, a password reset link has been sent.
                        </div>
                    )}

                    {!resetSent ? (
                        <form onSubmit={handleForgotPassword} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="reset-email">Email</label>
                                <input
                                    type="email"
                                    id="reset-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@example.com"
                                />
                            </div>
                            <button type="submit" className="btn-primary">
                                Send Reset Link
                            </button>
                        </form>
                    ) : null}

                    <p className="auth-footer">
                        <button
                            className="link-btn"
                            onClick={() => {
                                setShowForgotPassword(false);
                                setResetSent(false);
                                setError('');
                            }}
                        >
                            Back to Login
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Welcome Back</h1>
                <p className="auth-subtitle">Sign in to your Contract Reader account</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={8}
                        />
                        <div className="forgot-password-link">
                            <button
                                type="button"
                                className="link-btn"
                                onClick={() => {
                                    setShowForgotPassword(true);
                                    setError('');
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    {showDemo && (
                        <>
                            <div className="auth-divider">
                                <span>OR</span>
                            </div>

                            <button
                                type="button"
                                className="btn-demo"
                                onClick={async () => {
                                    setEmail('demo@example.com');
                                    setPassword('password123');
                                    setError('');
                                    setLoading(true);
                                    try {
                                        const response = await apiLogin('demo@example.com', 'password123');
                                        login(response.user);
                                        navigate('/');
                                    } catch (err) {
                                        setError('Demo login failed. Please try again.');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                            >
                                🚀 Try Demo (Premium Features)
                            </button>
                        </>
                    )}
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    );
}

export function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await apiRegister(email, password);
            login(response.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Create Account</h1>
                <p className="auth-subtitle">Start protecting yourself from contract traps</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={8}
                        />
                        <small>At least 8 characters</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
