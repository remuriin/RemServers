import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { User, Lock, CheckCircle, AlertCircle, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/login.css';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle URL params for various redirect scenarios
  useEffect(() => {
    // From regular registration
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please log in.');
    }

    // From email verification
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified! Your account is pending admin approval.');
    }

    // From Google OAuth — token in URL (returning user)
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      localStorage.setItem('token', tokenParam);
      // Decode token to get role for redirect
      try {
        const payload = JSON.parse(atob(tokenParam.split('.')[1]));
        localStorage.setItem('username', payload.username);
        localStorage.setItem('role', payload.role);
        localStorage.setItem('status', payload.status || 'active');
        navigate('/portal', { replace: true });
      } catch {
        setError('Invalid authentication token');
      }
      return;
    }

    // Error params from Google OAuth
    const errorParam = searchParams.get('error');
    if (errorParam === 'denied') {
      setError('Your registration has been denied. Please contact the admin.');
    } else if (errorParam === 'pending') {
      setPendingMessage('Your account is still pending admin approval.');
    } else if (errorParam === 'google_auth_failed') {
      setError('Google authentication failed. Please try again.');
    } else if (errorParam === 'invalid_token') {
      setError('Invalid verification link. Please register again.');
    } else if (errorParam === 'token_expired') {
      setError('Verification link has expired. Please register again.');
    } else if (errorParam === 'email_exists') {
      setError('An account with this email already exists. Please log in with your password.');
    } else if (errorParam === 'verification_failed') {
      setError('Email verification failed. Please try again.');
    }

    // From password reset
    const messageParam = searchParams.get('message');
    if (messageParam === 'password_reset') {
      setSuccessMessage('Password successfully reset. Please log in.');
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setPendingMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setPendingMessage(data.error || 'Your registration has been denied');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Login successful — save JWT token and user info
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user);
        localStorage.setItem('role', data.role);
        localStorage.setItem('status', data.status || 'active');

        // Clear any pending user data from registration
        localStorage.removeItem('pendingUser');

        // Redirect to portal for all roles
        navigate('/portal');
      }
    } catch (err) {
      console.error('Login error:', (err as Error).message);
      setError('Something went wrong. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <>
      <div className="login-body">
        <Link to="/" className="back-to-home"><ArrowLeft size={16} strokeWidth={1.5} />Back to Home</Link>
        <div className="login-window">
          <h1>Log in</h1>

          {successMessage && (
            <div className="login-success-message">
              <CheckCircle size={18} strokeWidth={1.5} className="success-icon" />
              {successMessage}
            </div>
          )}

          {pendingMessage && (
            <div className="login-pending-message">
              <AlertTriangle size={18} strokeWidth={1.5} className="pending-icon" />
              {pendingMessage}
            </div>
          )}

          {error && (
            <div className="login-error">
              <AlertCircle size={16} strokeWidth={1.5} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="usernameOrEmail">Username / Email</label>
              <div className="input-wrapper">
                <User size={20} strokeWidth={1.5} className="input-icon" />
                <input
                  type="text"
                  id="usernameOrEmail"
                  value={usernameOrEmail}
                  placeholder='Enter your username or email'
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
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
                  value={password}
                  placeholder='Enter your password'
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
            <Link to="/forgot-password" className="forgot-password-anchor">Forgot password?</Link>
            <button className="login-btn" type="submit">
              Log in
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button className="google-btn" onClick={handleGoogleLogin} type="button">
            <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="login-link">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default Login;
