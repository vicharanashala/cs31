import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DUPLICATE_LIMIT = 85;

// --- Color tokens (CSS Variables theme support) ---
const C = {
  bg: 'transparent',
  surface: 'var(--bg-card)',      // card / panel background
  surface2: 'var(--bg-surface2)', // elevated surface (hover, reply bg)
  border: 'var(--border-card)',   // borders / dividers
  accent: 'var(--accent)',        // primary accent (purple)
  accent2: 'var(--accent2)',      // secondary accent (blue)
  success: 'var(--success)',      // solution / approved
  warning: 'var(--warning)',      // pending / unsolved
  danger: 'var(--danger)',        // rejected / error
  text: 'var(--text-main)',       // primary text
  muted: 'var(--text-muted)',     // secondary text / metadata
  muted2: 'var(--text-muted2)',   // slightly brighter muted
};

const getUserBadge = (user) => {
  if (!user) return { name: 'Student', color: 'var(--accent)', bg: 'var(--bg-active)', border: 'var(--border-card)' };
  if (user.role === 'admin') {
    return { name: 'Admin', color: 'var(--danger)', bg: 'var(--danger-soft)', border: 'var(--border-danger)' };
  }
  const pts = user.spurtiPoints !== undefined ? user.spurtiPoints : 10;
  if (pts >= 500) {
    return { name: 'Coordinator', color: 'var(--warning)', bg: 'var(--bg-active)', border: 'var(--warning)' };
  }
  if (pts >= 300) {
    return { name: 'Sub-Coordinator', color: 'var(--accent2)', bg: 'var(--bg-hover)', border: 'var(--accent2)' };
  }
  if (pts >= 200) {
    return { name: 'Volunteer', color: 'var(--accent)', bg: 'var(--bg-active)', border: 'var(--accent)' };
  }
  return { name: 'Student', color: 'var(--accent)', bg: 'var(--bg-active)', border: 'var(--border-card)' };
};

