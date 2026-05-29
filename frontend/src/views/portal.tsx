import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cog, Server, Activity, User, Lock, ShieldAlert, LogOut, Wifi, WifiOff, Users } from 'lucide-react';
import '../css/global.css';
import '../css/portal.css';

type PortalTab = 'servers' | 'activity';

// TODO: Replace with actual Pterodactyl API call
// Endpoint will communicate with custom API that bridges to Pterodactyl Application API
// GET /api/pterodactyl/servers — returns list of available servers
const mockServers = [
  { id: 1, name: 'Survival SMP', game: 'Minecraft', status: 'online', players: '12/20' },
  { id: 2, name: 'Rust Main', game: 'Rust', status: 'online', players: '45/100' },
  { id: 3, name: 'ARK Island', game: 'ARK', status: 'offline', players: '0/50' },
];

function Portal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PortalTab>('servers');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState(localStorage.getItem('username') || 'User');
  const [userStatus, setUserStatus] = useState(localStorage.getItem('status') || 'pending');
  const isPending = userStatus === 'pending';

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle ?token=JWT from Google OAuth callback
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      localStorage.setItem('token', tokenParam);
      try {
        const payload = JSON.parse(atob(tokenParam.split('.')[1]));
        localStorage.setItem('username', payload.username);
        localStorage.setItem('role', payload.role);
        localStorage.setItem('status', payload.status || 'active');
        // Update React state so the UI reflects the correct status immediately
        setUsername(payload.username);
        setUserStatus(payload.status || 'active');
      } catch {
        // Token decode failed — will be caught by auth check below
      }
      // Remove token from URL
      window.history.replaceState({}, '', '/portal');
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'user') {
      navigate('/login');
      return;
    }
    // Sync state from localStorage for regular login flow
    setUsername(localStorage.getItem('username') || 'User');
    setUserStatus(localStorage.getItem('status') || 'active');
    setIsLoading(false);
  }, [navigate, searchParams]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('status');
    localStorage.removeItem('pendingUser');
    navigate('/');
  };

  const renderContent = () => {
    if (isPending) {
      return (
        <>
          <header className="portal-header">
            <div>
              <h1>{activeTab === 'servers' ? 'Servers' : 'Activity'}</h1>
              <p className="portal-subtitle">
                {activeTab === 'servers' ? 'Browse available game servers' : 'Recent activity and logs'}
              </p>
            </div>
          </header>
          <section className="portal-locked-section">
            <div className="locked-icon"><Lock size={48} strokeWidth={1.5} /></div>
            <h3>Account Under Verification</h3>
            <p>Your account is under verification. Please wait for admin approval.</p>
          </section>
        </>
      );
    }

    switch (activeTab) {
      case 'servers':
        return (
          <>
            <header className="portal-header">
              <div>
                <h1>Servers</h1>
                <p className="portal-subtitle">Browse available game servers</p>
              </div>
            </header>
            <div className="server-list">
              {mockServers.map((server) => (
                <div className="server-card" key={server.id}>
                  <div className="server-card-left">
                    <div className={`server-status-dot ${server.status === 'online' ? 'status-online' : 'status-offline'}`} />
                    <div className="server-info">
                      <h4 className="server-name">{server.name}</h4>
                      <span className="server-game">{server.game}</span>
                    </div>
                  </div>
                  <div className="server-card-right">
                    <div className="server-meta">
                      <span className="server-players">
                        <Users size={14} strokeWidth={1.5} />
                        {server.players}
                      </span>
                      <span className={`server-status-label ${server.status === 'online' ? 'label-online' : 'label-offline'}`}>
                        {server.status === 'online'
                          ? <><Wifi size={13} strokeWidth={1.5} /> Online</>
                          : <><WifiOff size={13} strokeWidth={1.5} /> Offline</>
                        }
                      </span>
                    </div>
                    <button className="server-join-btn" disabled={server.status === 'offline'}>
                      {server.status === 'online' ? 'Join' : 'Offline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case 'activity':
        return (
          <>
            <header className="portal-header">
              <div>
                <h1>Activity</h1>
                <p className="portal-subtitle">Recent activity and logs</p>
              </div>
            </header>
            <section className="portal-content-placeholder">
              <div className="placeholder-icon"><Activity size={48} strokeWidth={1.5} /></div>
              <h3>Activity Logs</h3>
              <p>Your activity logs will appear here</p>
            </section>
          </>
        );
    }
  };

  return (
    <div className="portal-body">
      <aside className="portal-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo"><Cog size={24} strokeWidth={1.5} /></div>
          <h2 className="sidebar-title">Rem Servers</h2>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'servers' ? 'active' : ''}`} onClick={() => setActiveTab('servers')}>
            <span className="sidebar-icon"><Server size={20} strokeWidth={1.5} /></span>Servers
          </button>
          <button className={`sidebar-link ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            <span className="sidebar-icon"><Activity size={20} strokeWidth={1.5} /></span>Activity
          </button>
          <button className="sidebar-link mobile-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <span className="sidebar-icon"><LogOut size={20} strokeWidth={1.5} /></span>Log out
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="portal-user-info">
            <div className="portal-user-avatar"><User size={16} strokeWidth={1.5} /></div>
            <span className="portal-username">{username}</span>
            {isPending && (<span className="portal-unverified-label"><ShieldAlert size={12} strokeWidth={1.5} />Unverified</span>)}
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}><LogOut size={16} strokeWidth={1.5} />Log out</button>
        </div>
      </aside>
      <main className="portal-main">{renderContent()}</main>

      {showLogoutConfirm && (
        <div className="logout-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Log out</h3>
            <p>Are you sure you want to log out?</p>
            <div className="logout-dialog-actions">
              <button className="logout-dialog-cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="logout-dialog-confirm" onClick={handleLogout}>
                <LogOut size={16} strokeWidth={1.5} />Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Portal;
