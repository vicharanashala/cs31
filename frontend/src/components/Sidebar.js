import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const { theme, toggleTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{"name":"User","email":"user@study.iitm.ac.in","role":"student","spurtiPoints":10}');
    } catch {
      return { name: 'User', email: 'user@study.iitm.ac.in', role: 'student', spurtiPoints: 10 };
    }
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      const config = { headers: { 'x-auth-token': token } };
      try {
        const userRes = await axios.get('/api/auth/me', config);
        if (userRes.data && userRes.data.user) {
          const updatedUser = userRes.data.user;
          setCurrentUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error('Error fetching user info in sidebar:', err);
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }

      try {
        const notifRes = await axios.get('/api/notifications', config);
        if (Array.isArray(notifRes.data)) {
          const unread = notifRes.data.filter(n => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Error fetching notifications in sidebar:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds

    const handleUpdate = () => {
      fetchData();
    };

    window.addEventListener('notifications_updated', handleUpdate);
    window.addEventListener('profile_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications_updated', handleUpdate);
      window.removeEventListener('profile_updated', handleUpdate);
    };
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    {
      name: 'FAQs Directory',
      path: '/faqs',
      icon: '📖'
    },
    {
      name: 'Mini Yaksha',
      path: '/ai-support',
      icon: '💬'
    },
    {
      name: 'Post Questions',
      path: '/questions',
      icon: '❓'
    },
    {
      name: 'Leaderboards',
      path: '/leaderboard',
      icon: '🏆'
    },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: '🔔',
      badge: unreadCount
    }
  ];

  if (isAdmin) {
    menuItems.push({
      name: 'FAQ requests',
      path: '/admin',
      icon: '🛠️'
    });
  }

  const initials = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  const getBadgeTier = (user) => {
    if (!user) return { name: 'Student', color: 'var(--text-muted)', bg: 'var(--bg-hover)', border: 'var(--border-card)' };
    if (user.role === 'admin') {
      return {
        name: '👑 Admin',
        color: 'var(--danger)',
        bg: 'var(--danger-soft)',
        border: 'var(--border-danger)'
      };
    }
    const pts = user.spurtiPoints !== undefined ? user.spurtiPoints : 10;
    if (pts >= 500) {
      return {
        name: '🛡️ Coordinator',
        color: 'var(--warning)',
        bg: 'var(--bg-active)',
        border: 'var(--warning)'
      };
    } else if (pts >= 300) {
      return {
        name: '⚡ Sub-Coordinator',
        color: 'var(--accent2)',
        bg: 'var(--bg-hover)',
        border: 'var(--accent2)'
      };
    } else if (pts >= 200) {
      return {
        name: '🌟 Volunteer',
        color: 'var(--accent)',
        bg: 'var(--bg-active)',
        border: 'var(--accent)'
      };
    } else {
      return {
        name: '📖 Student',
        color: 'var(--accent)',
        bg: 'var(--bg-active)',
        border: 'var(--border-card)'
      };
    }
  };

  const badge = getBadgeTier(currentUser);

  return (
    <div className="sidebar" style={{
      width: '320px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      boxSizing: 'border-box',
      height: '100vh',
      justifyContent: 'space-between'
    }}>
      {/* Top Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem', marginBottom: '1rem' }}>
        
        {/* Profile Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '1.25rem',
          position: 'relative'
        }}>
          {/* Avatar and Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.2rem',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.email}
              </p>
            </div>
          </div>

          {/* Spurti Points (SP) Box */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-active) 0%, rgba(6, 182, 212, 0.05) 100%)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Spurti Points
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-white)', display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginTop: '0.15rem' }}>
                  {currentUser.spurtiPoints !== undefined ? currentUser.spurtiPoints : 10}
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent2)', fontWeight: 700 }}>SP</span>
                </span>
              </div>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--bg-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 0 10px var(--bg-active)'
              }}>
                ✨
              </div>
            </div>
          </div>

          {/* Badges */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-card)', paddingTop: '1rem' }}>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Earned Badges & Distinctions
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              borderRadius: '6px',
              padding: '0.25rem 0.6rem',
              color: badge.color,
              fontSize: '0.68rem',
              fontWeight: 700
            }}>
              {badge.name}
            </div>
          </div>
        </div>

        {/* Workspace Navigator */}
        <div>
          <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            Workspace Navigator
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: '10px',
                    background: isActive ? 'var(--bg-active)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.background = 'var(--bg-hover)';
                      e.target.style.color = 'var(--text-white)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.background = 'transparent';
                      e.target.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span>{item.name}</span>
                    {item.badge > 0 && (
                      <span style={{
                        background: 'var(--danger)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '10px',
                        marginLeft: '0.5rem',
                        boxShadow: '0 0 8px rgba(248, 113, 113, 0.4)'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent)'
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={toggleTheme}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.65rem',
              background: 'transparent',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              color: 'var(--text-white)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={() => navigate('/edit-profile')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.65rem',
              background: 'transparent',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              color: 'var(--accent)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'var(--bg-active)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
          >
            ⚙️ Profile
          </button>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.65rem',
            background: 'transparent',
            border: '1px solid var(--border-danger)',
            borderRadius: '8px',
            color: 'var(--danger)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'var(--danger-soft)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >
          ➔ Log Out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
