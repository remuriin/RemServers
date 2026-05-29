import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../css/global.css';
import '../css/dashboard.css';
import { API_URL } from '../config/api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalServers: 0,
    onlinePlayers: 0,
    uptime: '0h 0m',
  });
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const statsRes = await fetch(`${API_URL}/dashboard/stats`);
        const statsData = await statsRes.json();
        setStats(statsData);

        const playersRes = await fetch(`${API_URL}/dashboard/players`);
        const playersData = await playersRes.json();
        setPlayers(playersData.players || []);
      } catch (err) {
        console.error('Dashboard fetch error:', (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const username = localStorage.getItem('username') || 'User';

  return (
    <>
      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">⛏</div>
            <h2 className="sidebar-title">Rem Servers</h2>
          </div>

          <nav className="sidebar-nav">
            <a href="/dashboard" className="sidebar-link active">
              <span className="sidebar-icon">📊</span>
              Dashboard
            </a>
            <a href="#" className="sidebar-link">
              <span className="sidebar-icon">👥</span>
              Players
            </a>
            <a href="#" className="sidebar-link">
              <span className="sidebar-icon">🖥️</span>
              Servers
            </a>
            <a href="#" className="sidebar-link">
              <span className="sidebar-icon">⚙️</span>
              Settings
            </a>
          </nav>

          <div className="sidebar-footer">
            <p className="sidebar-user">{username}</p>
            <button className="logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <header className="dashboard-header">
            <div>
              <h1>Dashboard</h1>
              <p className="dashboard-subtitle">Welcome back, {username}</p>
            </div>
          </header>

          {/* Stats Cards */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-users">👥</div>
              <div className="stat-info">
                <span className="stat-label">Total Users</span>
                <span className="stat-value">{stats.totalUsers}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-servers">🖥️</div>
              <div className="stat-info">
                <span className="stat-label">Total Servers</span>
                <span className="stat-value">{stats.totalServers}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-online">🟢</div>
              <div className="stat-info">
                <span className="stat-label">Online Players</span>
                <span className="stat-value">{stats.onlinePlayers}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-uptime">⏱️</div>
              <div className="stat-info">
                <span className="stat-label">Uptime</span>
                <span className="stat-value">{stats.uptime}</span>
              </div>
            </div>
          </section>

          {/* Recent Players Table */}
          <section className="dashboard-table-section">
            <h2 className="table-title">Recent Players</h2>

            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="table-empty">
                        Loading...
                      </td>
                    </tr>
                  ) : players.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-empty">
                        No players found
                      </td>
                    </tr>
                  ) : (
                    players.map((player, index) => (
                      <tr key={index}>
                        <td>{player.username}</td>
                        <td>{player.email}</td>
                        <td>
                          <span
                            className={`status-badge ${player.status === 'online' ? 'status-online' : 'status-offline'}`}
                          >
                            {player.status || 'offline'}
                          </span>
                        </td>
                        <td>{player.created_at || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Responsive Cards (mobile only) */}
            <div className="cards-wrapper">
              {loading ? (
                <div className="cards-empty">Loading...</div>
              ) : players.length === 0 ? (
                <div className="cards-empty">No players found</div>
              ) : (
                players.map((player, index) => (
                  <div className="player-card" key={index}>
                    <div className="player-card-header">
                      <span className="player-card-name">{player.username}</span>
                      <span
                        className={`status-badge ${player.status === 'online' ? 'status-online' : 'status-offline'}`}
                      >
                        {player.status || 'offline'}
                      </span>
                    </div>
                    <div className="player-card-body">
                      <div className="player-card-row">
                        <span className="player-card-label">Email</span>
                        <span className="player-card-value">{player.email}</span>
                      </div>
                      <div className="player-card-row">
                        <span className="player-card-label">Joined</span>
                        <span className="player-card-value">{player.created_at || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default Dashboard;
