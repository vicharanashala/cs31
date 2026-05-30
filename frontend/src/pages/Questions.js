import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DUPLICATE_LIMIT = 85;

// --- Color tokens (AI Studio inspired dark theme matching FAQ page) ---
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

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const config = { headers: { 'x-auth-token': token } };
  const navigate = useNavigate();

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

  const refreshAll = () => {
    fetchQuestions();
    fetchMyQuestions();
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
  const hasUpvoted = (q) => q.upvotes?.some(u => u._id === user.id || u === user.id);
  const hasDownvoted = (q) => q.downvotes?.some(u => u._id === user.id || u === user.id);

  const hasReplyUpvoted = (reply) => reply.upvotes?.some(u => u._id === user.id || u === user.id);
  const hasReplyDownvoted = (reply) => reply.downvotes?.some(u => u._id === user.id || u === user.id);

  const sortedReplies = (replies) => [...(replies || [])].sort((a, b) => {
    if (a.isSolution && !b.isSolution) return -1;
    if (!a.isSolution && b.isSolution) return 1;
    return (b.upvoteCount || 0) - (a.upvoteCount || 0);
  });

  const getSimilarityPercent = (q) => q.similarityPercent || Math.round((q.similarity || 0) * 100);

  // --- Handlers ---
  const handleUpvote = async (id) => {
    try {
      await axios.post(`/api/questions/${id}/upvote`, {}, config);
      refreshAll();
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };

  const handleDownvote = async (id) => {
    try {
      await axios.post(`/api/questions/${id}/downvote`, {}, config);
      refreshAll();
    } catch (err) {
      console.error('Downvote error:', err);
    }
  };

  const handleReplyVote = async (qId, replyId, type) => {
    try {
      await axios.post(`/api/questions/${qId}/replies/${replyId}/${type}`, {}, config);
      refreshAll();
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

  // --- Permission helpers ---
  const canMarkSolution = (q) => {
    if (!user.id) return false;
    const authorId = q.createdBy?._id || q.createdBy;
    const isAuthor = authorId === user.id;
    return (user.role === 'admin' || isAuthor) && q.status === 'approved';
  };

  const canUnmarkSolution = (q) => {
    if (!user.id) return false;
    return user.role === 'admin' && q.status === 'approved';
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
          color: '#fff',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          Post Questions
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

      <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto' }}>

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
                background: '#0d0c1b',
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
                    background: newQuestion.trim() ? (pendingSimilarConfirmation ? C.warning : C.accent) : '#1e1b38',
                    color: newQuestion.trim() ? '#fff' : '#525166',
                    border: 'none',
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
                    background: 'rgba(7, 7, 14, 0.4)',
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
          {getDisplayedQuestions().map((q) => (
            <div key={q._id} style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              {/* Question body card */}
              <div style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                
                {/* Voting Controls column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '36px' }}>
                  <VoteBtn
                    active={hasUpvoted(q)}
                    onClick={() => handleUpvote(q._id)}
                    label="▲"
                    activeColor={C.success}
                  />
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    margin: '2px 0',
                    color: ((q.upvoteCount || 0) - (q.downvoteCount || 0)) > 0 ? C.success : ((q.upvoteCount || 0) - (q.downvoteCount || 0)) < 0 ? C.danger : C.muted
                  }}>
                    {(q.upvoteCount || 0) - (q.downvoteCount || 0)}
                  </span>
                  <VoteBtn
                    active={hasDownvoted(q)}
                    onClick={() => handleDownvote(q._id)}
                    label="▼"
                    activeColor={C.danger}
                  />
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  
                  {/* Row showing status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {q.status && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background:
                            q.status === 'pending' ? 'rgba(251,191,36,0.1)' :
                            q.status === 'rejected' ? 'rgba(248,113,113,0.1)' :
                            'rgba(52,211,153,0.1)',
                          color:
                            q.status === 'pending' ? C.warning :
                            q.status === 'rejected' ? C.danger :
                            C.success
                        }}>
                          {q.status}
                        </span>
                      )}
                      
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
                    {q.question}
                  </p>

                  {/* Metadata line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.75rem', color: C.muted }}>
                    <span style={{ fontWeight: 600, color: '#9f9eaf' }}>
                      {q.createdBy?.name || 'Unknown'}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span>•</span>
                    <span style={{ color: C.accent }}>
                      {q.replies?.length || 0} {q.replies?.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>

                </div>
              </div>

              {/* Nested Replies */}
              {q.replies && q.replies.length > 0 && (
                <div style={{
                  borderTop: `1px solid ${C.border}`,
                  background: 'rgba(7, 6, 14, 0.4)',
                  padding: '1.25rem 1.5rem 1.25rem calc(1.5rem + 36px + 1.25rem)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {sortedReplies(q.replies).map((reply) => (
                    <div key={reply._id} style={{
                      background: reply.isSolution ? 'rgba(52,211,153,0.04)' : C.surface2,
                      border: `1px solid ${reply.isSolution ? 'rgba(52,211,153,0.25)' : C.border}`,
                      borderRadius: '10px',
                      padding: '0.85rem 1.1rem',
                      boxSizing: 'border-box'
                    }}>
                      {/* Solution Banner */}
                      {reply.isSolution && (
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
                        {reply.text}
                      </p>

                      {/* Reply Metadata & Votes */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: C.muted }}>
                        <span style={{ fontWeight: 600, color: '#9f9eaf' }}>by {reply.createdBy?.name || 'Unknown'}</span>
                        <span>•</span>
                        
                        {/* Reply Upvote */}
                        <button
                          onClick={() => handleReplyVote(q._id, reply._id, 'upvote')}
                          style={{
                            background: hasReplyUpvoted(reply) ? 'rgba(52,211,153,0.1)' : 'transparent',
                            border: `1px solid ${hasReplyUpvoted(reply) ? C.success : C.border}`,
                            color: hasReplyUpvoted(reply) ? C.success : C.muted,
                            borderRadius: '5px',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s'
                          }}
                        >
                          ▲ {reply.upvoteCount || 0}
                        </button>
                        
                        {/* Reply Downvote */}
                        <button
                          onClick={() => handleReplyVote(q._id, reply._id, 'downvote')}
                          style={{
                            background: hasReplyDownvoted(reply) ? 'rgba(248,113,113,0.1)' : 'transparent',
                            border: `1px solid ${hasReplyDownvoted(reply) ? C.danger : C.border}`,
                            color: hasReplyDownvoted(reply) ? C.danger : C.muted,
                            borderRadius: '5px',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s'
                          }}
                        >
                          ▼ {reply.downvoteCount || 0}
                        </button>

                        {/* Mark Solution Action */}
                        {canMarkSolution(q) && !reply.isSolution && (
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
                            onClick={() => handleMarkSolution(q._id, reply._id)} // Toggle route behaves like unmark when called on active solution
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
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Reply field */}
              <div style={{
                borderTop: `1px solid ${C.border}`,
                padding: '0.85rem 1.5rem',
                display: 'flex',
                gap: '0.75rem',
                background: 'rgba(7, 6, 14, 0.2)'
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
                        background: '#0d0c1b',
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
                        background: (replyTexts[q._id] || '').trim() ? C.accent : '#1e1b38',
                        color: (replyTexts[q._id] || '').trim() ? '#fff' : '#525166',
                        border: 'none',
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

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// --- Sub-components for styling consistency ---

function FilterPill({ active, onClick, children, accent }) {
  const borderCol = active ? (accent || C.accent) : C.border;
  const bgCol = active ? `rgba(124, 106, 245, 0.15)` : '#0d0c1b';
  const textCol = active ? (accent || '#a78bfa') : '#8f8eaf';

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
      background: 'rgba(255,255,255,0.08)',
      color: '#8f8eaf',
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

function VoteBtn({ active, onClick, label, activeColor }) {
  const activeBg = activeColor === '#34d399' ? '52,211,153' : '248,113,113';
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `rgba(${activeBg},0.12)` : 'transparent',
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
        outline: 'none'
      }}
      onMouseEnter={(e) => { if (!active) e.target.style.borderColor = activeColor; }}
      onMouseLeave={(e) => { if (!active) e.target.style.borderColor = C.border; }}
    >
      {label}
    </button>
  );
}

export default Questions;