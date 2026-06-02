import React from 'react';
import Sidebar from './Sidebar';

function DashboardLayout({ children }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-main)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden'
    }}>
      {/* Sidebar on the Left */}
      <Sidebar />

      {/* Main Content Area on the Right */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2rem 3rem',
        boxSizing: 'border-box',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </div>
    </div>
  );
}

export default DashboardLayout;
