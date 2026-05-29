import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/reset-password.css';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      // Success — redirect to login with message
      navigate('/login?message=password_reset', { replace: true });
    } catch (err) {
      console.error('Reset password error:', (err as Error).message);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <div className="reset-password-body">
          <Link to="/login" className="back-to-home"><ArrowLeft size={16} strokeWidth={1.5} />Back to Login</Link>
          <div className="reset-password-window">
            <h1>Invalid Link</h1>
            <div className="reset-password-error" style={{ marginTop: '8px' }}>
              <AlertCircle size={16} strokeWidth={1.5} />
              This reset link is invalid. Please request a new one.
            </div>
            <p className="reset-password-link">
              <Link to="/forgot-password">Request a new reset link</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="reset-password-body">
        <Link to="/login" className="back-to-home"><ArrowLeft size={16} strokeWidth={1.5} />Back to Login</Link>
        <div className="reset-password-window">
          <h1>Reset Password</h1>
          <p className="reset-password-subtitle">
            Enter your new password below.
          </p>

          {error && (
            <div className="reset-password-error">
              <AlertCircle size={16} strokeWidth={1.5} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-wrapper">
                <Lock size={20} strokeWidth={1.5} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  placeholder="Enter your new password"
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  value={confirmPassword}
                  placeholder="Confirm your new password"
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
            <button className="reset-password-btn" type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="reset-password-link">
            Remember your password? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default ResetPassword;
