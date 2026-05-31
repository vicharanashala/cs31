import React, { useState } from 'react';
import axios from 'axios';

const C = {
  surface: 'var(--bg-card)',
  surface2: 'var(--bg-surface2)',
  border: 'var(--border-card)',
  accent: 'var(--accent)',
  accentHover: 'var(--accent-hover)',
  text: 'var(--text-main)',
  muted: 'var(--text-muted)',
  success: 'var(--success)',
  danger: 'var(--danger)',
};

function EditProfile() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [name, setName] = useState(user.name || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // Client side checks for password
    if (oldPassword || newPassword || confirmNewPassword) {
      if (!oldPassword || !newPassword || !confirmNewPassword) {
        setErrorMsg('To update your password, please fill in old password, new password, and confirmation.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMsg('New password and confirmation do not match.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        return;
      }
    }

    setLoading(true);

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      };

      const body = {
        name,
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
        confirmNewPassword: confirmNewPassword || undefined,
      };

      const res = await axios.put('/api/auth/profile', body, config);

      if (res.data && res.data.user) {
        // Update user in localStorage
        const updatedUser = {
          ...user,
          name: res.data.user.name,
          role: res.data.user.role,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setSuccessMsg(res.data.message || 'Profile updated successfully!');
        
        // Clear password fields
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        // Notify sidebar to sync user state immediately
        window.dispatchEvent(new Event('profile_updated'));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '3rem'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-active) 0%, rgba(6, 182, 212, 0.02) 100%)',
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>⚙️</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-white)', margin: 0 }}>
            Edit Profile
          </h1>
        </div>
        <p style={{ color: C.muted, fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
          Update your public display name and manage your security settings. Leaving the password fields blank will keep your current password active.
        </p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{
          padding: '1rem',
          borderRadius: '10px',
          background: 'var(--bg-active)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          color: C.success,
          fontSize: '0.9rem'
        }}>
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '1rem',
          borderRadius: '10px',
          background: 'var(--danger-soft)',
          border: '1px solid rgba(248, 113, 113, 0.25)',
          color: C.danger,
          fontSize: '0.9rem'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Form Container */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Display Name Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-white)', fontSize: '0.85rem', fontWeight: 600 }}>
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              required
              style={{
                background: 'var(--bg-main)',
                border: `2px solid ${C.border}`,
                color: C.text,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, margin: '0.5rem 0' }} />

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-white)', margin: 0 }}>
            Change Password
          </h3>
          <p style={{ color: C.muted, fontSize: '0.78rem', margin: 0, marginTop: '-0.75rem' }}>
            To change your password, provide your old password and specify a new one. Otherwise, leave these blank.
          </p>

          {/* Old Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-white)', fontSize: '0.85rem', fontWeight: 600 }}>
              Old Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                background: 'var(--bg-main)',
                border: `2px solid ${C.border}`,
                color: C.text,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>

          {/* New Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-white)', fontSize: '0.85rem', fontWeight: 600 }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                background: 'var(--bg-main)',
                border: `2px solid ${C.border}`,
                color: C.text,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Confirm New Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-white)', fontSize: '0.85rem', fontWeight: 600 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                background: 'var(--bg-main)',
                border: `2px solid ${C.border}`,
                color: C.text,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: C.accent,
              color: '#fff',
              fontWeight: 700,
              borderRadius: '8px',
              padding: '0.85rem',
              marginTop: '1rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              transition: 'background-color 0.2s, transform 0.1s',
              boxShadow: '0 4px 12px rgba(124, 106, 245, 0.2)'
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = C.accentHover; }}
            onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = C.accent; }}
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
