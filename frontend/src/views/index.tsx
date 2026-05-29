import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Cog, LogIn, UserPlus, User } from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/index.css';

interface JwtPayload {
  role: string;
  exp: number;
}

interface PublicUser {
  username: string;
}

const Index = () => {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing valid token and redirect accordingly
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const now = Date.now() / 1000;

        if (decoded.exp && decoded.exp < now) {
          // Token is expired — clear it and stay on the landing page
          localStorage.removeItem('token');
        } else if (decoded.role === 'admin') {
          navigate('/admin', { replace: true });
          return;
        } else if (decoded.role === 'user') {
          navigate('/portal', { replace: true });
          return;
        }
      } catch {
        // Token is malformed — clear it and stay on the landing page
        localStorage.removeItem('token');
      }
    }
  }, [navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/users/public`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Failed to fetch users:', (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <>
      <div className="index-body">
        <div className="index-hero">
          <div className="hero-icon">
            <Cog size={80} strokeWidth={2} />
          </div>
          <h1 className="hero-title">Rem Servers</h1>
          <p className="hero-subtitle">
            servers para sa mga bai na bai {/* — register and get verified by an admin.*/}
          </p>

          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">
              <LogIn size={18} strokeWidth={1.5} />
              Log in
            </Link>
            <Link to="/register" className="btn btn-outline">
              <UserPlus size={18} strokeWidth={1.5} />
              Register
            </Link>
          </div>
        </div>

        <div className="index-users-section">
          <h2 className="users-section-title">Community Members</h2>

          {loading ? (
            <p className="users-loading">Loading members...</p>
          ) : users.length === 0 ? (
            <p className="users-empty">No members yet. Be the first to register!</p>
          ) : (
            <div className="users-grid">
              {users.map((user, index) => (
                <div className="user-card" key={index} style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="user-avatar">
                    <User size={18} strokeWidth={1.5} />
                  </div>
                  <span className="user-name">{user.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Index;
