import { useState, useEffect } from 'react';
import { Outlet, useLocation, useOutlet } from 'react-router-dom';
import '../css/auth-layout.css';

/**
 * AuthLayout — shared layout for landing, login, and register pages.
 * Renders a persistent cinematic background that pans from the upper-left
 * quadrant (landing) to the lower-right quadrant (login/register) on navigation.
 * Content fades out then fades in on route changes.
 */
function AuthLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname) || location.pathname.startsWith('/verify-email');

  const [renderedOutlet, setRenderedOutlet] = useState(outlet);
  const [renderedPath, setRenderedPath] = useState(location.pathname);
  const [stage, setStage] = useState<'fade-in' | 'fade-out'>('fade-in');

  useEffect(() => {
    if (location.pathname !== renderedPath) {
      setStage('fade-out');
    }
  }, [location.pathname, renderedPath]);

  const handleAnimationEnd = () => {
    if (stage === 'fade-out') {
      setRenderedOutlet(outlet);
      setRenderedPath(location.pathname);
      setStage('fade-in');
    }
  };

  return (
    <div className="auth-layout">
      <div className={`auth-bg${isAuthPage ? ' auth-bg--panned' : ''}`} />
      <div className="auth-bg__overlay" />
      <div
        className={`auth-content auth-content--${stage}`}
        onAnimationEnd={handleAnimationEnd}
      >
        {renderedOutlet}
      </div>
    </div>
  );
}

export default AuthLayout;
