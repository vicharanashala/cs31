import React, { useState, useEffect } from 'react';
import axios from 'axios';

const C = {
  bg: 'transparent',
  surface: '#121026',      // card / panel background
  surface2: '#191738',     // elevated surface (hover, reply bg)
  border: '#1f1b3c',       // borders / dividers
  accent: '#7c6af5',       // primary accent (purple)
  accent2: '#6366f1',      // secondary accent (blue)
  success: '#34d399',      // solution / approved
  warning: '#fbbf24',      // pending / unsolved
  danger: '#f87171',       // rejected / error
  text: '#e2e8f0',         // primary text
  muted: '#7a7990',        // secondary text / metadata
  muted2: '#b4b3c8',       // slightly brighter muted
};

function AdminDashboard() {
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [approvedQuestions, setApprovedQuestions] = useState([]);
  const [answer, setAnswer] = useState({});
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const token = localStorage.getItem('token');
  const config = { headers: { 'x-auth-token': token } };

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('/api/questions/pending', config);
      setPendingQuestions(res.data);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const fetchFAQs = async () => {
    try {
      const res = await axios.get('/api/faqs', config);
      setApprovedQuestions(res.data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchFAQs();
  }, []);

  const handleApprove = async (questionId) => {
    const ans = answer[questionId];
    if (!ans || ans.trim().length === 0) {
      setMessage('Please provide an answer before approving');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      await axios.post(`/api/questions/${questionId}/approve`, { answer: ans }, config);
      setMessage('Question approved and added to FAQ!');
      fetchQuestions();
      fetchFAQs();
      setAnswer({ ...answer, [questionId]: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error approving question');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReject = async (questionId) => {
    if (!window.confirm('Are you sure you want to reject this question?')) return;
    
    try {
      await axios.delete(`/api/questions/${questionId}`, config);
      setMessage('Question rejected');
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error rejecting question');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteFAQ = async (faqId) => {
    if (!window.confirm('Delete this FAQ?')) return;
    
    try {
      await axios.delete(`/api/faqs/${faqId}`, config);
      setMessage('FAQ deleted');
      fetchFAQs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error deleting FAQ');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text, display: 'flex', flexDirection: 'column', width: '100%' }}>
      
      {/* Title Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#fff',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          Admin Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '0.45rem' }}>
          <button 
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '20px',
              border: activeTab === 'pending' ? '1px solid #7c6af5' : '1px solid #1f1b3c',
              background: activeTab === 'pending' ? 'rgba(124, 106, 245, 0.15)' : '#0d0c1b',
              color: activeTab === 'pending' ? '#a78bfa' : '#8f8eaf',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Pending ({pendingQuestions.length})
          </button>
          <button 
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '20px',
              border: activeTab === 'approved' ? '1px solid #7c6af5' : '1px solid #1f1b3c',
              background: activeTab === 'approved' ? 'rgba(124, 106, 245, 0.15)' : '#0d0c1b',
              color: activeTab === 'approved' ? '#a78bfa' : '#8f8eaf',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            FAQs ({approvedQuestions.length})
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') || message.includes('reject') ? 'alert-error' : 'alert-success'}`} style={{
          background: message.includes('Error') || message.includes('reject') ? '#3c1e1e' : 'rgba(52, 211, 153, 0.08)',
          border: `1px solid ${message.includes('Error') || message.includes('reject') ? '#7c1f1f' : 'rgba(52, 211, 153, 0.25)'}`,
          color: message.includes('Error') || message.includes('reject') ? '#f87171' : '#34d399',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem'
        }}>
          {message}
        </div>
      )}

      <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto' }}>
        
        {activeTab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pendingQuestions.length === 0 ? (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                color: C.muted,
                fontSize: '0.9rem'
              }}>
                No pending questions. All caught up! 🎉
              </div>
            ) : (
              pendingQuestions.map((q) => (
                <div key={q._id} style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxSizing: 'border-box'
                }}>
                  {/* Title/Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '5px',
                      color: C.warning,
                      background: 'rgba(251, 191, 36, 0.12)'
                    }}>
                      Pending Review
                    </span>
                    <span style={{ fontSize: '0.72rem', color: C.muted }}>
                      Posted by {q.createdBy?.name || 'Unknown'} • {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                    {q.question}
                  </h3>

                  {/* Answer Input */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted2, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Draft Answer for FAQ
                    </label>
                    <textarea
                      value={answer[q._id] || ''}
                      onChange={(e) => setAnswer({ ...answer, [q._id]: e.target.value })}
                      placeholder="Write the verified answer to promote this question to FAQ..."
                      rows="3"
                      style={{
                        width: '100%',
                        background: '#0d0c1b',
                        border: `1px solid ${C.border}`,
                        borderRadius: '10px',
                        color: C.text,
                        padding: '0.75rem 1rem',
                        fontSize: '0.9rem',
                        resize: 'none',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = C.accent}
                      onBlur={(e) => e.target.style.borderColor = C.border}
                    />
                  </div>

                  {/* Upvote context & actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 600 }}>
                      🔥 Upvotes: {q.upvoteCount || 0}
                    </span>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        onClick={() => handleReject(q._id)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${C.danger}`,
                          color: C.danger,
                          borderRadius: '8px',
                          padding: '0.45rem 1rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(248,113,113,0.08)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        ✕ Reject
                      </button>
                      <button
                        onClick={() => handleApprove(q._id)}
                        disabled={!(answer[q._id] || '').trim()}
                        style={{
                          background: (answer[q._id] || '').trim() ? C.accent : '#1e1b38',
                          color: (answer[q._id] || '').trim() ? '#fff' : '#525166',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem 1.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: (answer[q._id] || '').trim() ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s'
                        }}
                      >
                        ✓ Approve & Add to FAQ
                      </button>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {approvedQuestions.length === 0 ? (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                color: C.muted,
                fontSize: '0.9rem'
              }}>
                No FAQs created yet. Promote some pending questions or seed some data!
              </div>
            ) : (
              approvedQuestions.map((faq) => (
                <div key={faq._id} style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '5px',
                      color: C.success,
                      background: 'rgba(52, 211, 153, 0.12)'
                    }}>
                      FAQ Entry
                    </span>
                    <span style={{ fontSize: '0.72rem', color: C.muted }}>
                      Added {new Date(faq.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                    {faq.question}
                  </h3>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#b4b3c8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {faq.answer}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
                    <button 
                      onClick={() => handleDeleteFAQ(faq._id)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${C.danger}`,
                        color: C.danger,
                        borderRadius: '8px',
                        padding: '0.4rem 1rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(248,113,113,0.08)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      🗑️ Delete FAQ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminDashboard;