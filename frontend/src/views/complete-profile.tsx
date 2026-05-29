import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { User, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/complete-profile.css';

function CompleteProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const googleId = searchParams.get('google_id') || '';
  const name = searchParams.get('name') || '';

  const [username, setUsername] = useState(name);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    if (!email || !googleId) {
      setError('Missing Google account data. Please try signing in with Google again.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/complete-google-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email, google_id: googleId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess('Registration submitted! Pending admin approval.');
      setTimeout(() => navigate('/login?registered=true'), 2000);
    } catch (err) {
      console.error('Complete profile error:', (err as Error).message);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="complete-profile-body">
        <Link to="/" className="back-to-home"><ArrowLeft size={16} strokeWidth={1.5} />Back to Home</Link>
        <div className="complete-profile-window">
          <h1>Complete Your Profile</h1>
          <p className="complete-profile-subtitle">Set your username to finish registration</p>

          {error && (
            <div className="complete-profile-error">
              <AlertCircle size={16} strokeWidth={1.5} />
              {error}
            </div>
          )}
          {success && (
            <div className="complete-profile-success">
              <CheckCircle size={16} strokeWidth={1.5} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail size={16} strokeWidth={1.5} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  readOnly
                  className="input-readonly"
                />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User size={16} strokeWidth={1.5} className="input-icon" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>
            <button className="complete-profile-btn" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Complete Registration'}
            </button>
          </form>

          <p className="complete-profile-note">
            <svg className="google-icon-small" viewBox="0 0 24 24" width="14" height="14">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Signed in with Google — email verified automatically
          </p>
        </div>
      </div>
    </>
  );
}

export default CompleteProfile;
