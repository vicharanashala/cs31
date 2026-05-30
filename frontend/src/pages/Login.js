import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user && res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/faqs');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#07070c',
      padding: '1rem'
    }}>
      <div className="card" style={{
        maxWidth: '450px',
        width: '100%',
        background: '#121026',
        border: '1px solid #1f1b3c',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        padding: '2.5rem'
      }}>
        <h2>🔐 Welcome Back</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ color: '#7a7990', fontSize: '0.8rem', fontWeight: 600 }}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              style={{
                background: '#0d0c1b',
                border: '2px solid #1f1b3c',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.95rem'
              }}
            />
          </div>
          <div className="form-group">
            <label style={{ color: '#7a7990', fontSize: '0.8rem', fontWeight: 600 }}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={{
                background: '#0d0c1b',
                border: '2px solid #1f1b3c',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.95rem'
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{
            background: '#7c6af5',
            color: '#fff',
            fontWeight: 700,
            borderRadius: '8px',
            padding: '0.75rem',
            marginTop: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <div className="auth-links" style={{ color: '#7a7990', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          Don't have an account? <Link to="/signup" style={{ color: '#7c6af5', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;