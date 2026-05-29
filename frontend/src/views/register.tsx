import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/register.css';

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification waiting screen state
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  // Cooldown state — starts at 60 immediately when waiting screen appears
  const [cooldown, setCooldown] = useState(60);

  // Polling timeout state
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  // Ref to track polling interval so we can clean it up
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cooldown timer ──
  useEffect(() => {
    if (!waitingForVerification) return;
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown, waitingForVerification]);

  // ── Polling for verification status ──
  useEffect(() => {
    if (!waitingForVerification || !registeredEmail) return;

    // Poll every 4 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/auth/check-verification?email=${encodeURIComponent(registeredEmail)}`);
        const data = await res.json();

        if (data.verified) {
          // Clear polling and redirect
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          navigate('/login?verified=true', { replace: true });
        }
      } catch (err) {
        console.error('Polling error:', (err as Error).message);
        // Don't stop polling on network errors — just retry
      }
    }, 4000);

    // Timeout after 10 minutes — stop polling and show expiry message
    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      setPollingTimedOut(true);
    }, 10 * 60 * 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [waitingForVerification, registeredEmail, navigate]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Show verification waiting screen — cooldown starts immediately
      setRegisteredEmail(email);
      setCooldown(60);
      setWaitingForVerification(true);
    } catch (err) {
      console.error('Register error:', (err as Error).message);
      setError('Something went wrong. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');
    setResendError('');

    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setResendError(data.error || 'Please wait before requesting another verification email.');
        setResendLoading(false);
        return;
      }

      if (!res.ok) {
        setResendError(data.error || 'Failed to resend');
        setResendLoading(false);
        return;
      }

      setResendMessage(data.message || 'Verification email sent!');
      setCooldown(60); // Reset cooldown after successful resend
      setResendLoading(false);
    } catch (err) {
      console.error('Resend error:', (err as Error).message);
      setResendError('Something went wrong. Please try again.');
      setResendLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  // ── Verification Waiting Screen ──
  if (waitingForVerification) {
    return (
      <>
        <div className="register-body">
          <Link to="/" className="back-to-home"><ArrowLeft size={16} strokeWidth={1.5} />Back to Home</Link>
          <div className="register-window verification-waiting">
            <div className="verification-icon">
              <Mail size={48} strokeWidth={1.5} />
            </div>
            <h1>Check Your Email</h1>
            <p className="verification-subtitle">
              We've sent a verification link to<br />
              <strong>{registeredEmail}</strong>
            </p>
            <p className="verification-instructions">
              Click the link in your email to verify your account.
              Once verified, this page will automatically redirect you to the login page.
            </p>

            {pollingTimedOut && (
              <div className="register-error">
                <AlertCircle size={16} strokeWidth={1.5} />
                Verification link expired. Please request a new one.
              </div>
            )}

            {resendMessage && (
              <div className="register-success">
                <CheckCircle size={16} strokeWidth={1.5} />
                {resendMessage}
              </div>
            )}
            {resendError && (
              <div className="register-error">
                <AlertCircle size={16} strokeWidth={1.5} />
                {resendError}
              </div>
            )}

            <button
              className="resend-btn"
              onClick={handleResendVerification}
              disabled={resendLoading || cooldown > 0}
              type="button"
            >
              <RefreshCw size={16} strokeWidth={1.5} className={resendLoading ? 'spin' : ''} />
              {resendLoading
                ? 'Sending...'
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend verification email'}
            </button>

            <p className="register-link">
              Already verified? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Registration Form ──
  return (
    <>
      <div className="register-body">
        <Link to="/" className="back-to-home"><ArrowLeft size={16} strokeWidth={1.5} />Back to Home</Link>
        <div className="register-window">
          <h1>Register</h1>

          {error && (
            <div className="register-error">
              <AlertCircle size={16} strokeWidth={1.5} />
              {error}
            </div>
          )}
          {success && (
            <div className="register-success">
              <CheckCircle size={16} strokeWidth={1.5} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User size={20} strokeWidth={1.5} className="input-icon" />
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail size={20} strokeWidth={1.5} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={20} strokeWidth={1.5} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <Eye size={18} strokeWidth={1.5} /> : <EyeOff size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={20} strokeWidth={1.5} className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <Eye size={18} strokeWidth={1.5} /> : <EyeOff size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <button className="register-btn" type="submit">
              Register
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button className="google-btn" onClick={handleGoogleRegister} type="button">
            <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="register-link">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default Register;