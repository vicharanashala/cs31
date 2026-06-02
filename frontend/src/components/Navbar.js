import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!token) return null;

  return (
    <nav className="navbar">
      <h1>📚 CrowdSource FAQ</h1>
      <div className="navbar-links">
        <span style={{ color: '#aaa', marginRight: '1rem' }}>
          Hello, {user?.name || 'User'} {isAdmin && '(Admin)'}
        </span>
        <Link to="/faqs">FAQs</Link>
        <Link to="/questions">Questions</Link>
        {isAdmin && <Link to="/admin">Admin</Link>}
        <button onClick={handleLogout} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',marginLeft:'1.5rem',fontSize:'0.95rem'}}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;