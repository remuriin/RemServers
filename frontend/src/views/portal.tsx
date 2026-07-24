import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Cog, Server, Activity, User, Lock, ShieldAlert, LogOut,
  Wifi, WifiOff, Shield, Play, Square, RotateCw, Copy,
  AlertTriangle, CheckCircle, XCircle, UserPlus, X, Clock
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
  description: string;
  mc_version: string;
  forge_version: string;
  owner_username: string;
}

interface WhitelistStatus {
  request_id: number;
  mc_username: string;
  status: string;
}

interface WhitelistRequest {
  request_id: number;
  mc_username: string;
  requester_username: string;
  created_at: string;
}

interface ActivityLog {
  log_id: number;
  action: string;
  details: string;
  created_at: string;
  server_id: number | null;
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

  // Whitelist state
  const [whitelistStatus, setWhitelistStatus] = useState<Record<number, WhitelistStatus>>({});
  const [expandedRegister, setExpandedRegister] = useState<number | null>(null);
  const [registerInput, setRegisterInput] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // My Servers whitelist
  const [pendingCounts, setPendingCounts] = useState<Record<number, number>>({});
  const [expandedMyServer, setExpandedMyServer] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<WhitelistRequest[]>([]);
  const [pendingReqLoading, setPendingReqLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Activity state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

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
      const res = await fetch(`${API_URL}/servers`);
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
      const endpoint = role === 'admin' ? `${API_URL}/servers` : `${API_URL}/servers/mine`;
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
      const res = await fetch(`${API_URL}/servers/${serverId}/power`, {
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

  // Fetch whitelist status for logged-in user
  const fetchWhitelistStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/whitelist/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWhitelistStatus(data.status || {});
      }
    } catch { /* silent */ }
  }, []);

  // Submit whitelist registration
  const handleRegisterSubmit = async (serverId: number) => {
    if (!registerInput.trim()) return;
    setRegisterLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/whitelist/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ server_id: serverId, mc_username: registerInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to submit'); return; }
      showToast('Registration submitted!');
      setExpandedRegister(null);
      setRegisterInput('');
      fetchWhitelistStatus();
    } catch { showToast('Failed to submit request.'); }
    finally { setRegisterLoading(false); }
  };

  // Cancel whitelist request
  const handleCancelRequest = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/whitelist/${requestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Request cancelled.');
        fetchWhitelistStatus();
      }
    } catch { showToast('Failed to cancel.'); }
  };

  // Fetch pending counts for My Servers
  const fetchPendingCounts = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/whitelist/counts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCounts(data.counts || {});
      }
    } catch { /* silent */ }
  }, []);

  // Fetch pending requests for a specific server
  const fetchPendingRequests = async (serverId: number) => {
    setPendingReqLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/whitelist/server/${serverId}/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch { /* silent */ }
    finally { setPendingReqLoading(false); }
  };

  // Approve/deny whitelist request
  const handleWhitelistAction = async (requestId: number, action: 'approve' | 'deny', serverId: number) => {
    setActionLoading(`${requestId}-${action}`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/whitelist/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      showToast(data.message || `Request ${action}d.`);
      fetchPendingRequests(serverId);
      fetchPendingCounts();
    } catch { showToast(`Failed to ${action} request.`); }
    finally { setActionLoading(null); }
  };

  // Fetch activity logs
  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/activity`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || []);
      }
    } catch { /* silent */ }
    finally { setActivityLoading(false); }
  }, []);

  // Fetch servers when tab changes (only for active users)
  useEffect(() => {
    if (isPending || isLoading) return;
    if (activeTab === 'servers') {
      fetchServers();
      fetchWhitelistStatus();
    } else if (activeTab === 'myservers') {
      fetchMyServers();
      fetchPendingCounts();
    } else if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab, isPending, isLoading, fetchServers, fetchMyServers, fetchWhitelistStatus, fetchPendingCounts, fetchActivity]);

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

  // Render a server card for the Servers tab (with register button)
  const renderServerCard = (server: ServerData) => {
    const statusInfo = getStatusInfo(server.status);
    const versionParts: string[] = [];
    if (server.mc_version) versionParts.push(`MC ${server.mc_version}`);
    if (server.forge_version) versionParts.push(`Forge ${server.forge_version}`);
    const wlStatus = whitelistStatus[server.server_id];
    const isExpanded = expandedRegister === server.server_id;

    const renderRegisterButton = () => {
      if (wlStatus?.status === 'approved') return <span className="server-register-btn whitelisted"><CheckCircle size={13} /> Whitelisted</span>;
      if (wlStatus?.status === 'pending') return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="server-register-btn pending"><Clock size={13} /> Pending Approval</span>
          <button className="server-cancel-btn" onClick={() => handleCancelRequest(wlStatus.request_id)}><X size={11} /> Cancel</button>
        </div>
      );
      if (wlStatus?.status === 'denied') return (
        <button className="server-register-btn denied" onClick={() => { setExpandedRegister(isExpanded ? null : server.server_id); setRegisterInput(''); }}>
          <XCircle size={13} /> Denied — Re-register
        </button>
      );
      return (
        <button className="server-register-btn" onClick={() => { setExpandedRegister(isExpanded ? null : server.server_id); setRegisterInput(''); }}>
          <UserPlus size={13} /> Register
        </button>
      );
    };

    return (
      <div className="server-card" key={server.server_id}>
        <div className="server-card-header">
          <div className="server-card-title-row">
            <Server size={22} strokeWidth={1.5} className="server-card-icon" />
            <div className="server-info">
              <h4 className="server-name">{server.name}</h4>
              <span className="server-game">{server.game}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {renderRegisterButton()}
            <span className={`server-status-badge ${statusInfo.className}`}>
              <span className={`status-dot ${statusInfo.className}`} />
              {statusInfo.icon} {statusInfo.label}
            </span>
          </div>
        </div>
        {server.description && <p className="server-description">{server.description}</p>}
        <div className="server-meta-row">
          {server.owner_username && <span className="server-meta-item"><User size={13} strokeWidth={1.5} />{server.owner_username}</span>}
          {versionParts.length > 0 && <span className="server-meta-item">{versionParts.join(' · ')}</span>}
        </div>
        {server.tags && server.tags.length > 0 && (
          <div className="server-tags">{server.tags.map((tag, i) => <span className="server-tag-pill" key={i}>{tag}</span>)}</div>
        )}
        <div className="server-card-footer">
          <div className="server-address"><span className="server-ip-label">{server.ip}:{server.port}</span></div>
          <div className="server-actions">{renderJoinButton(server)}</div>
        </div>
        <div className={`server-register-section ${isExpanded ? 'open' : ''}`}>
          <div className="register-form">
            <div className="register-notice">
              <AlertTriangle size={15} />
              <span>Enter your <strong>exact Minecraft username</strong>. Mismatched names will prevent you from joining.</span>
            </div>
            <div className="register-input-row">
              <input className="register-input" type="text" placeholder="Your MC username" value={registerInput} onChange={(e) => setRegisterInput(e.target.value)} maxLength={16} onKeyDown={(e) => e.key === 'Enter' && handleRegisterSubmit(server.server_id)} />
              <button className="register-submit-btn" disabled={!registerInput.trim() || registerLoading} onClick={() => handleRegisterSubmit(server.server_id)}>
                {registerLoading ? <span className="power-spinner" /> : <UserPlus size={14} />} Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a server card for the My Servers tab
  const renderMyServerCard = (server: ServerData) => {
    const statusInfo = getStatusInfo(server.status);
    const count = pendingCounts[server.server_id] || 0;
    const isExpanded = expandedMyServer === server.server_id;
    const handleCardClick = () => {
      if (isExpanded) { setExpandedMyServer(null); } else { setExpandedMyServer(server.server_id); fetchPendingRequests(server.server_id); }
    };
    return (
      <div className="server-card clickable" key={server.server_id} onClick={handleCardClick}>
        <div className="server-card-header">
          <div className="server-card-title-row">
            <Server size={22} strokeWidth={1.5} className="server-card-icon" />
            <div className="server-info"><h4 className="server-name">{server.name}</h4><span className="server-game">{server.game}</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {count > 0 && <span className="whitelist-badge">{count}</span>}
            <span className={`server-status-badge ${statusInfo.className}`}><span className={`status-dot ${statusInfo.className}`} />{statusInfo.icon} {statusInfo.label}</span>
          </div>
        </div>
        {server.description && <p className="server-description">{server.description}</p>}
        <div className="server-power-controls" onClick={(e) => e.stopPropagation()}>
          <button className="power-btn power-start" disabled={server.status === 'running' || server.status === 'starting' || powerLoading === `${server.server_id}-start`} onClick={() => handlePowerAction(server.server_id, 'start')}>
            {powerLoading === `${server.server_id}-start` ? <span className="power-spinner" /> : <Play size={14} strokeWidth={2} />} Start
          </button>
          <button className="power-btn power-stop" disabled={server.status === 'offline' || server.status === 'unknown' || powerLoading === `${server.server_id}-stop`} onClick={() => handlePowerAction(server.server_id, 'stop')}>
            {powerLoading === `${server.server_id}-stop` ? <span className="power-spinner" /> : <Square size={14} strokeWidth={2} />} Stop
          </button>
          <button className="power-btn power-restart" disabled={server.status === 'offline' || server.status === 'unknown' || powerLoading === `${server.server_id}-restart`} onClick={() => handlePowerAction(server.server_id, 'restart')}>
            {powerLoading === `${server.server_id}-restart` ? <span className="power-spinner" /> : <RotateCw size={14} strokeWidth={2} />} Restart
          </button>
        </div>
        <div className={`whitelist-requests-section ${isExpanded ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="whitelist-requests-header">Pending Whitelist Requests</div>
          {pendingReqLoading ? (
            <div className="whitelist-no-requests">Loading...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="whitelist-no-requests">No pending requests</div>
          ) : pendingRequests.map((req) => (
            <div className="whitelist-request-item" key={req.request_id}>
              <div className="whitelist-request-info">
                <span className="whitelist-mc-name">{req.mc_username}</span>
                <span className="whitelist-requester">by {req.requester_username} · {new Date(req.created_at).toLocaleDateString()}</span>
              </div>
              <div className="whitelist-request-actions">
                <button className="whitelist-approve-btn" disabled={actionLoading === `${req.request_id}-approve`} onClick={() => handleWhitelistAction(req.request_id, 'approve', server.server_id)}><CheckCircle size={12} /> Approve</button>
                <button className="whitelist-deny-btn" disabled={actionLoading === `${req.request_id}-deny`} onClick={() => handleWhitelistAction(req.request_id, 'deny', server.server_id)}><XCircle size={12} /> Deny</button>
              </div>
            </div>
          ))}
        </div>
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
                {servers.map((server) => renderServerCard(server))}
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
                {myServers.map((server) => renderMyServerCard(server))}
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
            {activityLoading ? (
              <div className="server-loading"><div className="loading-spinner" /><p>Loading activity...</p></div>
            ) : activityLogs.length === 0 ? (
              <section className="portal-content-placeholder">
                <div className="placeholder-icon"><Activity size={48} strokeWidth={1.5} /></div>
                <h3>No Activity Yet</h3>
                <p>Your activity logs will appear here</p>
              </section>
            ) : (
              <div className="activity-list">
                {activityLogs.map((log) => {
                  const iconClass = log.action.includes('approved') || log.action.includes('approve') ? 'action-approved'
                    : log.action.includes('denied') || log.action.includes('deny') ? 'action-denied'
                    : log.action.includes('request') ? 'action-request'
                    : log.action.includes('cancel') ? 'action-cancelled'
                    : 'action-default';
                  const icon = iconClass === 'action-approved' ? <CheckCircle size={16} />
                    : iconClass === 'action-denied' ? <XCircle size={16} />
                    : iconClass === 'action-request' ? <UserPlus size={16} />
                    : <Activity size={16} />;
                  return (
                    <div className="activity-item" key={log.log_id}>
                      <div className={`activity-icon ${iconClass}`}>{icon}</div>
                      <div className="activity-content">
                        <span className="activity-details">{log.details}</span>
                        <span className="activity-timestamp">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
