import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Leaderboard from '../components/Leaderboard';

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

function Leaderboards() {
  const [studentsLeaderboard, setStudentsLeaderboard] = useState([]);
  const [adminsLeaderboard, setAdminsLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (!token) return;

    const fetchLeaderboards = async () => {
      try {
        setLoading(true);
        const config = { headers: { 'x-auth-token': token } };
        
        // Fetch student leaderboard
        const studRes = await axios.get('/api/auth/leaderboard/students', config);
        if (Array.isArray(studRes.data)) {
          setStudentsLeaderboard(studRes.data);
        }

        // Fetch admin leaderboard if admin
        if (isAdmin) {
          try {
            const admRes = await axios.get('/api/auth/leaderboard/admins', config);
            if (Array.isArray(admRes.data)) {
              setAdminsLeaderboard(admRes.data);
            }
          } catch (admErr) {
            console.error('Error fetching admin leaderboard:', admErr);
          }
        }
        setError('');
      } catch (err) {
        console.error('Error fetching leaderboards:', err);
        setError('Failed to load leaderboards. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, [token, isAdmin]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '3rem'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124, 106, 245, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>🏆</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-white)', margin: 0 }}>
            Spurti Leaderboards
          </h1>
        </div>
        <p style={{ color: C.muted, fontSize: '0.9rem', margin: 0, maxWidth: '600px', lineHeight: '1.5' }}>
          Track community participation points and recognize contributions. Earn Spurti Points (SP) by asking high-quality questions, providing accepted solutions, and actively engaging in discussion.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          borderRadius: '10px',
          background: 'var(--danger-soft)',
          border: '1px solid var(--border-danger)',
          color: 'var(--danger)',
          fontSize: '0.85rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0', color: C.muted, gap: '0.5rem', alignItems: 'center' }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: `2px solid ${C.border}`,
            borderTopColor: C.accent,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '0.9rem' }}>Loading leaderboards...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isAdmin ? 'repeat(auto-fit, minmax(450px, 1fr))' : '1fr',
          gap: '2rem',
          alignItems: 'start',
          justifyContent: isAdmin ? 'stretch' : 'center',
          maxWidth: isAdmin ? '100%' : '600px',
          margin: isAdmin ? '0' : '0 auto',
          width: '100%'
        }}>
          <div>
            <Leaderboard 
              title="Student Leaderboard" 
              data={studentsLeaderboard} 
              type="students" 
            />
          </div>

          {isAdmin && (
            <div>
              <Leaderboard 
                title="Admin Leaderboard" 
                data={adminsLeaderboard} 
                type="admins" 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Leaderboards;