function Questions() {
  const [questions, setQuestions] = useState([]);
  const [myQuestions, setMyQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false);
  const [unsolvedCount, setUnsolvedCount] = useState(0);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [showReply, setShowReply] = useState({});
  const [message, setMessage] = useState('');
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarNotice, setSimilarNotice] = useState('');
  const [pendingSimilarConfirmation, setPendingSimilarConfirmation] = useState(false);
  const [reportingItem, setReportingItem] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [toast, setToast] = useState(null);
  const [editItemModal, setEditItemModal] = useState(null); // { type, id, qId?, text }
  const [confirmAction, setConfirmAction] = useState(null); // { label, message, onConfirm }
  const [sections, setSections] = useState([]);
  const [publishFaqModal, setPublishFaqModal] = useState(null); // { id, question, answer, section, customSection }

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const config = { headers: { 'x-auth-token': token } };
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';

  // --- Fetch ---
  const fetchQuestions = async () => {
    try {
      const res = await axios.get('/api/questions', config);
      setQuestions(res.data);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const fetchMyQuestions = async () => {
    try {
      const res = await axios.get('/api/questions/my', config);
      setMyQuestions(res.data);
    } catch (err) {
      console.error('Error fetching my questions:', err);
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

  const refreshAll = () => {
    fetchQuestions();
    fetchMyQuestions();
    fetchSections();
  };

  const getDisplayedQuestions = () => {
    const source = activeTab === 'all' ? questions : myQuestions;
    if (!showUnsolvedOnly) return source;
    return source.filter(q => !q.replies || q.replies.length === 0 || !q.replies.some(r => r.isSolution));
  };

  // --- Lifecycle ---
  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const count = questions.filter(q => !q.replies || q.replies.length === 0 || !q.replies.some(r => r.isSolution)).length;
    setUnsolvedCount(count);
  }, [questions]);

  // --- Voting helpers ---
  const hasUpvoted = (q) => {
    const userId = user.id || user._id;
    if (!q || !q.upvotes || !userId) return false;
    return q.upvotes.some(u => {
      const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : u.toString());
      return uId === userId;
    });
  };

  const hasDownvoted = (q) => {
    const userId = user.id || user._id;
    if (!q || !q.downvotes || !userId) return false;
    return q.downvotes.some(u => {
      const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : u.toString());
      return uId === userId;
    });
  };

  const hasReplyUpvoted = (reply) => {
    const userId = user.id || user._id;
    if (!reply || !reply.upvotes || !userId) return false;
    return reply.upvotes.some(u => {
      const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : u.toString());
      return uId === userId;
    });
  };

  const hasReplyDownvoted = (reply) => {
    const userId = user.id || user._id;
    if (!reply || !reply.downvotes || !userId) return false;
    return reply.downvotes.some(u => {
      const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : u.toString());
      return uId === userId;
    });
  };

  const sortedReplies = (replies) => [...(replies || [])].sort((a, b) => {
    if (a.isSolution && !b.isSolution) return -1;
    if (!a.isSolution && b.isSolution) return 1;
    return (b.upvoteCount || 0) - (a.upvoteCount || 0);
  });

  const getSimilarityPercent = (q) => q.similarityPercent || Math.round((q.similarity || 0) * 100);

  // --- Handlers ---
  const handleUpvote = async (id) => {
    try {
      const res = await axios.post(`/api/questions/${id}/upvote`, {}, config);
      const updated = res.data.question;
      setQuestions(prev => prev.map(q => q._id === id ? updated : q));
      setMyQuestions(prev => prev.map(q => q._id === id ? updated : q));
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };

  const handleDownvote = async (id) => {
    try {
      const res = await axios.post(`/api/questions/${id}/downvote`, {}, config);
      const updated = res.data.question;
      setQuestions(prev => prev.map(q => q._id === id ? updated : q));
      setMyQuestions(prev => prev.map(q => q._id === id ? updated : q));
    } catch (err) {
      console.error('Downvote error:', err);
    }
  };

  const handleReplyVote = async (qId, replyId, type) => {
    try {
      const res = await axios.post(`/api/questions/${qId}/replies/${replyId}/${type}`, {}, config);
      const updated = res.data;
      setQuestions(prev => prev.map(q => q._id === qId ? updated : q));
      setMyQuestions(prev => prev.map(q => q._id === qId ? updated : q));
    } catch (err) {
      console.error('Reply vote error:', err);
    }
  };

  const handleReply = async (qId) => {
    const text = replyTexts[qId];
    if (!text || !text.trim()) return;
    try {
      await axios.post(`/api/questions/${qId}/reply`, { text: text.trim() }, config);
      setReplyTexts({ ...replyTexts, [qId]: '' });
      setShowReply({ ...showReply, [qId]: false });
      refreshAll();
    } catch (err) {
      console.error('Reply error:', err);
    }
  };

  const handleMarkSolution = async (qId, replyId) => {
    try {
      await axios.post(`/api/questions/${qId}/replies/${replyId}/solution`, {}, config);
      refreshAll();
    } catch (err) {
      console.error('Mark solution error:', err);
    }
  };

  const prefillFromSolutionForModal = (question) => {
    if (!question.replies || question.replies.length === 0) return '';
    const solutionReply = question.replies.find(r => r.isSolution);
    if (solutionReply) return solutionReply.text;
    const sorted = [...question.replies].sort((a, b) => b.upvoteCount - a.upvoteCount);
    return sorted[0].text;
  };

  const handlePublishFAQ = async (modalData) => {
    const { id, question, answer, section, customSection } = modalData;
    if (!answer || answer.trim().length === 0) {
      showToast('Please provide an answer before publishing', 'error');
      return;
    }
    const finalSection = customSection || section || 'Community Contribution';
    if (!question || question.trim().length === 0) {
      showToast('Question text cannot be empty', 'error');
      return;
    }

    try {
      await axios.post(`/api/questions/${id}/approve`, { answer, section: finalSection, question: question.trim() }, config);
      showToast('Question approved and added to FAQ directory successfully!');
      setPublishFaqModal(null);
      refreshAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error publishing FAQ', 'error');
    }
  };

  const handleSaveEdit = async (item) => {
    if (!item.text || item.text.trim().length === 0) {
      showToast(`${item.type === 'question' ? 'Question' : 'Reply'} text cannot be empty`, 'error');
      return;
    }
    try {
      if (item.type === 'question') {
        await axios.put(`/api/questions/${item.id}`, { question: item.text.trim() }, config);
        showToast('Question updated successfully!');
      } else {
        await axios.put(`/api/questions/${item.qId}/replies/${item.id}`, { text: item.text.trim() }, config);
        showToast('Reply updated successfully!');
      }
      setEditItemModal(null);
      refreshAll();
    } catch (err) {
      showToast(err.response?.data?.message || `Error updating ${item.type}`, 'error');
    }
  };

  const handleDeleteItem = (item) => {
    const isQ = item.type === 'question';
    setConfirmAction({
      label: 'Delete',
      message: `Are you sure you want to permanently delete this ${item.type}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          if (isQ) {
            await axios.delete(`/api/questions/${item.id}`, config);
            showToast('Question deleted successfully');
          } else {
            await axios.delete(`/api/questions/${item.qId}/replies/${item.id}`, config);
            showToast('Reply deleted successfully');
          }
          setEditItemModal(null);
          refreshAll();
        } catch (err) {
          showToast(err.response?.data?.message || `Error deleting ${item.type}`, 'error');
        }
      }
    });
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const submitReport = async () => {
    if (!reportingItem) return;
    try {
      if (reportingItem.type === 'question') {
        await axios.post(`/api/questions/${reportingItem.id}/report`, { reason: reportReason }, config);
        showToast("Question reported successfully.");
      } else {
        await axios.post(`/api/questions/${reportingItem.qId}/replies/${reportingItem.id}/report`, { reason: reportReason }, config);
        showToast("Reply reported successfully.");
      }
      setReportingItem(null);
      setReportReason('');
      refreshAll();
    } catch (err) {
      console.error("Report error:", err);
      showToast(err.response?.data?.message || "Error submitting report.", "error");
    }
  };

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    const isConfirmingSimilar = pendingSimilarConfirmation;
    setMessage('');

    if (!isConfirmingSimilar) {
      setSimilarQuestions([]);
      setShowSimilar(false);
      setSimilarNotice('');
    }

    try {
      const res = await axios.post(
        '/api/questions',
        { question: newQuestion, confirmSimilar: isConfirmingSimilar },
        config
      );

      if (res.data.requiresConfirmation) {
        setSimilarQuestions(res.data.similarQuestions);
        setShowSimilar(true);
        setSimilarNotice(res.data.message);
        setPendingSimilarConfirmation(true);
      } else {
        setNewQuestion('');
        setSimilarQuestions([]);
        setShowSimilar(false);
        setSimilarNotice('');
        setPendingSimilarConfirmation(false);
        refreshAll();
        setMessage('Question posted successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setSimilarQuestions(err.response.data.similarQuestions || []);
        setShowSimilar(true);
        setSimilarNotice(err.response.data.message || 'This looks like a duplicate, so it was not posted.');
        setPendingSimilarConfirmation(false);
      } else {
        setMessage(err.response?.data?.message || 'Error posting question');
        setTimeout(() => setMessage(''), 3500);
      }
    }
  };

  const handleViewFAQ = async (faqId) => {
    navigate(`/faqs?faq=${faqId}`);
  };

  const canMarkSolution = (q) => {
    const userId = user.id || user._id;
    if (!userId) return false;
    if (user.role === 'admin') return true;
    const authorId = q.createdBy?._id || q.createdBy?.id || q.createdBy;
    const isAuthor = authorId?.toString() === userId.toString();
    return isAuthor && q.status === 'approved';
  };

  const canUnmarkSolution = (q) => {
    const userId = user.id || user._id;
    if (!userId) return false;
    if (user.role === 'admin') return true;
    const authorId = q.createdBy?._id || q.createdBy?.id || q.createdBy;
    const isAuthor = authorId?.toString() === userId.toString();
    return isAuthor && q.status === 'approved';
  };

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text, display: 'flex', flexDirection: 'column', width: '100%' }}>

      {/* Header bar row */}
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
          Discussion Space
        </h1>
        <div style={{ display: 'flex', gap: '0.45rem' }}>
          <FilterPill active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
            All <Badge>{questions.length}</Badge>
          </FilterPill>
          <FilterPill active={activeTab === 'my'} onClick={() => setActiveTab('my')}>
            My Q <Badge>{myQuestions.length}</Badge>
          </FilterPill>
          <FilterPill active={showUnsolvedOnly} onClick={() => setShowUnsolvedOnly(v => !v)} accent={C.warning}>
            Unsolved <Badge>{unsolvedCount}</Badge>
          </FilterPill>
        </div>
      </div>

      <div style={{
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        padding: '0 1rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Post Question Form Card */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <form onSubmit={handlePostQuestion}>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Post a query... Make sure it is not covered in FAQs."
              rows="3"
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                color: C.text,
                padding: '0.85rem 1rem',
                fontSize: '0.9rem',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <div>
                {message && (
                  <span style={{
                    fontSize: '0.85rem',
                    color: message.includes('success') ? C.success : C.danger,
                    fontWeight: 600
                  }}>
                    {message}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {pendingSimilarConfirmation && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingSimilarConfirmation(false);
                      setNewQuestion('');
                      setShowSimilar(false);
                      setSimilarQuestions([]);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      borderRadius: '8px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!newQuestion.trim()}
                  style={{
                    background: newQuestion.trim() ? (pendingSimilarConfirmation ? C.warning : C.accent) : 'var(--bg-surface2)',
                    color: newQuestion.trim() ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${C.border}`,
                    borderRadius: '8px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: newQuestion.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  {pendingSimilarConfirmation ? 'Post Anyway' : 'Post Question'}
                </button>
              </div>
            </div>
          </form>

          {/* Similar question warning */}
          {showSimilar && (
            <div style={{
              marginTop: '1.25rem',
              background: 'rgba(251,191,36,0.06)',
              border: `1px solid rgba(251,191,36,0.25)`,
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <p style={{ color: C.warning, fontSize: '0.85rem', marginBottom: '1rem', marginTop: 0, fontWeight: 700 }}>
                ⚠️ {similarNotice}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {similarQuestions.map((sq) => (
                  <div key={sq.id} style={{
                    background: 'var(--bg-surface2)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    border: `1px solid ${C.border}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '5px',
                        background: sq.type === 'faq' ? 'rgba(99,102,241,0.15)' : 'rgba(52,211,153,0.15)',
                        color: sq.type === 'faq' ? C.accent2 : C.success,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {sq.type === 'faq' ? 'FAQ' : 'Question'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: C.warning, fontWeight: 700 }}>
                        {Math.round(sq.confidence || sq.similarity)}% match
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: C.text, fontStyle: 'italic' }}>
                      "{sq.question}"
                    </p>
                    {sq.type === 'faq' && (
                      <button
                        type="button"
                        onClick={() => handleViewFAQ(sq.id)}
                        style={{
                          marginTop: '0.5rem',
                          background: 'transparent',
                          border: `1px solid ${C.accent2}`,
                          color: C.accent2,
                          borderRadius: '6px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(99,102,241,0.08)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        View FAQ Answer →
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ color: C.muted, fontSize: '0.72rem', marginTop: '1rem', marginBottom: 0 }}>
                Questions with {DUPLICATE_LIMIT}% similarity or more cannot be posted. Lower matches require confirmation to proceed.
              </p>
            </div>
          )}
        </div>

        {/* Empty state */}
        {getDisplayedQuestions().length === 0 && (
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            textAlign: 'center',
            padding: '4rem 2rem',
            color: C.muted,
            fontSize: '0.9rem'
          }}>
            {activeTab === 'my' && !showUnsolvedOnly
              ? "You haven't asked any questions yet."
              : showUnsolvedOnly && activeTab === 'my'
                ? 'You have no unsolved questions!'
                : showUnsolvedOnly
                  ? 'No unsolved questions — all resolved!'
                  : 'No questions in community feed. Start a discussion!'
            }
          </div>
        )}

        {/* Question Feed cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {getDisplayedQuestions().filter(q => isAdmin || (!q.isDeletedByAdmin && !q.isDeleted)).map((q) => (
            <div key={q._id} id={`question-card-${q._id}`} style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              overflow: 'hidden',
              transition: 'all 0.4s ease',
              position: 'relative'
            }}>
              {isAdmin && !q.isDeleted && !q.isDeletedByAdmin && (
                <div style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => {
                      const answerPrefill = prefillFromSolutionForModal(q);
                      setPublishFaqModal({
                        id: q._id,
                        question: q.question,
                        answer: answerPrefill,
                        section: '',
                        customSection: ''
                      });
                    }}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${C.success}`,
                      color: C.success,
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(52,211,153,0.08)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    📖 Publish
                  </button>
                  <button
                    onClick={() => setEditItemModal({ type: 'question', id: q._id, text: q.question })}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${C.accent2}`,
                      color: C.accent2,
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(6,182,212,0.08)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
              {!isAdmin && !q.isDeleted && !q.isDeletedByAdmin && q.createdBy && (q.createdBy._id === (user.id || user._id) || q.createdBy === (user.id || user._id)) && (
                <div style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => handleDeleteItem({ type: 'question', id: q._id })}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${C.danger}`,
                      color: C.danger,
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--danger-soft)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
              {/* Question body card */}
              <div style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                
                {/* Voting Controls column */}
                {!q.isDeleted && !q.isDeletedByAdmin ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '36px' }}>
                    <VoteBtn
                      active={hasUpvoted(q)}
                      onClick={() => handleUpvote(q._id)}
                      label={<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M6 1L1 9h10L6 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>}
                      filledLabel={<svg width="12" height="10" viewBox="0 0 12 10"><path d="M6 1L1 9h10L6 1z" fill="currentColor"/></svg>}
                      activeColor="#22c55e"
                    />
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      margin: '2px 0',
                      color: ((q.upvoteCount || 0) - (q.downvoteCount || 0)) > 0 ? "#22c55e" : ((q.upvoteCount || 0) - (q.downvoteCount || 0)) < 0 ? "#ef4444" : C.muted
                    }}>
                      {(q.upvoteCount || 0) - (q.downvoteCount || 0)}
                    </span>
                    <VoteBtn
                      active={hasDownvoted(q)}
                      onClick={() => handleDownvote(q._id)}
                      label={<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M6 9L1 1h10L6 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>}
                      filledLabel={<svg width="12" height="10" viewBox="0 0 12 10"><path d="M6 9L1 1h10L6 9z" fill="currentColor"/></svg>}
                      activeColor="#ef4444"
                    />
                  </div>
                ) : (
                  <div style={{ minWidth: '36px' }} />
                )}

                {/* Content Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  
                  {/* Row showing status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>

                      
                      {getSimilarityPercent(q) >= 60 && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '5px',
                          background: getSimilarityPercent(q) >= 85 ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                          color: getSimilarityPercent(q) >= 85 ? C.danger : C.warning
                        }}>
                          {getSimilarityPercent(q)}% Match
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: C.text,
                    margin: '0 0 0.75rem 0',
                    lineHeight: 1.5
                  }}>
                    {q.isDeletedByAdmin ? (
                      <>
                        <span style={{ color: C.danger, fontWeight: 700, marginRight: '0.4rem' }}>[Deleted by Admin]</span>
                        <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{q.question}</span>
                      </>
                    ) : q.isDeleted ? (
                      isAdmin ? (
                        <>
                          <span style={{ color: C.danger, fontWeight: 700, marginRight: '0.4rem' }}>[Deleted by Author]</span>
                          <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{q.question}</span>
                        </>
                      ) : (
                        <span style={{ color: C.muted, fontStyle: 'italic', fontWeight: 500 }}>This message was deleted by author</span>
                      )
                    ) : (
                      q.question
                    )}
                  </p>

                  {/* Metadata line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.75rem', color: C.muted }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted2)' }}>
                      {q.createdBy?.name || 'Unknown'}
                    </span>
                    {(() => {
                      const b = getUserBadge(q.createdBy);
                      return (
                        <span style={{
                          background: b.bg,
                          color: b.color,
                          border: `1px solid ${b.border}`,
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {b.name}
                        </span>
                      );
                    })()}
                    <span>•</span>
                    <span>
                      {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span>•</span>
                    <span style={{ color: C.accent }}>
                      {q.replies?.length || 0} {q.replies?.length === 1 ? 'reply' : 'replies'}
                    </span>
                    {!q.isDeleted && !q.isDeletedByAdmin && (
                      <>
                        <span>•</span>
                        <button
                          onClick={() => setReportingItem({ type: 'question', id: q._id })}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: C.danger,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            padding: 0,
                            fontWeight: 500,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = 0.8}
                          onMouseLeave={(e) => e.target.style.opacity = 1}
                        >
                          ⚠️ Report
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* Nested Replies */}
              {q.replies && q.replies.length > 0 && (isAdmin || !q.isDeleted) && (
                (() => {
                  const visibleReplies = sortedReplies(q.replies).filter(reply => isAdmin || !reply.isDeletedByAdmin);
                  if (visibleReplies.length === 0) return null;
                  return (
                    <div style={{
                      borderTop: `1px solid ${C.border}`,
                      background: 'var(--bg-main)',
                      padding: '1.25rem 1.5rem 1.25rem calc(1.5rem + 36px + 1.25rem)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      {visibleReplies.map((reply) => (
                        <div key={reply._id} style={{
                          background: reply.isSolution ? 'rgba(52,211,153,0.04)' : C.surface2,
                          border: `1px solid ${reply.isSolution ? 'rgba(52,211,153,0.25)' : C.border}`,
                          borderRadius: '10px',
                          padding: '0.85rem 1.1rem',
                          boxSizing: 'border-box',
                          position: 'relative'
                        }}>
                          {isAdmin && !reply.isDeleted && !reply.isDeletedByAdmin && (
                            <div style={{
                              position: 'absolute',
                              top: '0.75rem',
                              right: '0.75rem',
                              zIndex: 10
                            }}>
                              <button
                                onClick={() => setEditItemModal({ type: 'reply', id: reply._id, qId: q._id, text: reply.text })}
                                style={{
                                  background: 'transparent',
                                  border: `1px solid ${C.accent2}`,
                                  color: C.accent2,
                                  borderRadius: '6px',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(6,182,212,0.08)'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          )}
                          {!isAdmin && !reply.isDeleted && !reply.isDeletedByAdmin && reply.createdBy && (reply.createdBy._id === (user.id || user._id) || reply.createdBy === (user.id || user._id)) && (
                            <div style={{
                              position: 'absolute',
                              top: '0.75rem',
                              right: '0.75rem',
                              zIndex: 10
                            }}>
                              <button
                                onClick={() => handleDeleteItem({ type: 'reply', id: reply._id, qId: q._id })}
                                style={{
                                  background: 'transparent',
                                  border: `1px solid ${C.danger}`,
                                  color: C.danger,
                                  borderRadius: '6px',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'var(--danger-soft)'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                          {/* Solution Banner */}
                          {reply.isSolution && !reply.isDeleted && !reply.isDeletedByAdmin && (
                            <div style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: C.success,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              marginBottom: '0.4rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              ✓ Verified Solution
                              {reply.markedSolutionBy && (
                                <span style={{ color: C.muted, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                                  • marked by {reply.markedSolutionBy?.name || 'Unknown'} {reply.markedSolutionBy?.role === 'admin' ? '(Admin)' : ''}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <p style={{
                            fontSize: '0.85rem',
                            color: C.text,
                            margin: 0,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {reply.isDeletedByAdmin ? (
                              <>
                                <span style={{ color: C.danger, fontWeight: 700, marginRight: '0.4rem' }}>[Deleted by Admin]</span>
                                <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{reply.text}</span>
                              </>
                            ) : reply.isDeleted ? (
                              isAdmin ? (
                                <>
                                  <span style={{ color: C.danger, fontWeight: 700, marginRight: '0.4rem' }}>[Deleted by Author]</span>
                                  <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{reply.text}</span>
                                </>
                              ) : (
                                <span style={{ color: C.muted, fontStyle: 'italic', fontWeight: 500 }}>This message was deleted by author</span>
                              )
                            ) : (
                              reply.text
                            )}
                          </p>

                          {/* Reply Metadata & Votes */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: C.muted }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted2)' }}>by {reply.createdBy?.name || 'Unknown'}</span>
                            {(() => {
                              const b = getUserBadge(reply.createdBy);
                              return (
                                <span style={{
                                  background: b.bg,
                                  color: b.color,
                                  border: `1px solid ${b.border}`,
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {b.name}
                                </span>
                              );
                            })()}
                            {!reply.isDeleted && !reply.isDeletedByAdmin && (
                              <>
                                <span>•</span>
                                
                                {/* Reply Upvote */}
                                <button
                                  onClick={() => handleReplyVote(q._id, reply._id, 'upvote')}
                                  style={{
                                    background: hasReplyUpvoted(reply) ? 'rgba(34,197,94,0.15)' : 'transparent',
                                    border: `1px solid ${hasReplyUpvoted(reply) ? '#22c55e' : C.border}`,
                                    color: hasReplyUpvoted(reply) ? '#22c55e' : C.muted,
                                    borderRadius: '5px',
                                    padding: '2px 8px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s',
                                    boxShadow: hasReplyUpvoted(reply) ? '0 0 8px rgba(34,197,94,0.2)' : 'none'
                                  }}
                                >
                                  {hasReplyUpvoted(reply)
                                    ? <svg width="10" height="9" viewBox="0 0 12 10"><path d="M6 1L1 9h10L6 1z" fill="currentColor"/></svg>
                                    : <svg width="10" height="9" viewBox="0 0 12 10" fill="none"><path d="M6 1L1 9h10L6 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>
                                  } {reply.upvoteCount || 0}
                                </button>

                                {/* Reply Downvote */}
                                <button
                                  onClick={() => handleReplyVote(q._id, reply._id, 'downvote')}
                                  style={{
                                    background: hasReplyDownvoted(reply) ? 'rgba(239,68,68,0.15)' : 'transparent',
                                    border: `1px solid ${hasReplyDownvoted(reply) ? '#ef4444' : C.border}`,
                                    color: hasReplyDownvoted(reply) ? '#ef4444' : C.muted,
                                    borderRadius: '5px',
                                    padding: '2px 8px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s',
                                    boxShadow: hasReplyDownvoted(reply) ? '0 0 8px rgba(239,68,68,0.2)' : 'none'
                                  }}
                                >
                                  {hasReplyDownvoted(reply)
                                    ? <svg width="10" height="9" viewBox="0 0 12 10"><path d="M6 9L1 1h10L6 9z" fill="currentColor"/></svg>
                                    : <svg width="10" height="9" viewBox="0 0 12 10" fill="none"><path d="M6 9L1 1h10L6 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>
                                  } {reply.downvoteCount || 0}
                                </button>
                                
                                <button
                                  onClick={() => setReportingItem({ type: 'reply', id: reply._id, qId: q._id })}
                                  style={{
                                    background: 'transparent',
                                    border: `1px solid ${C.border}`,
                                    color: C.danger,
                                    borderRadius: '5px',
                                    padding: '2px 8px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s'
                                  }}
                                  onMouseEnter={(e) => { e.target.style.borderColor = C.danger; }}
                                  onMouseLeave={(e) => { e.target.style.borderColor = C.border; }}
                                >
                                  ⚠️ Report
                                </button>

                                {/* Mark Solution Action */}
                                {canMarkSolution(q) && !reply.isSolution && !q.replies.some(r => r.isSolution) && (
                                  <button
                                    onClick={() => handleMarkSolution(q._id, reply._id)}
                                    style={{
                                      marginLeft: 'auto',
                                      background: 'transparent',
                                      border: `1px solid ${C.accent}`,
                                      color: C.accent,
                                      borderRadius: '5px',
                                      padding: '2px 8px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { e.target.style.background = 'rgba(124, 106, 245, 0.15)'; }}
                                    onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                  >
                                    Mark Solution
                                  </button>
                                )}
                                
                                {canUnmarkSolution(q) && reply.isSolution && (
                                  <button
                                    onClick={() => handleMarkSolution(q._id, reply._id)}
                                    style={{
                                      marginLeft: 'auto',
                                      background: 'transparent',
                                      border: `1px solid ${C.danger}`,
                                      color: C.danger,
                                      borderRadius: '5px',
                                      padding: '2px 8px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { e.target.style.background = 'rgba(248, 113, 113, 0.15)'; }}
                                    onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                  >
                                    Unmark Solution
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}

              {/* Add Reply field */}
              {!q.isDeleted && !q.isDeletedByAdmin && (
                <div style={{
                  borderTop: `1px solid ${C.border}`,
                  padding: '0.85rem 1.5rem',
                  display: 'flex',
                  gap: '0.75rem',
                  background: 'var(--bg-surface2)'
                }}>
                  {showReply[q._id] ? (
                    <>
                      <input
                        type="text"
                        value={replyTexts[q._id] || ''}
                        onChange={(e) => setReplyTexts({ ...replyTexts, [q._id]: e.target.value })}
                        placeholder="Type your reply to this question..."
                        style={{
                          flex: 1,
                          background: 'var(--bg-main)',
                          border: `1px solid ${C.border}`,
                          borderRadius: '8px',
                          color: C.text,
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.85rem',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => e.target.style.borderColor = C.accent}
                        onBlur={(e) => e.target.style.borderColor = C.border}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReply(q._id); }}
                      />
                      <button
                        onClick={() => handleReply(q._id)}
                        disabled={!(replyTexts[q._id] || '').trim()}
                        style={{
                          background: (replyTexts[q._id] || '').trim() ? C.accent : 'var(--bg-surface2)',
                          color: (replyTexts[q._id] || '').trim() ? '#fff' : 'var(--text-muted)',
                          border: `1px solid ${C.border}`,
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: (replyTexts[q._id] || '').trim() ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => setShowReply({ ...showReply, [q._id]: false })}
                        style={{
                          background: 'transparent',
                          color: C.muted,
                          border: `1px solid ${C.border}`,
                          borderRadius: '8px',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowReply({ ...showReply, [q._id]: true })}
                      style={{
                        background: 'transparent',
                        color: C.muted,
                        border: `1px solid ${C.border}`,
                        borderRadius: '8px',
                        padding: '0.45rem 1.1rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                      onMouseLeave={(e) => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
                    >
                      + Add reply
                    </button>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
        </div>

      </div>

      {/* Decent Modal for entering report reason */}
      {reportingItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 7, 14, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '16px',
            padding: '1.75rem',
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            boxSizing: 'border-box'
          }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--text-white)'
            }}>
              ⚠️ Report Content
            </h3>
            <p style={{
              margin: '0 0 1.25rem 0',
              fontSize: '0.82rem',
              color: 'var(--text-muted2)',
              lineHeight: 1.4
            }}>
              You are reporting this {reportingItem.type}. Please provide an optional reason below to help our moderation team understand the issue.
            </p>

            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for reporting (optional)..."
              rows="4"
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-card)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                padding: '0.75rem 1rem',
                fontSize: '0.88rem',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '1.25rem',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setReportingItem(null);
                  setReportReason('');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-muted2)',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                style={{
                  background: 'var(--danger)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decent Custom Toast message */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: toast.type === 'error' ? 'var(--danger-soft)' : 'rgba(5, 150, 105, 0.9)',
          border: `1px solid ${toast.type === 'error' ? 'var(--border-danger)' : 'rgba(52, 211, 153, 0.3)'}`,
          color: toast.type === 'error' ? 'var(--danger)' : '#fff',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          zIndex: 1100,
          fontSize: '0.85rem',
          fontWeight: 600,
          pointerEvents: 'none'
        }}>
          {toast.text}
        </div>
      )}

      {/* Inline confirmation modal */}
      {confirmAction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7, 7, 14, 0.75)',
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
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            boxSizing: 'border-box'
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

      {/* Edit Item Modal */}
      {editItemModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7, 7, 14, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✏️</span>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>
                Edit {editItemModal.type === 'question' ? 'Question' : 'Reply'}
              </h2>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted2, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {editItemModal.type === 'question' ? 'Question' : 'Reply'} Text
              </label>
              <textarea
                value={editItemModal.text}
                onChange={(e) => {
                  const text = e.target.value;
                  setEditItemModal(prev => ({ ...prev, text }));
                }}
                rows="4"
                style={{
                  width: '100%',
                  background: 'var(--bg-main)',
                  border: `1px solid ${C.border}`,
                  borderRadius: '8px',
                  color: C.text,
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => handleDeleteItem(editItemModal)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: `1px solid ${C.danger}`,
                  background: 'transparent',
                  color: C.danger,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(248,113,113,0.08)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                🗑️ Delete
              </button>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setEditItemModal(null)}
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
                  onClick={() => handleSaveEdit(editItemModal)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: C.accent,
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish to FAQ Modal */}
      {publishFaqModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7, 7, 14, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📖</span>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>
                Publish Question to FAQ
              </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              {/* Question Text */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted2, marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Edit Question Text
                </label>
                <input
                  type="text"
                  value={publishFaqModal.question}
                  onChange={(e) => setPublishFaqModal(prev => ({ ...prev, question: e.target.value }))}
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
              
              {/* Category selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted2, marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  FAQ Section (Category)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                  <select
                    value={publishFaqModal.section}
                    onChange={(e) => setPublishFaqModal(prev => ({ ...prev, section: e.target.value }))}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'var(--bg-main)',
                      border: `1px solid ${C.border}`,
                      borderRadius: '8px',
                      color: C.text,
                      padding: '0.5rem',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">-- Choose Existing Section --</option>
                    {sections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={publishFaqModal.customSection}
                    onChange={(e) => setPublishFaqModal(prev => ({ ...prev, customSection: e.target.value }))}
                    placeholder="Or write custom category..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'var(--bg-main)',
                      border: `1px solid ${C.border}`,
                      borderRadius: '8px',
                      color: C.text,
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Answer Text */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.muted2, marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Official Answer
                </label>
                <textarea
                  value={publishFaqModal.answer}
                  onChange={(e) => setPublishFaqModal(prev => ({ ...prev, answer: e.target.value }))}
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

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem' }}>
              <button
                onClick={() => setPublishFaqModal(null)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.muted2,
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handlePublishFAQ(publishFaqModal)}
                disabled={!(publishFaqModal.answer || '').trim()}
                style={{
                  background: (publishFaqModal.answer || '').trim() ? C.success : 'var(--bg-surface2)',
                  color: (publishFaqModal.answer || '').trim() ? '#07070e' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: (publishFaqModal.answer || '').trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                Publish to FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components for styling consistency ---

function FilterPill({ active, onClick, children, accent }) {
  const borderCol = active ? (accent || C.accent) : C.border;
  const bgCol = active ? 'var(--bg-active)' : 'var(--bg-surface2)';
  const textCol = active ? (accent || 'var(--accent)') : 'var(--text-muted)';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.45rem 1rem',
        borderRadius: '20px',
        border: `1px solid ${borderCol}`,
        background: bgCol,
        color: textCol,
        fontSize: '0.8rem',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        outline: 'none'
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children }) {
  return (
    <span style={{
      background: 'var(--bg-main)',
      color: 'var(--text-muted2)',
      border: '1px solid var(--border-card)',
      borderRadius: '10px',
      padding: '0 6px',
      fontSize: '0.7rem',
      fontWeight: 700,
      minWidth: '18px',
      textAlign: 'center'
    }}>
      {children}
    </span>
  );
}

function VoteBtn({ active, onClick, label, filledLabel, activeColor }) {
  const activeBg = activeColor === '#22c55e' ? '34,197,94' : '239,68,68';
  return (
    <button
      onClick={onClick}
      title={active ? 'Remove vote' : 'Vote'}
      style={{
        background: active ? `rgba(${activeBg},0.15)` : 'transparent',
        border: `1px solid ${active ? activeColor : C.border}`,
        color: active ? activeColor : '#525166',
        borderRadius: '6px',
        width: '34px',
        height: '28px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        outline: 'none',
        boxShadow: active ? `0 0 10px rgba(${activeBg},0.25)` : 'none'
      }}
      onMouseEnter={(e) => { if (!active) e.target.style.borderColor = activeColor; }}
      onMouseLeave={(e) => { if (!active) e.target.style.borderColor = C.border; }}
    >
      {active ? (filledLabel || label) : label}
    </button>
  );
}

export default Questions;