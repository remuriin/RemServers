import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog, ClipboardList, BarChart3, Settings, User, Check, X, LogOut, AlertCircle, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import { API_URL } from '../config/api';
import '../css/global.css';
import '../css/admin.css';

interface RegistrationRequest {
  request_id: number;
  username: string;
  email: string;
  status: string;
  requested_at: string;
  email_verified: boolean;
  google_id?: string;
}

type AdminTab = 'requests' | 'dashboard' | 'settings';

function Admin() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') { navigate('/login'); return; }
    fetchRequests();
  }, [navigate]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/requests`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        navigate('/login');
        return;
      }
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests:', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/approve/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Request approved successfully');
        setMessageType('success');
        await fetchRequests();
      } else {
        setMessage(data.error || 'Failed to approve');
        setMessageType('error');
      }
    } catch {
      setMessage('Something went wrong');
      setMessageType('error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: number) => {
    setActionLoading(id);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/deny/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Request denied');
        setMessageType('success');
        await fetchRequests();
      } else {
        setMessage(data.error || 'Failed to deny');
        setMessageType('error');
      }
    } catch {
      setMessage('Something went wrong');
      setMessageType('error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('status');
    localStorage.removeItem('pendingUser');
    navigate('/');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'requests':
        return (
          <>
            <header className="admin-header">
              <div>
                <h1>Registration Requests</h1>
                <p className="admin-subtitle">Review and manage pending registration requests</p>
              </div>
              <div className="admin-stats">
                <div className="admin-stat-chip">
                  <span className="stat-chip-count">{requests.length}</span>
                  <span className="stat-chip-label">Pending</span>
                </div>
              </div>
            </header>
            {message && (
              <div className={`admin-message ${messageType === 'success' ? 'message-success' : 'message-error'}`}>
                <AlertCircle size={16} strokeWidth={1.5} />
                {message}
              </div>
            )}
            <section className="admin-table-section">
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr><th>ID</th><th>Username</th><th>Email</th><th>Verified</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="table-empty">Loading requests...</td></tr>
                    ) : requests.length === 0 ? (
                      <tr><td colSpan={7} className="table-empty">No pending registration requests</td></tr>
                    ) : (
                      requests.map((req) => (
                        <tr key={req.request_id}>
                          <td className="td-id">#{req.request_id}</td>
                          <td className="td-username">
                            <div className="user-cell">
                              <div className="user-cell-avatar"><User size={14} strokeWidth={1.5} /></div>
                              {req.username}
                            </div>
                          </td>
                          <td className="td-email">{req.email}</td>
                          <td>
                            {req.email_verified ? (
                              <span className="email-badge email-badge-verified">
                                <ShieldCheck size={13} strokeWidth={1.5} />
                                Verified
                              </span>
                            ) : (
                              <span className="email-badge email-badge-unverified">
                                <Mail size={13} strokeWidth={1.5} />
                                Unverified
                              </span>
                            )}
                          </td>
                          <td><span className="status-badge-pending">Pending</span></td>
                          <td className="td-date">{formatDate(req.requested_at)}</td>
                          <td className="td-actions">
                            <button className="action-btn approve-btn" onClick={() => handleApprove(req.request_id)} disabled={actionLoading === req.request_id}>
                              {actionLoading === req.request_id ? '...' : <><Check size={14} strokeWidth={2} /> Approve</>}
                            </button>
                            <button className="action-btn deny-btn" onClick={() => handleDeny(req.request_id)} disabled={actionLoading === req.request_id}>
                              {actionLoading === req.request_id ? '...' : <><X size={14} strokeWidth={2} /> Deny</>}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (hidden on desktop) */}
              <div className="admin-cards-wrapper">
                {loading ? (
                  <div className="admin-cards-empty">Loading requests...</div>
                ) : requests.length === 0 ? (
                  <div className="admin-cards-empty">No pending registration requests</div>
                ) : (
                  requests.map((req) => (
                    <div className="admin-request-card" key={req.request_id}>
                      <div className="request-card-header">
                        <div className="request-card-user">
                          <div className="user-cell-avatar"><User size={14} strokeWidth={1.5} /></div>
                          <div className="request-card-identity">
                            <span className="request-card-name">{req.username}</span>
                            <span className="request-card-id">#{req.request_id}</span>
                          </div>
                        </div>
                        <span className="status-badge-pending">Pending</span>
                      </div>
                      <div className="request-card-body">
                        <div className="request-card-row">
                          <span className="request-card-label">Email</span>
                          <span className="request-card-value">{req.email}</span>
                        </div>
                        <div className="request-card-row">
                          <span className="request-card-label">Verified</span>
                          <span className="request-card-value">
                            {req.email_verified ? (
                              <span className="email-badge email-badge-verified">
                                <ShieldCheck size={13} strokeWidth={1.5} />
                                Verified
                              </span>
                            ) : (
                              <span className="email-badge email-badge-unverified">
                                <Mail size={13} strokeWidth={1.5} />
                                Unverified
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="request-card-row">
                          <span className="request-card-label">Submitted</span>
                          <span className="request-card-value">{formatDate(req.requested_at)}</span>
                        </div>
                      </div>
                      <div className="request-card-actions">
                        <button className="action-btn approve-btn" onClick={() => handleApprove(req.request_id)} disabled={actionLoading === req.request_id}>
                          {actionLoading === req.request_id ? '...' : <><Check size={14} strokeWidth={2} /> Approve</>}
                        </button>
                        <button className="action-btn deny-btn" onClick={() => handleDeny(req.request_id)} disabled={actionLoading === req.request_id}>
                          {actionLoading === req.request_id ? '...' : <><X size={14} strokeWidth={2} /> Deny</>}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        );
      case 'dashboard':
        return (
          <>
            <header className="admin-header">
              <div><h1>Dashboard</h1><p className="admin-subtitle">Server overview and statistics</p></div>
            </header>
            <section className="admin-content-placeholder">
              <div className="placeholder-icon"><BarChart3 size={48} strokeWidth={1.5} /></div>
              <h3>Dashboard Overview</h3>
              <p>Server statistics and analytics will appear here.</p>
            </section>
          </>
        );
      case 'settings':
        return (
          <>
            <header className="admin-header">
              <div><h1>Settings</h1><p className="admin-subtitle">Manage server configuration</p></div>
            </header>
            <section className="admin-content-placeholder">
              <div className="placeholder-icon"><Settings size={48} strokeWidth={1.5} /></div>
              <h3>Server Settings</h3>
              <p>Configuration options will appear here.</p>
            </section>
          </>
        );
    }
  };

  return (
    <div className="admin-body">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo"><Cog size={24} strokeWidth={1.5} /></div>
          <h2 className="sidebar-title">Rem Servers</h2>
        </div>
        <nav className="sidebar-nav">
          <button className="sidebar-link back-to-portal-btn" onClick={() => navigate('/portal')}>
            <span className="sidebar-icon"><ArrowLeft size={20} strokeWidth={1.5} /></span>Back to Portal
          </button>
          <button className={`sidebar-link ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <span className="sidebar-icon"><ClipboardList size={20} strokeWidth={1.5} /></span>Admin Panel
          </button>
          <button className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="sidebar-icon"><BarChart3 size={20} strokeWidth={1.5} /></span>Dashboard
          </button>
          <button className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <span className="sidebar-icon"><Settings size={20} strokeWidth={1.5} /></span>Settings
          </button>
          <button className="sidebar-link mobile-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <span className="sidebar-icon"><LogOut size={20} strokeWidth={1.5} /></span>Log out
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-role-badge">ADMIN</span>
            <span className="admin-username">{localStorage.getItem('username') || 'Admin'}</span>
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}><LogOut size={16} strokeWidth={1.5} />Log out</button>
        </div>
      </aside>
      <main className="admin-main">{renderContent()}</main>

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

export default Admin;
