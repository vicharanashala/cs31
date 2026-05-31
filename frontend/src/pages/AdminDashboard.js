import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';

const C = {
  bg: 'transparent',
  surface: 'var(--bg-card)',      // card / panel background
  surface2: 'var(--bg-surface2)',     // elevated surface (hover, reply bg)
  border: 'var(--border-card)',       // borders / dividers
  accent: 'var(--accent)',       // primary accent (purple)
  accent2: 'var(--accent2)',      // secondary accent (cyan)
  success: 'var(--success)',      // solution / approved
  warning: 'var(--warning)',      // pending / unsolved
  danger: 'var(--danger)',       // rejected / error
  text: 'var(--text-main)',         // primary text
  muted: 'var(--text-muted)',        // secondary text / metadata
  muted2: 'var(--text-muted2)',       // slightly brighter muted
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [faqRequests, setFaqRequests] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [approvedQuestions, setApprovedQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [answer, setAnswer] = useState({});
  const [section, setSection] = useState({});
  const [customSection, setCustomSection] = useState({});
  const [showFaqDraft, setShowFaqDraft] = useState({});
  const [editedQuestion, setEditedQuestion] = useState({});
  
  const [studentsLeaderboard, setStudentsLeaderboard] = useState([]);
  const [adminsLeaderboard, setAdminsLeaderboard] = useState([]);
  const [reportedItems, setReportedItems] = useState([]);
  
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('faqRequests');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { label, message, onConfirm }

  const token = localStorage.getItem('token');
  const config = { headers: { 'x-auth-token': token } };

  const fetchFAQRequests = async () => {
    try {
      const res = await axios.get('/api/questions/faq-requests', config);
      setFaqRequests(res.data);
    } catch (err) {
      console.error('Error fetching FAQ requests:', err);
    }
  };

  const fetchPendingQuestions = async () => {
    try {
      const res = await axios.get('/api/questions/pending', config);
      setPendingQuestions(res.data);
    } catch (err) {
      console.error('Error fetching pending questions:', err);
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

  const fetchSections = async () => {
    try {
      const res = await axios.get('/api/faqs/sections', config);
      setSections(res.data);
    } catch (err) {
      console.error('Error fetching FAQ sections:', err);
    }
  };

  const fetchAllQuestions = async () => {
    try {
      const res = await axios.get('/api/questions', config);
      setAllQuestions(res.data);
    } catch (err) {
      console.error('Error fetching all questions:', err);
    }
  };

  const fetchLeaderboards = async () => {
    try {
      const studRes = await axios.get('/api/auth/leaderboard/students', config);
      setStudentsLeaderboard(studRes.data);
    } catch (err) {
      console.error('Error fetching students leaderboard:', err);
    }
    try {
      const admRes = await axios.get('/api/auth/leaderboard/admins', config);
      setAdminsLeaderboard(admRes.data);
    } catch (err) {
      console.error('Error fetching admins leaderboard:', err);
    }
  };

  const fetchReportedItems = async () => {
    try {
      const res = await axios.get('/api/questions/reported', config);
      setReportedItems(res.data);
    } catch (err) {
      console.error('Error fetching reported items:', err);
    }
  };

  const refreshAll = () => {
    fetchFAQRequests();
    fetchPendingQuestions();
    fetchFAQs();
    fetchSections();
    fetchAllQuestions();
    fetchLeaderboards();
    fetchReportedItems();
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      navigate('/faqs');
      return;
    }
    refreshAll();
  }, [navigate]);

  const handleApprove = async (questionId) => {
    const ans = answer[questionId];
    if (!ans || ans.trim().length === 0) {
      setMessage('Please provide an answer before approving');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const sec = customSection[questionId] || section[questionId] || 'Community Contribution';
    
    // Fallback to original question text from faqRequests or pendingQuestions if not edited
    const qObj = faqRequests.find(q => q._id === questionId) || pendingQuestions.find(q => q._id === questionId);
    const originalText = qObj ? qObj.question : '';
    const qText = editedQuestion[questionId] !== undefined ? editedQuestion[questionId] : originalText;

    if (!qText || qText.trim().length === 0) {
      setMessage('Question text cannot be empty');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      await axios.post(`/api/questions/${questionId}/approve`, { answer: ans, section: sec, question: qText.trim() }, config);
      setMessage('Question approved and added to FAQ directory successfully!');
      refreshAll();
      
      // Reset inputs
      setAnswer(prev => ({ ...prev, [questionId]: '' }));
      setSection(prev => ({ ...prev, [questionId]: '' }));
      setCustomSection(prev => ({ ...prev, [questionId]: '' }));
      setEditedQuestion(prev => ({ ...prev, [questionId]: '' }));
      setShowFaqDraft(prev => ({ ...prev, [questionId]: false }));
      
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error approving question');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleDenyFAQRequest = async (questionId) => {
    setConfirmAction({
      label: 'Deny Request',
      message: 'Are you sure you want to deny this FAQ promotion request? The question will remain in the community questions feed but will be removed from this queue.',
      onConfirm: async () => {
        try {
          await axios.post(`/api/questions/${questionId}/deny-faq`, {}, config);
          setMessage('FAQ promotion request denied successfully');
          refreshAll();
          setTimeout(() => setMessage(''), 3000);
        } catch (err) {
          setMessage(err.response?.data?.message || 'Error denying FAQ request');
          setTimeout(() => setMessage(''), 3000);
        }
      }
    });
  };

  const handleReject = async (questionId) => {
    setConfirmAction({
      label: 'Reject Question',
      message: 'Are you sure you want to reject and delete this question request?',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/questions/${questionId}`, config);
          setMessage('Question deleted successfully');
          refreshAll();
          setTimeout(() => setMessage(''), 3000);
        } catch (err) {
          setMessage(err.response?.data?.message || 'Error deleting question');
          setTimeout(() => setMessage(''), 3000);
        }
      }
    });
  };

  const handleDeleteFAQ = async (faqId) => {
    setConfirmAction({
      label: 'Delete FAQ',
      message: 'Are you sure you want to delete this FAQ entry permanently?',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/faqs/${faqId}`, config);
          setMessage('FAQ entry deleted');
          refreshAll();
          setTimeout(() => setMessage(''), 3000);
        } catch (err) {
          setMessage('Error deleting FAQ');
          setTimeout(() => setMessage(''), 3000);
        }
      }
    });
  };

  const handleDismissReport = async (item) => {
    try {
      if (item.type === 'question') {
        await axios.post(`/api/questions/${item.id}/dismiss-reports`, {}, config);
      } else {
        await axios.post(`/api/questions/${item.questionId}/replies/${item.id}/dismiss-reports`, {}, config);
      }
      setMessage('Reports dismissed successfully');
      refreshAll();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error dismissing reports:', err);
      setMessage(err.response?.data?.message || 'Error dismissing reports');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteReportedItem = async (item) => {
    const confirmMsg = item.type === 'question'
      ? 'Are you sure you want to permanently delete this reported question?'
      : 'Are you sure you want to permanently delete this reported reply?';
    setConfirmAction({
      label: 'Delete Reported ' + (item.type === 'question' ? 'Question' : 'Reply'),
      message: confirmMsg,
      onConfirm: async () => {
        try {
          if (item.type === 'question') {
            await axios.delete(`/api/questions/${item.id}`, config);
          } else {
            await axios.delete(`/api/questions/${item.questionId}/replies/${item.id}`, config);
          }
          setMessage('Reported item deleted successfully');
          refreshAll();
          setTimeout(() => setMessage(''), 3000);
        } catch (err) {
          console.error('Error deleting reported item:', err);
          setMessage(err.response?.data?.message || 'Error deleting reported item');
          setTimeout(() => setMessage(''), 3000);
        }
      }
    });
  };

  // Helper to pre-populate form with highest upvoted reply if any
  const prefillFromSolution = (question) => {
    if (!question.replies || question.replies.length === 0) return;
    // Find solution reply, otherwise highest upvoted
    const solutionReply = question.replies.find(r => r.isSolution);
    if (solutionReply) {
      setAnswer(prev => ({ ...prev, [question._id]: solutionReply.text }));
    } else {
      const sorted = [...question.replies].sort((a, b) => b.upvoteCount - a.upvoteCount);
      setAnswer(prev => ({ ...prev, [question._id]: sorted[0].text }));
    }
  };

  const filteredFAQs = approvedQuestions.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute trending questions
  const trendingQuestions = [...allQuestions]
    .filter(q => q.upvoteCount > 0)
    .sort((a, b) => b.upvoteCount - a.upvoteCount)
    .slice(0, 5);

  const maxUpvotes = trendingQuestions.length > 0 ? Math.max(...trendingQuestions.map(q => q.upvoteCount)) : 0;

  // Compute category distribution
  const categoryCounts = {};
  approvedQuestions.forEach(faq => {
    const sec = faq.section || 'General';
    categoryCounts[sec] = (categoryCounts[sec] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCategoryCount = sortedCategories.length > 0 ? Math.max(...sortedCategories.map(c => c[1])) : 0;

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
          color: 'var(--text-white)',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          Admin Command Center
        </h1>
        <div style={{ display: 'flex', gap: '0.45rem' }}>
          <button 
            onClick={() => setActiveTab('faqRequests')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '20px',
              border: activeTab === 'faqRequests' ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
              background: activeTab === 'faqRequests' ? 'var(--bg-active)' : 'var(--bg-surface2)',
              color: activeTab === 'faqRequests' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            FAQ Requests ({faqRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '20px',
              border: activeTab === 'pending' ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
              background: activeTab === 'pending' ? 'var(--bg-active)' : 'var(--bg-surface2)',
              color: activeTab === 'pending' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Pending Review ({pendingQuestions.length})
          </button>
          <button 
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '20px',
              border: activeTab === 'approved' ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
              background: activeTab === 'approved' ? 'var(--bg-active)' : 'var(--bg-surface2)',
              color: activeTab === 'approved' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Manage FAQs ({approvedQuestions.length})
          </button>
        </div>
      </div>

      {/* Analytics Overview Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Metric 1: FAQ Requests */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: C.accent2
          }} />
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              FAQ Promote Requests
            </span>
            <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-white)' }}>
              {faqRequests.length}
            </h2>
          </div>
          <span style={{ fontSize: '1.75rem', filter: 'grayscale(30%)' }}>📈</span>
        </div>

        {/* Metric 2: Pending Questions */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: C.warning
          }} />
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Awaiting Community Review
            </span>
            <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-white)' }}>
              {pendingQuestions.length}
            </h2>
          </div>
          <span style={{ fontSize: '1.75rem', filter: 'grayscale(30%)' }}>⏳</span>
        </div>

        {/* Metric 3: Total FAQs */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: C.success
          }} />
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Published FAQ Index
            </span>
            <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-white)' }}>
              {approvedQuestions.length}
            </h2>
          </div>
          <span style={{ fontSize: '1.75rem', filter: 'grayscale(30%)' }}>📖</span>
        </div>
      </div>

      {/* Visual Analytics Section Grid (Trending + Categories) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Trending Questions Chart */}
        {trendingQuestions.length > 0 && (
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(124,106,245,0.08) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
                Most Trending Student Questions
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {trendingQuestions.map((q, idx) => {
                const percentage = maxUpvotes > 0 ? (q.upvoteCount / maxUpvotes) * 100 : 0;
                return (
                  <div
                    key={q._id}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'var(--bg-surface2)',
                      border: '1px solid var(--border-card)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface2)';
                      e.currentTarget.style.borderColor = 'var(--border-card)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', minWidth: 0 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.accent, opacity: 0.8 }}>
                          #{idx + 1}
                        </span>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {q.question}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: C.success }}>▲</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-white)' }}>
                          {q.upvoteCount}
                        </span>
                      </div>
                    </div>

                    {/* Progress indicator bar */}
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'var(--bg-main)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #7c6af5 0%, #6366f1 100%)',
                        borderRadius: '3px',
                        boxShadow: '0 0 8px rgba(124, 106, 245, 0.4)',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Distribution Chart */}
        {sortedCategories.length > 0 && (
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📁</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
                FAQ Category Distribution
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sortedCategories.map(([catName, count], idx) => {
                const percentage = maxCategoryCount > 0 ? (count / maxCategoryCount) * 100 : 0;
                return (
                  <div
                    key={catName}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'var(--bg-surface2)',
                      border: '1px solid var(--border-card)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = 'var(--accent2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface2)';
                      e.currentTarget.style.borderColor = 'var(--border-card)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', minWidth: 0 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.accent2, opacity: 0.8 }}>
                          #{idx + 1}
                        </span>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {catName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.accent2 }}>
                          {count} active
                        </span>
                      </div>
                    </div>

                    {/* Progress indicator bar */}
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'var(--bg-main)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)',
                        borderRadius: '3px',
                        boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Inline confirmation modal */}
      {confirmAction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>
                Confirm {confirmAction.label}
              </h2>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', color: C.muted2, fontSize: '0.9rem', lineHeight: 1.6 }}>
              {confirmAction.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: `1px solid ${C.border}`,
                  background: 'transparent',
                  color: C.text,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: C.danger,
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {confirmAction.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div style={{
          background: message.includes('Error') || message.includes('reject') || message.includes('denied') ? 'var(--danger-soft)' : 'rgba(5, 150, 105, 0.08)',
          border: `1px solid ${message.includes('Error') || message.includes('reject') || message.includes('denied') ? 'var(--border-danger)' : 'rgba(52, 211, 153, 0.25)'}`,
          color: message.includes('Error') || message.includes('reject') || message.includes('denied') ? 'var(--danger)' : 'var(--success)',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem'
        }}>
          {message}
        </div>
      )}

      <div style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '2rem',
        alignItems: 'start',
        boxSizing: 'border-box',
        padding: '0 1rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* TAB 1: FAQ requests (>20 upvotes) */}
        {activeTab === 'faqRequests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {faqRequests.length === 0 ? (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                color: C.muted,
                fontSize: '0.9rem'
              }}>
                No FAQ requests. Questions need over 20 upvotes to show up here for FAQ promotion review. 📈
              </div>
            ) : (
              faqRequests.map((q) => (
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
                      color: C.accent2,
                      background: 'rgba(6, 182, 212, 0.12)'
                    }}>
                      ⭐ FAQ Promote Request ({q.upvoteCount} upvotes)
                    </span>
                    <span style={{ fontSize: '0.72rem', color: C.muted }}>
                      Proposed by {q.createdBy?.name || 'Unknown'} • {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-white)', lineHeight: 1.4 }}>
                    {q.question}
                  </h3>

                  {/* Collapsed view toggle button */}
                  {!showFaqDraft[q._id] ? (
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                       <button
                        onClick={() => {
                          setShowFaqDraft(prev => ({ ...prev, [q._id]: true }));
                          setEditedQuestion(prev => ({ ...prev, [q._id]: q.question }));
                          prefillFromSolution(q);
                        }}
                        style={{
                          background: C.accent,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem 1.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Review & Promote to FAQ
                      </button>
                      <button
                        onClick={() => handleDenyFAQRequest(q._id)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${C.danger}`,
                          color: C.danger,
                          borderRadius: '8px',
                          padding: '0.45rem 1.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(248,113,113,0.08)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        Deny Request
                      </button>
                    </div>
                  ) : (
                    /* Expandable Draft Panel */
                    <div style={{
                      background: C.surface2,
                      border: `1px solid ${C.border}`,
                      borderRadius: '12px',
                      padding: '1.25rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                        
                        {/* Editable Question Input */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted2, marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                            Edit Question Text
                          </label>
                          <input
                            type="text"
                            value={editedQuestion[q._id] !== undefined ? editedQuestion[q._id] : q.question}
                            onChange={(e) => setEditedQuestion(prev => ({ ...prev, [q._id]: e.target.value }))}
                            style={{
                              width: '100%',
                              background: 'var(--bg-main)',
                              border: `1px solid ${C.border}`,
                              borderRadius: '8px',
                              color: C.text,
                              padding: '0.65rem 0.85rem',
                              fontSize: '0.88rem',
                              fontFamily: 'inherit',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        
                        {/* FAQ category selection */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted2, marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                            FAQ Section (Category)
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                              value={section[q._id] || ''}
                              onChange={(e) => setSection(prev => ({ ...prev, [q._id]: e.target.value }))}
                              style={{
                                flex: 1,
                                background: 'var(--bg-main)',
                                border: `1px solid ${C.border}`,
                                borderRadius: '8px',
                                color: C.text,
                                padding: '0.5rem',
                                fontSize: '0.85rem',
                                outline: 'none'
                              }}
                            >
                              <option value="">-- Choose Existing Section --</option>
                              {sections.map(sec => (
                                <option key={sec} value={sec}>{sec}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={customSection[q._id] || ''}
                              onChange={(e) => setCustomSection(prev => ({ ...prev, [q._id]: e.target.value }))}
                              placeholder="Or write custom category..."
                              style={{
                                flex: 1,
                                background: 'var(--bg-main)',
                                border: `1px solid ${C.border}`,
                                borderRadius: '8px',
                                color: C.text,
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.85rem',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        {/* Answer text area */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted2, marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                            Official Answer
                          </label>
                          <textarea
                            value={answer[q._id] || ''}
                            onChange={(e) => setAnswer(prev => ({ ...prev, [q._id]: e.target.value }))}
                            placeholder="Draft the official FAQ answer here..."
                            rows="4"
                            style={{
                              width: '100%',
                              background: 'var(--bg-main)',
                              border: `1px solid ${C.border}`,
                              borderRadius: '8px',
                              color: C.text,
                              padding: '0.65rem 0.85rem',
                              fontSize: '0.88rem',
                              resize: 'none',
                              fontFamily: 'inherit',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem' }}>
                        <button
                          onClick={() => setShowFaqDraft(prev => ({ ...prev, [q._id]: false }))}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${C.border}`,
                            color: C.muted2,
                            borderRadius: '8px',
                            padding: '0.4rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleApprove(q._id)}
                          disabled={!(answer[q._id] || '').trim()}
                          style={{
                            background: (answer[q._id] || '').trim() ? C.success : '#1e1b38',
                            color: (answer[q._id] || '').trim() ? '#07070e' : '#525166',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.4rem 1.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: (answer[q._id] || '').trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                          }}
                        >
                          Publish to FAQ
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Pending community review */}
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

                  {/* Editable Question Input */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted2, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Edit Question Text
                    </label>
                    <input
                      type="text"
                      value={editedQuestion[q._id] !== undefined ? editedQuestion[q._id] : q.question}
                      onChange={(e) => setEditedQuestion(prev => ({ ...prev, [q._id]: e.target.value }))}
                      style={{
                        width: '100%',
                        background: '#0d0c1b',
                        border: `1px solid ${C.border}`,
                        borderRadius: '10px',
                        color: C.text,
                        padding: '0.75rem 1rem',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Answer Input */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted2, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Draft Answer for FAQ (Optional Promotion)
                    </label>
                    <textarea
                      value={answer[q._id] || ''}
                      onChange={(e) => setAnswer({ ...answer, [q._id]: e.target.value })}
                      placeholder="Write the verified answer to promote this question directly to FAQ directory..."
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
                          background: (answer[q._id] || '').trim() ? C.accent : 'var(--bg-surface2)',
                          color: (answer[q._id] || '').trim() ? '#fff' : 'var(--text-muted)',
                          border: `1px solid ${C.border}`,
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

        {/* TAB 3: Manage FAQ directory */}
        {activeTab === 'approved' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Search FAQ */}
            <div style={{ marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Search active FAQs by question, answer, or section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  color: C.text,
                  padding: '0.85rem 1.1rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {filteredFAQs.length === 0 ? (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                color: C.muted,
                fontSize: '0.9rem'
              }}>
                No FAQs found matching your search.
              </div>
            ) : (
              filteredFAQs.map((faq) => (
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
                      📁 {faq.section || 'General'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: C.muted }}>
                      Published {new Date(faq.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-white)', lineHeight: 1.4 }}>
                    {faq.question}
                  </h3>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: 'var(--text-muted2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
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

        {/* Right Column: Leaderboards or Reports */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '1.5rem' }}>
          {activeTab === 'faqRequests' ? (
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              padding: '1.5rem',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
                  Reports Received
                </h2>
                <span style={{
                  background: C.danger,
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: 'auto'
                }}>
                  {reportedItems.length}
                </span>
              </div>

              {reportedItems.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  color: C.muted,
                  fontSize: '0.85rem'
                }}>
                  No active reports to review. 🎉
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
                  {reportedItems.map((item) => (
                    <div key={item.id} style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      background: 'var(--bg-surface2)',
                      border: `1px solid ${C.border}`,
                      fontSize: '0.8rem'
                    }}>
                      {/* Header: Type and Time */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: item.type === 'question' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: item.type === 'question' ? C.accent2 : '#c084fc'
                        }}>
                          {item.type}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: C.muted }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Text content */}
                      <p style={{
                        margin: '0 0 0.75rem 0',
                        color: C.text,
                        fontStyle: 'italic',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        background: 'var(--bg-main)',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${C.danger}`
                      }}>
                        "{item.text}"
                      </p>

                      {/* Reporter details */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.muted2, display: 'block', marginBottom: '0.3rem' }}>
                          Reports ({item.reports.length}):
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {item.reports.map((rep, idx) => (
                            <div key={idx} style={{
                              background: 'var(--bg-main)',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              border: `1px solid ${C.border}`,
                              fontSize: '0.72rem'
                            }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-white)', display: 'block', marginBottom: '2px' }}>
                                👤 {rep.email}
                              </span>
                              {rep.reason ? (
                                <span style={{ color: C.muted, fontStyle: 'italic' }}>
                                  "{rep.reason}"
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted2)', fontSize: '0.65rem' }}>
                                  No reason provided
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '0.5rem' }}>
                        <button
                          onClick={() => handleDismissReport(item)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${C.border}`,
                            color: C.text,
                            borderRadius: '6px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => e.target.style.borderColor = C.accent}
                          onMouseLeave={(e) => e.target.style.borderColor = C.border}
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleDeleteReportedItem(item)}
                          style={{
                            background: C.danger,
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = 0.9}
                          onMouseLeave={(e) => e.target.style.opacity = 1}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <Leaderboard title="Student Leaderboard" data={studentsLeaderboard} type="students" />
              <Leaderboard title="Admin Leaderboard" data={adminsLeaderboard} type="admins" />
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;