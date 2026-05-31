import React from 'react';

const C = {
  surface: 'var(--bg-card)',
  surface2: 'var(--bg-surface2)',
  border: 'var(--border-card)',
  accent: 'var(--accent)',
  accent2: 'var(--accent2)',
  text: 'var(--text-main)',
  muted: 'var(--text-muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
};

const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  if (username.length <= 3) {
    return `${username.charAt(0)}***@${domain}`;
  }
  return `${username.slice(0, 3)}***${username.slice(-1)}@${domain}`;
};

function Leaderboard({ title, data, type = 'students' }) {
  const getRankBadge = (rank) => {
    if (rank === 1) return { char: '🥇', bg: 'var(--bg-active)', color: 'var(--warning)', border: 'var(--warning)' };
    if (rank === 2) return { char: '🥈', bg: 'var(--bg-hover)', color: 'var(--text-white)', border: 'var(--border-card)' };
    if (rank === 3) return { char: '🥉', bg: 'var(--danger-soft)', color: 'var(--danger)', border: 'var(--danger)' };
    return { char: rank, bg: 'var(--bg-hover)', color: C.muted, border: C.border };
  };

  const getBadgeName = (pts, role) => {
    if (role === 'admin') return 'Admin';
    if (pts >= 500) return 'Coordinator';
    if (pts >= 300) return 'Sub-Coord';
    if (pts >= 200) return 'Volunteer';
    return 'Student';
  };

  const getBadgeColor = (name) => {
    if (name === 'Admin') return 'var(--danger)';
    if (name === 'Coordinator') return 'var(--warning)';
    if (name === 'Sub-Coord') return 'var(--accent2)';
    if (name === 'Volunteer') return 'var(--accent)';
    return 'var(--accent)';
  };

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: '16px',
      padding: '1.25rem',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-white)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {type === 'students' ? '🏆' : '🛡️'} {title}
        </h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {data.length} active
        </span>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.6rem', 
        maxHeight: '380px', 
        overflowY: 'auto', 
        paddingRight: '0.2rem'
      }}>
        {data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.muted, fontSize: '0.8rem' }}>
            No users on leaderboard yet.
          </div>
        ) : (
          data.map((user, idx) => {
            const rank = idx + 1;
            const badge = getRankBadge(rank);
            const userPts = user.spurtiPoints !== undefined ? user.spurtiPoints : 10;
            const badgeName = getBadgeName(userPts, user.role);
            const badgeColor = getBadgeColor(badgeName);
            
            return (
              <div
                key={user._id || user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.surface2;
                  e.currentTarget.style.borderColor = 'rgba(124, 106, 245, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {/* Rank number or medal */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: rank <= 3 ? '1.1rem' : '0.75rem',
                  fontWeight: 800,
                  background: rank <= 3 ? badge.bg : 'transparent',
                  color: badge.color,
                  border: rank <= 3 ? `1px solid ${badge.border}` : 'none',
                  flexShrink: 0
                }}>
                  {badge.char}
                </div>

                {/* Avatar Initial */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${type === 'students' ? '#a78bfa' : '#f87171'} 0%, #06b6d4 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#fff',
                  flexShrink: 0
                }}>
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>

                {/* User details */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-white)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {user.name}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: badgeColor }}>
                      {badgeName}
                    </span>
                    {user.email && (
                      <span style={{ fontSize: '0.65rem', color: C.muted }}>
                        • {maskEmail(user.email)}
                      </span>
                    )}
                  </div>
                </div>

                {/* SP Count */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-white)' }}>
                    {userPts}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, color: C.accent2, textTransform: 'uppercase' }}>
                    SP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
