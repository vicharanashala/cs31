import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{"name":"User","email":"user@study.iitm.ac.in","role":"student"}');
  const isAdmin = user.role === 'admin';

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
      icon: '🏆'
    }
  ];

  if (isAdmin) {
    menuItems.push({
      name: 'Admin Dashboard',
      path: '/admin',
      icon: '🛠️'
    });
  }

  const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div style={{
      width: '320px',
      background: '#0d0c18',
      borderRight: '1px solid #1e1b38',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      boxSizing: 'border-box',
      height: '100vh',
      justifyContent: 'space-between'
    }}>
      {/* Top Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Profile Card */}
        <div style={{
          background: '#121024',
          border: '1px solid #1f1b3c',
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
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#7a7990', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Level and XP */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>
                🔥 Level 1
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bfa' }}>
                100 XP
              </span>
            </div>
            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '6px',
              background: '#1d1933',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '60%',
                height: '100%',
                background: 'linear-gradient(90deg, #a78bfa 0%, #06b6d4 100%)',
                borderRadius: '3px'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.68rem', color: '#7a7990' }}>
              <span>0 XP</span>
              <span>To Level 2 (100 XP needed)</span>
            </div>
          </div>

          {/* Badges */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #1d1933', paddingTop: '1rem' }}>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#7a7990', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Earned Badges & Distinctions
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(167, 139, 250, 0.1)',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              borderRadius: '6px',
              padding: '0.25rem 0.6rem',
              color: '#a78bfa',
              fontSize: '0.68rem',
              fontWeight: 700
            }}>
              🏅 FAQ STARTER
            </div>
          </div>
        </div>

        {/* Workspace Navigator */}
        <div>
          <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#525166', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
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
                    background: isActive ? 'rgba(124, 106, 245, 0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid #7c6af5' : '3px solid transparent',
                    color: isActive ? '#7c6af5' : '#8f8eaf',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.background = 'rgba(255,255,255,0.02)';
                      e.target.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#8f8eaf';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {isActive && (
                    <div style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#7c6af5',
                      boxShadow: '0 0 8px #7c6af5'
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
        <button
          onClick={() => alert('Profile editing is simulated. Details are managed automatically.')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.65rem',
            background: 'transparent',
            border: '1px solid #1e1b38',
            borderRadius: '8px',
            color: '#a7a6c0',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#a7a6c0'; }}
        >
          👤 Edit Profile
        </button>

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
            border: '1px solid #3c1e1e',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(248,113,113,0.08)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >
          ➔ Terminate Session
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
