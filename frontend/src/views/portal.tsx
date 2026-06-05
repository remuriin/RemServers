import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Cog, Server, Activity, User, Lock, ShieldAlert, LogOut,
  Wifi, WifiOff, Shield, Play, Square, RotateCw, Copy
} from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/portal.css';

type PortalTab = 'servers' | 'myservers' | 'activity';

interface ServerData {
  server_id: number;
  pterodactyl_id: string;
  name: string;
  game: string;
  join_type: string;
  tags: string[];
  ip: string;
  port: number;
  status: string;
  visible: boolean;
  identifier: string;
}

function Portal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PortalTab>('servers');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState(localStorage.getItem('username') || 'User');
  const [userStatus, setUserStatus] = useState(localStorage.getItem('status') || 'pending');
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'user');
  const isPending = userStatus === 'pending';

  // Server state
  const [servers, setServers] = useState<ServerData[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState('');

  // My Servers state
  const [myServers, setMyServers] = useState<ServerData[]>([]);
  const [myServersLoading, setMyServersLoading] = useState(false);
  const [myServersError, setMyServersError] = useState('');

  // Power action state
  const [powerLoading, setPowerLoading] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState('');

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
        setUserRole(payload.role);
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
    if (!token || !role) {
      navigate('/login');
      return;
    }
    // Sync state from localStorage for regular login flow
    setUsername(localStorage.getItem('username') || 'User');
    setUserStatus(localStorage.getItem('status') || 'active');
    setUserRole(localStorage.getItem('role') || 'user');
    setIsLoading(false);
  }, [navigate, searchParams]);

  // Show toast with auto-dismiss
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied! Open Minecraft and connect to the server.');
    }).catch(() => {
      showToast('Failed to copy — please copy manually.');
    });
  };

  // Fetch public servers
  const fetchServers = useCallback(async () => {
    setServersLoading(true);
    setServersError('');
    try {
      const res = await fetch(`${API_URL}/api/servers`);
      if (!res.ok) throw new Error('Failed to fetch servers');
      const data = await res.json();
      setServers(Array.isArray(data) ? data : data.servers || []);
    } catch (err) {
      setServersError((err as Error).message || 'Failed to load servers');
    } finally {
      setServersLoading(false);
    }
  }, []);

  // Fetch my servers (owner or admin)
  const fetchMyServers = useCallback(async () => {
    setMyServersLoading(true);
    setMyServersError('');
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      // Admin sees ALL servers, server_owner sees only their own
      const endpoint = role === 'admin' ? `${API_URL}/api/servers` : `${API_URL}/api/servers/mine`;
      const headers: HeadersInit = role === 'admin' ? {} : { 'Authorization': `Bearer ${token}` };
      if (role !== 'admin') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error('Failed to fetch your servers');
      const data = await res.json();
      setMyServers(Array.isArray(data) ? data : data.servers || []);
    } catch (err) {
      setMyServersError((err as Error).message || 'Failed to load your servers');
    } finally {
      setMyServersLoading(false);
    }
  }, []);

  // Power action
  const handlePowerAction = async (serverId: number, signal: 'start' | 'stop' | 'restart') => {
    const key = `${serverId}-${signal}`;
    setPowerLoading(key);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/servers/${serverId}/power`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ signal }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || `Failed to ${signal} server`);
      } else {
        showToast(`Server ${signal} signal sent successfully`);
        // Refresh after 2 seconds
        setTimeout(() => {
          fetchMyServers();
        }, 2000);
      }
    } catch {
      showToast(`Failed to ${signal} server`);
    } finally {
      setPowerLoading(null);
    }
  };

  // Fetch servers when tab changes (only for active users)
  useEffect(() => {
    if (isPending || isLoading) return;
    if (activeTab === 'servers') {
      fetchServers();
    } else if (activeTab === 'myservers') {
      fetchMyServers();
    }
  }, [activeTab, isPending, isLoading, fetchServers, fetchMyServers]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('status');
    localStorage.removeItem('pendingUser');
    navigate('/');
  };

  const canSeeMyServers = userRole === 'server_owner' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'running':
        return { label: 'Online', className: 'status-online', icon: <Wifi size={13} strokeWidth={1.5} /> };
      case 'starting':
        return { label: 'Starting', className: 'status-starting', icon: <Wifi size={13} strokeWidth={1.5} /> };
      default:
        return { label: 'Offline', className: 'status-offline', icon: <WifiOff size={13} strokeWidth={1.5} /> };
    }
  };

  // Render join button based on join_type
  const renderJoinButton = (server: ServerData) => {
    const isOnline = server.status === 'running';
    const address = `${server.ip}:${server.port}`;

    if (server.join_type === 'steam') {
      return (
        <a
          href={isOnline ? `steam://connect/${server.ip}:${server.port}` : undefined}
          className={`server-join-btn ${!isOnline ? 'disabled' : ''}`}
          onClick={(e) => !isOnline && e.preventDefault()}
          title={!isOnline ? 'Server is currently offline' : 'Open in Steam'}
        >
          Join
        </a>
      );
    }

    if (server.join_type === 'premium_mc') {
      return (
        <button
          className="server-join-btn"
          disabled={!isOnline}
          onClick={() => copyToClipboard(address)}
          title={!isOnline ? 'Server is currently offline' : 'Copy server address'}
        >
          <Copy size={14} strokeWidth={1.5} /> Join
        </button>
      );
    }

    // cracked_mc — show IP directly with copy button
    return (
      <div className="server-join-cracked">
        <span className="server-ip-display">{address}</span>
        <button
          className="server-copy-btn"
          disabled={!isOnline}
          onClick={() => copyToClipboard(address)}
          title={!isOnline ? 'Server is currently offline' : 'Copy server IP'}
        >
          <Copy size={14} strokeWidth={1.5} /> Copy IP
        </button>
      </div>
    );
  };

  // Render a server card (shared between Servers and My Servers)
  const renderServerCard = (server: ServerData, showPowerControls: boolean) => {
    const statusInfo = getStatusInfo(server.status);

    return (
      <div className="server-card" key={server.server_id}>
        <div className="server-card-header">
          <div className="server-card-title-row">
            <Server size={18} strokeWidth={1.5} className="server-card-icon" />
            <div className="server-info">
              <h4 className="server-name">{server.name}</h4>
              <span className="server-game">{server.game}</span>
            </div>
          </div>
          <span className={`server-status-badge ${statusInfo.className}`}>
            <span className={`status-dot ${statusInfo.className}`} />
            {statusInfo.icon} {statusInfo.label}
          </span>
        </div>

        {server.tags && server.tags.length > 0 && (
          <div className="server-tags">
            {server.tags.map((tag, i) => (
              <span className="server-tag-pill" key={i}>{tag}</span>
            ))}
          </div>
        )}

        <div className="server-card-footer">
          <div className="server-address">
            <span className="server-ip-label">{server.ip}:{server.port}</span>
          </div>
          <div className="server-actions">
            {renderJoinButton(server)}
          </div>
        </div>

        {showPowerControls && (
          <div className="server-power-controls">
            <button
              className="power-btn power-start"
              disabled={server.status === 'running' || server.status === 'starting' || powerLoading === `${server.server_id}-start`}
              onClick={() => handlePowerAction(server.server_id, 'start')}
            >
              {powerLoading === `${server.server_id}-start` ? (
                <span className="power-spinner" />
              ) : (
                <Play size={14} strokeWidth={2} />
              )}
              Start
            </button>
            <button
              className="power-btn power-stop"
              disabled={server.status === 'offline' || server.status === 'unknown' || powerLoading === `${server.server_id}-stop`}
              onClick={() => handlePowerAction(server.server_id, 'stop')}
            >
              {powerLoading === `${server.server_id}-stop` ? (
                <span className="power-spinner" />
              ) : (
                <Square size={14} strokeWidth={2} />
              )}
              Stop
            </button>
            <button
              className="power-btn power-restart"
              disabled={server.status === 'offline' || server.status === 'unknown' || powerLoading === `${server.server_id}-restart`}
              onClick={() => handlePowerAction(server.server_id, 'restart')}
            >
              {powerLoading === `${server.server_id}-restart` ? (
                <span className="power-spinner" />
              ) : (
                <RotateCw size={14} strokeWidth={2} />
              )}
              Restart
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isPending) {
      const tabLabels: Record<string, { title: string; subtitle: string }> = {
        servers: { title: 'Servers', subtitle: 'Browse available game servers' },
        myservers: { title: 'My Servers', subtitle: 'Manage your game servers' },
        activity: { title: 'Activity', subtitle: 'Recent activity and logs' },
      };
      const current = tabLabels[activeTab] || tabLabels.servers;
      return (
        <>
          <header className="portal-header">
            <div>
              <h1>{current.title}</h1>
              <p className="portal-subtitle">{current.subtitle}</p>
            </div>
          </header>
          <section className="portal-locked-section">
            <div className="locked-icon"><Lock size={48} strokeWidth={1.5} /></div>
            <h3>Account Under Verification</h3>
            <p>Your account is pending admin approval.</p>
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
            {serversLoading ? (
              <div className="server-loading">
                <div className="loading-spinner" />
                <p>Loading servers...</p>
              </div>
            ) : serversError ? (
              <div className="server-error">
                <WifiOff size={32} strokeWidth={1.5} />
                <p>{serversError}</p>
                <button className="retry-btn" onClick={fetchServers}>Retry</button>
              </div>
            ) : servers.length === 0 ? (
              <section className="portal-content-placeholder">
                <div className="placeholder-icon"><Server size={48} strokeWidth={1.5} /></div>
                <h3>No Servers Available</h3>
                <p>There are no servers to display right now.</p>
              </section>
            ) : (
              <div className="server-grid">
                {servers.map((server) => renderServerCard(server, false))}
              </div>
            )}
          </>
        );

      case 'myservers':
        return (
          <>
            <header className="portal-header">
              <div>
                <h1>My Servers</h1>
                <p className="portal-subtitle">
                  {isAdmin ? 'Manage all servers' : 'Manage your game servers'}
                </p>
              </div>
            </header>
            {myServersLoading ? (
              <div className="server-loading">
                <div className="loading-spinner" />
                <p>Loading your servers...</p>
              </div>
            ) : myServersError ? (
              <div className="server-error">
                <WifiOff size={32} strokeWidth={1.5} />
                <p>{myServersError}</p>
                <button className="retry-btn" onClick={fetchMyServers}>Retry</button>
              </div>
            ) : myServers.length === 0 ? (
              <section className="portal-content-placeholder">
                <div className="placeholder-icon"><Server size={48} strokeWidth={1.5} /></div>
                <h3>No Servers Found</h3>
                <p>You don't have any servers assigned to you yet.</p>
              </section>
            ) : (
              <div className="server-grid">
                {myServers.map((server) => renderServerCard(server, true))}
              </div>
            )}
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

  if (isLoading) return null;

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
          {canSeeMyServers && (
            <button className={`sidebar-link ${activeTab === 'myservers' ? 'active' : ''}`} onClick={() => setActiveTab('myservers')}>
              <span className="sidebar-icon"><Server size={20} strokeWidth={1.5} /></span>My Servers
            </button>
          )}
          <button className={`sidebar-link ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            <span className="sidebar-icon"><Activity size={20} strokeWidth={1.5} /></span>Activity
          </button>
          <button className="sidebar-link mobile-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <span className="sidebar-icon"><LogOut size={20} strokeWidth={1.5} /></span>Log out
          </button>
        </nav>
        <div className="sidebar-footer">
          {isAdmin && (
            <button className="admin-dashboard-btn" onClick={() => navigate('/admin')}>
              <Shield size={18} strokeWidth={1.5} />
              <span>Admin Dashboard</span>
            </button>
          )}
          <div className="portal-user-info">
            <div className="portal-user-avatar"><User size={16} strokeWidth={1.5} /></div>
            <span className="portal-username">{username}</span>
            {isPending && (<span className="portal-unverified-label"><ShieldAlert size={12} strokeWidth={1.5} />Unverified</span>)}
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}><LogOut size={16} strokeWidth={1.5} />Log out</button>
        </div>
      </aside>
      <main className="portal-main">{renderContent()}</main>

      {/* Toast notification */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}

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
