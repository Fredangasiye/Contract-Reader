import { BrowserRouter as Router, Routes, Route, Link, useParams, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage, RegisterPage } from './components/AuthPages';
import { PricingPage } from './components/PricingPage';
import { AdviceHub, AdviceDetail } from './components/AdviceHub';
import { LetterGenerator, MyLetters } from './components/LetterGenerator';
import { PaymentSuccess } from './components/PaymentSuccess';
import UploadForm from './components/UploadForm';
import ContractView from './components/ContractView';
import { useState } from 'react';

function Footer() {
  return null;
}

function Navigation() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 0C0.895431 0 0 0.895431 0 2V34C0 35.1046 0.895431 36 2 36H26C27.1046 36 28 35.1046 28 34V8L20 0H2Z" fill="#374151" />
            <path d="M20 0V6C20 7.10457 20.8954 8 22 8H28L20 0Z" fill="#1f2937" />
            <text x="14" y="24" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill="white" textAnchor="middle">CR</text>
          </svg>
          Contract Reader
        </Link>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <Link to="/advice" onClick={() => setMobileMenuOpen(false)}>Advice</Link>
          <Link to="/refund-policy" onClick={() => setMobileMenuOpen(false)}>Refund Policy</Link>
          <Link to="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link to="/letters/generate" onClick={() => setMobileMenuOpen(false)}>Generate Letter</Link>
          {user ? (
            <>
              <span className="user-email">{user.email}</span>
              {user.subscriptionTier !== 'free' && (
                <span className="premium-badge">Premium</span>
              )}
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="nav-btn">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="nav-btn-primary" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function HomePage() {
  const location = useLocation();
  const [step, setStep] = useState(location.state?.analysisData ? 'view' : 'upload');
  const [analysisData, setAnalysisData] = useState(location.state?.analysisData || null);
  const [contractCount, setContractCount] = useState(2500);

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    setStep('view');
    // Increment counter when a contract is analyzed
    setContractCount(prev => prev + 1);
  };

  const handleReset = () => {
    setAnalysisData(null);
    setStep('upload');
  };

  return (
    <>
      {step === 'upload' && (
        <div className="hero-section">
          <div className="hero-content">
            <h1>Don't Get Trapped by Fine Print Again.</h1>
            <p>Upload your contract. AI exposes the hidden risks they don't want you to see.</p>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-number">{contractCount.toLocaleString()}+</span>
                <span className="hero-stat-label">Contracts Analyzed</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-number">98%</span>
                <span className="hero-stat-label">Accuracy Rate</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-number">R1,800</span>
                <span className="hero-stat-label">Average Amount Saved</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        {step === 'upload' && <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>Get Started</h2>}
        <div className="card">
          {step === 'upload' && (
            <UploadForm onAnalysisComplete={handleAnalysisComplete} />
          )}
          {step === 'view' && (
            <ContractView data={analysisData} onReset={handleReset} />
          )}
        </div>
      </div>
    </>
  );
}

function AdviceDetailWrapper() {
  const { contractType } = useParams();
  return <AdviceDetail contractType={contractType} />;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

import RefundPolicy from './components/RefundPolicy';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>Contract Reader</h3>
          <p>AI-powered contract analysis for everyone.</p>
        </div>
        <div className="footer-section">
          <h4>Legal</h4>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
        <div className="footer-section">
          <h4>Connect</h4>
          <a href="mailto:support@contractreader.app">Contact Support</a>
          <a href="https://twitter.com/contractreader" target="_blank" rel="noopener noreferrer">Twitter</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Contract Reader. All rights reserved.</p>
      </div>
    </footer>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navigation />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/advice" element={<AdviceHub />} />
              <Route path="/advice/:contractType" element={<AdviceDetailWrapper />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/letters/generate" element={
                <ProtectedRoute>
                  <LetterGenerator />
                </ProtectedRoute>
              } />
              <Route path="/letters" element={
                <ProtectedRoute>
                  <MyLetters />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

