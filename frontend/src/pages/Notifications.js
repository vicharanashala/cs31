import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const C = {
  bg: 'transparent',
  surface: '#121026',      // card / panel background
  surface2: '#191738',     // hover / elevated background
  border: '#1f1b3c',       // borders / dividers
  accent: '#7c6af5',       // primary accent (purple)
  accent2: '#6366f1',      // secondary accent (blue)
  success: '#34d399',      // solution / approved
  warning: '#fbbf24',      // pending / points
  danger: '#f87171',       // delete / negative
  text: '#e2e8f0',         // primary text
  muted: '#7a7990',        // secondary text / metadata
  muted2: '#b4b3c8'        // slightly brighter muted
};

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const config = { headers: { 'x-auth-token': token } };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/notifications', config);
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axios.post('/api/notifications/mark-read', {}, config);
      fetchNotifications();
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleMarkSingleRead = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.post(`/api/notifications/${id}/read`, {}, config);
      fetchNotifications();
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/notifications/${id}`, config);
      fetchNotifications();
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleCardClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await axios.post(`/api/notifications/${notif._id}/read`, {}, config);
        window.dispatchEvent(new Event('notifications_updated'));
      } catch (err) {
        console.error('Error marking read on card click:', err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatTimestamp = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getNotifDetails = (type) => {
    switch (type) {
      case 'reply':
        return {
          icon: '💬',
          color: C.accent2,
          borderColor: C.accent2,
          label: 'New Reply'
        };
      case 'solution':
        return {
          icon: '🎉',
          color: C.success,
          borderColor: C.success,
          label: 'Solution Marked'
        };
      case 'faq_promotion':
        return {
          icon: '🏆',
          color: C.warning,
          borderColor: C.warning,
          label: 'FAQ Promotion'
        };
      case 'points':
        return {
          icon: '⚡',
          color: C.accent,
          borderColor: C.accent,
          label: 'Spurti Points'
        };
      default:
        return {
          icon: '🔔',
          color: C.muted2,
          borderColor: C.border,
          label: 'Notification'
        };
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text, display: 'flex', flexDirection: 'column', width: '100%' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Notifications
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: C.muted }}>
            Stay updated with your Spurti Points, replies, and FAQ awards
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: 'rgba(124, 106, 245, 0.1)',
              border: `1px solid rgba(124, 106, 245, 0.25)`,
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: C.accent,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(124, 106, 245, 0.2)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(124, 106, 245, 0.1)'; }}
          >
            ✓ Mark All Read
          </button>
        )}
      </div>

      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
        
        {/* Tabs Bar */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${C.border}`,
          marginBottom: '1.5rem',
          gap: '1.5rem'
        }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: filter === 'all' ? `2px solid ${C.accent}` : '2px solid transparent',
              color: filter === 'all' ? '#fff' : C.muted,
              padding: '0.75rem 0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            All Notifications
            <span style={{
              background: 'rgba(255,255,255,0.06)',
              color: C.muted2,
              fontSize: '0.75rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '6px'
            }}>{notifications.length}</span>
          </button>
          
          <button
            onClick={() => setFilter('unread')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: filter === 'unread' ? `2px solid ${C.accent}` : '2px solid transparent',
              color: filter === 'unread' ? '#fff' : C.muted,
              padding: '0.75rem 0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            Unread
            {unreadCount > 0 && (
              <span style={{
                background: 'rgba(248, 113, 113, 0.15)',
                color: C.danger,
                fontSize: '0.75rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '6px',
                fontWeight: 700
              }}>{unreadCount}</span>
            )}
          </button>
        </div>

        {/* List Content */}
        {loading && notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🌌</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: C.muted, maxWidth: '300px', marginHorizontal: 'auto' }}>
              {filter === 'unread' ? 'You have read all notifications in your inbox.' : 'When replies or point rewards are generated, they will show up here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredNotifications.map((notif) => {
              const details = getNotifDetails(notif.type);
              const isHovered = hoveredId === notif._id;
              
              return (
                <div
                  key={notif._id}
                  onClick={() => handleCardClick(notif)}
                  onMouseEnter={() => setHoveredId(notif._id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    background: notif.isRead ? C.surface : 'rgba(25, 23, 56, 0.4)',
                    border: `1px solid ${notif.isRead ? C.border : 'rgba(124, 106, 245, 0.25)'}`,
                    borderLeft: `4px solid ${details.borderColor}`,
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    cursor: notif.link ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isHovered && notif.link ? 'translateY(-2px)' : 'none',
                    boxShadow: isHovered && notif.link 
                      ? '0 6px 20px rgba(124, 106, 245, 0.08)' 
                      : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Status indicator for unread */}
                  {!notif.isRead && (
                    <div style={{
                      position: 'absolute',
                      left: '-2px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '6px',
                      height: '24px',
                      borderRadius: '0 3px 3px 0',
                      background: C.accent,
                      boxShadow: `0 0 10px ${C.accent}`
                    }} />
                  )}

                  {/* Icon badge */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: `rgba(${parseInt(details.color.slice(1,3), 16) || 124}, ${parseInt(details.color.slice(3,5), 16) || 106}, ${parseInt(details.color.slice(5,7), 16) || 245}, 0.1)`,
                    border: `1px solid rgba(${parseInt(details.color.slice(1,3), 16) || 124}, ${parseInt(details.color.slice(3,5), 16) || 106}, ${parseInt(details.color.slice(5,7), 16) || 245}, 0.2)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}>
                    {details.icon}
                  </div>

                  {/* Text Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: details.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {details.label}
                      </span>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: C.muted }} />
                      <span style={{ fontSize: '0.72rem', color: C.muted }}>
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#fff', lineHeight: 1.45, fontWeight: notif.isRead ? 400 : 500 }}>
                      {notif.text}
                    </p>
                  </div>

                  {/* Right Actions */}
                  <div 
                    style={{ display: 'flex', gap: '0.45rem' }}
                    onClick={(e) => e.stopPropagation()} // Prevent card click
                  >
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkSingleRead(notif._id, e)}
                        title="Mark as Read"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: C.success,
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          padding: '0.4rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = 'rgba(52, 211, 153, 0.1)'; }}
                        onMouseLeave={(e) => { e.target.style.background = 'none'; }}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notif._id, e)}
                      title="Delete Notification"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.danger,
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.4rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(248, 113, 113, 0.1)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'none'; }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default Notifications;
