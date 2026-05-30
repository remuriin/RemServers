import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/verify-email.css';

function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link — no token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email/${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may be invalid or expired.');
        }
      } catch (err) {
        console.error('Verification error:', (err as Error).message);
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="verify-email-body">
      <div className="verify-email-window">
        {status === 'loading' && (
          <>
            <div className="verify-icon verify-icon--loading">
              <Loader size={48} strokeWidth={1.5} />
            </div>
            <h1>Verifying your email…</h1>
            <p className="verify-subtitle">Please wait while we confirm your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verify-icon verify-icon--success">
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h1>Email Verified!</h1>
            <p className="verify-subtitle">{message}</p>
            <p className="verify-subtitle">Your account is now pending admin approval.</p>
            <Link to="/login" className="verify-login-btn">Go to Login</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verify-icon verify-icon--error">
              <AlertCircle size={48} strokeWidth={1.5} />
            </div>
            <h1>Verification Failed</h1>
            <p className="verify-subtitle">{message}</p>
            <Link to="/login" className="verify-login-btn verify-login-btn--secondary">Go to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
