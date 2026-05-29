import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DUPLICATE_LIMIT = 85;

// --- Color tokens (AI Studio inspired dark theme) ---
const C = {
  bg: '#0f0f1a',          // page background
  surface: '#1a1a2e',     // card / panel background
  surface2: '#23233a',    // elevated surface (hover, reply bg)
  border: '#2e2e4a',      // borders / dividers
  accent: '#7c6af5',      // primary accent (purple)
  accent2: '#5b8dee',     // secondary accent (blue)
  success: '#34d399',     // solution / approved
  warning: '#fbbf24',     // pending / unsolved
  danger: '#f87171',      // rejected / error
  text: '#e2e8f0',        // primary text
  muted: '#6b7280',       // secondary text / metadata
  muted2: '#9ca3af',      // slightly brighter muted
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
  const hasUpvoted = (q) => q.upvotes?.includes(user.id);
  const hasDownvoted = (q) => q.downvotes?.includes(user.id);

  const hasReplyUpvoted = (reply) => reply.upvotes?.includes(user.id);
  const hasReplyDownvoted = (reply) => reply.downvotes?.includes(user.id);

  const sortedReplies = (replies) => [...(replies || [])].sort((a, b) => {
    if (a.isSolution && !b.isSolution) return -1;
    if (!a.isSolution && b.isSolution) return 1;
    return (b.upvoteCount || 0) - (a.upvoteCount || 0);
  });

  const getSimilarityPercent = (q) => q.similarityPercent || Math.round((q.similarity || 0) * 100);

  // --- Handlers ---
  const handleUpvote = async (id) => {
    try {
      const res = await axios.post(`/api/questions/${id}/vote`, { type: 'upvote' }, config);
      refreshAll();
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };

  const handleDownvote = async (id) => {
    try {
      const res = await axios.post(`/api/questions/${id}/vote`, { type: 'downvote' }, config);
      refreshAll();
    } catch (err) {
      console.error('Downvote error:', err);
    }
  };

  const handleReplyVote = async (qId, replyId, type) => {
    try {
      const res = await axios.post(`/api/questions/${qId}/replies/${replyId}/vote`, { type }, config);
      refreshAll();
    } catch (err) {
      console.error('Reply vote error:', err);
    }
  };

  const handleReply = async (qId) => {
    const text = replyTexts[qId];
    if (!text || !text.trim()) return;
    try {
      await axios.post(`/api/questions/${qId}/replies`, { text: text.trim() }, config);
      setReplyTexts({ ...replyTexts, [qId]: '' });
      setShowReply({ ...showReply, [qId]: false });
      refreshAll();
    } catch (err) {
      console.error('Reply error:', err);
    }
  };

  const handleMarkSolution = async (qId, replyId) => {
    try {
      const res = await axios.post(`/api/questions/${qId}/mark-solution`, { replyId }, config);
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
      } else if (res.data.hasMatch) {
        setNewQuestion('');
        setSimilarQuestions([]);
        setShowSimilar(false);
        setSimilarNotice('');
        setPendingSimilarConfirmation(false);
        refreshAll();
        setMessage('Question posted successfully!');
      } else {
        setNewQuestion('');
        setSimilarNotice('');
        setPendingSimilarConfirmation(false);
        refreshAll();
        setMessage('Question posted successfully!');
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setSimilarQuestions(err.response.data.similarQuestions || []);
        setShowSimilar(true);
        setSimilarNotice(err.response.data.message || 'This looks like a duplicate, so it was not posted.');
        setPendingSimilarConfirmation(false);
      } else {
        setMessage(err.response?.data?.message || 'Error posting question');
      }
    }
  };

  const handleViewFAQ = async (faqId) => {
    navigate(`/faq?id=${faqId}`);
  };

  // --- Permission helpers ---
  const canMarkSolution = (q) => {
    if (!user.id) return false;
    const isAuthor = q.createdBy?._id === user.id || q.createdBy === user.id;
    return (user.role === 'admin' || isAuthor) && q.status === 'approved';
  };

  const canUnmarkSolution = (q) => {
    if (!user.id) return false;
    return user.role === 'admin' && q.status === 'approved';
  };

  // --- Render ---
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Segoe UI', 'Inter', sans-serif" }}>

      {/* Page header bar */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ width: '3px', height: '24px', background: `linear-gradient(to bottom, ${C.accent}, ${C.accent2})`, borderRadius: '2px' }} />
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: C.text, letterSpacing: '-0.01em' }}>
          Student Questions
        </h2>
        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
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

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Post question */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <form onSubmit={handlePostQuestion}>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question..."
              rows="2"
              style={{
                width: '100%',
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderRadius: '8px',
                color: C.text,
                padding: '0.75rem',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
              {message && (
                <span style={{
                  fontSize: '0.82rem',
                  color: message.includes('success') || message.includes('successfully') ? C.success : C.danger,
                  fontWeight: 500
                }}>
                  {message}
                </span>
              )}
              <button
                type="submit"
                disabled={!newQuestion.trim()}
                style={{
                  marginLeft: 'auto',
                  background: newQuestion.trim() ? C.accent : C.border,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: newQuestion.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
              Post Question
              </button>
            </div>
          </form>

          {/* Similar question warning */}
          {showSimilar && (
            <div style={{
              marginTop: '1rem',
              background: '#2a1a0a',
              border: `1px solid #5a3a10`,
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <p style={{ color: C.warning, fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                {similarNotice}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {similarQuestions.map((sq) => (
                  <div key={sq.id} style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    border: `1px solid ${C.border}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '10px',
                        background: sq.type === 'faq' ? 'rgba(59,130,246,0.2)' : 'rgba(52,211,153,0.2)',
                        color: sq.type === 'faq' ? '#60a5fa' : C.success,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {sq.type === 'faq' ? 'FAQ' : 'Q'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: C.muted2, fontWeight: 600 }}>
                        {Math.round(sq.percent)}% match
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: C.muted2 }}>"{sq.question}"</p>
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
                          padding: '0.3rem 0.75rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        View FAQ →
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ color: C.muted, fontSize: '0.75rem', marginTop: '0.75rem', marginBottom: 0 }}>
                {DUPLICATE_LIMIT}%+ matches cannot be posted. Lower matches need one more click.
              </p>
            </div>
          )}
        </div>

        {/* Empty state */}
        {getDisplayedQuestions().length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: C.muted,
            fontSize: '0.9rem'
          }}>
            {activeTab === 'my' && !showUnsolvedOnly
              ? "You haven't asked any questions yet."
              : showUnsolvedOnly && activeTab === 'my'
                ? 'You have no unsolved questions!'
                : showUnsolvedOnly
                  ? 'No unsolved questions — all answered!'
                  : 'No questions yet. Be the first to ask!'
            }
          </div>
        )}

        {/* Question list */}
        {getDisplayedQuestions().map((q) => (
          <div key={q._id} style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            marginBottom: '1rem',
            overflow: 'hidden'
          }}>
            {/* Question body */}
            <div style={{ padding: '1.1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {/* Vote column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '36px' }}>
                <VoteBtn
                  active={hasUpvoted(q)}
                  onClick={() => handleUpvote(q._id)}
                  label="▲"
                  activeColor={C.success}
                />
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
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

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Status badge (My Q tab) */}
                {activeTab === 'my' && q.status && (
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.68rem',
                    padding: '2px 9px',
                    borderRadius: '10px',
                    marginBottom: '0.4rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background:
                      q.status === 'pending' ? 'rgba(251,191,36,0.15)' :
                      q.status === 'rejected' ? 'rgba(248,113,113,0.15)' :
                      'rgba(52,211,153,0.15)',
                    color:
                      q.status === 'pending' ? C.warning :
                      q.status === 'rejected' ? C.danger :
                      C.success
                  }}>
                    {q.status}
                  </span>
                )}

                <p style={{ fontSize: '0.95rem', fontWeight: 500, color: C.text, margin: '0 0 0.4rem 0', lineHeight: 1.5 }}>
                  {q.question}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: C.muted }}>
                    {q.createdBy?.name || 'Unknown'}
                  </span>
                  <span style={{ color: C.border }}>·</span>
                  <span style={{ fontSize: '0.75rem', color: C.muted }}>
                    {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ color: C.border }}>·</span>
                  <span style={{ fontSize: '0.75rem', color: C.muted }}>
                    {q.replies?.length || 0} {q.replies?.length === 1 ? 'reply' : 'replies'}
                  </span>

                  {getSimilarityPercent(q) >= 60 && (
                    <>
                      <span style={{ color: C.border }}>·</span>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        background: getSimilarityPercent(q) >= 85 ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                        color: getSimilarityPercent(q) >= 85 ? C.danger : C.warning
                      }}>
                        {getSimilarityPercent(q)}% similar to {q.similarToType === 'question' ? 'Q' : 'FAQ'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Replies section */}
            {q.replies && q.replies.length > 0 && (
              <div style={{
                borderTop: `1px solid ${C.border}`,
                background: 'rgba(0,0,0,0.15)',
                padding: '0.75rem 1.25rem 0.75rem calc(1.25rem + 36px + 1rem)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sortedReplies(q.replies).map((reply) => (
                    <div key={reply._id} style={{
                      background: reply.isSolution ? 'rgba(52,211,153,0.08)' : C.surface2,
                      border: `1px solid ${reply.isSolution ? 'rgba(52,211,153,0.3)' : C.border}`,
                      borderRadius: '8px',
                      padding: '0.7rem 0.9rem'
                    }}>
                      {reply.isSolution && (
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: C.success,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginBottom: '0.3rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <span style={{ fontSize: '0.8rem' }}>✓</span> Solution
                          {reply.markedSolutionBy && (
                            <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                              — marked by {reply.markedSolutionBy?.name || 'Unknown'}
                              {reply.markedSolutionBy?.role === 'admin' ? ' (Admin)' : ''}
                            </span>
                          )}
                        </div>
                      )}
                      <p style={{ fontSize: '0.85rem', color: C.text, margin: 0, lineHeight: 1.5 }}>{reply.text}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: C.muted }}>by {reply.createdBy?.name || 'Unknown'}</span>
                        <span style={{ color: C.border }}>·</span>
                        <button
                          onClick={() => handleReplyVote(q._id, reply._id, 'upvote')}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${hasReplyUpvoted(reply) ? C.success : C.border}`,
                            color: hasReplyUpvoted(reply) ? C.success : C.muted,
                            borderRadius: '5px',
                            padding: '1px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s'
                          }}
                        >
                          ▲ {reply.upvoteCount || 0}
                        </button>
                        <button
                          onClick={() => handleReplyVote(q._id, reply._id, 'downvote')}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${hasReplyDownvoted(reply) ? C.danger : C.border}`,
                            color: hasReplyDownvoted(reply) ? C.danger : C.muted,
                            borderRadius: '5px',
                            padding: '1px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s'
                          }}
                        >
                          ▼ {reply.downvoteCount || 0}
                        </button>
                        {canMarkSolution(q) && !reply.isSolution && (
                          <button
                            onClick={() => handleMarkSolution(q._id, reply._id)}
                            style={{
                              marginLeft: 'auto',
                              background: 'transparent',
                              border: `1px solid ${C.accent}`,
                              color: C.accent,
                              borderRadius: '5px',
                              padding: '1px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
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
                              padding: '1px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            Unmark Solution
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply toggle */}
            <div style={{
              borderTop: `1px solid ${C.border}`,
              padding: '0.6rem 1.25rem',
              display: 'flex',
              gap: '0.5rem'
            }}>
              {showReply[q._id] ? (
                <>
                  <input
                    type="text"
                    value={replyTexts[q._id] || ''}
                    onChange={(e) => setReplyTexts({ ...replyTexts, [q._id]: e.target.value })}
                    placeholder="Write a reply..."
                    style={{
                      flex: 1,
                      background: C.surface2,
                      border: `1px solid ${C.border}`,
                      borderRadius: '8px',
                      color: C.text,
                      padding: '0.5rem 0.75rem',
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
                    style={{
                      background: C.accent,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
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
                      padding: '0.5rem 0.75rem',
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
                    padding: '0.4rem 1rem',
                    fontSize: '0.8rem',
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
  );
}

// --- Sub-components ---

function FilterPill({ active, onClick, children, accent }) {
  const C2 = {
    bg: '#1a1a2e',
    border: '#2e2e4a',
    accent: accent || '#7c6af5',
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.3rem 0.8rem',
        borderRadius: '20px',
        border: `1px solid ${active ? C2.accent : C2.border}`,
        background: active ? `rgba(124,106,245,0.15)` : C2.bg,
        color: active ? C2.accent : '#9ca3af',
        fontSize: '0.78rem',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap'
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
      color: '#9ca3af',
      borderRadius: '10px',
      padding: '0 6px',
      fontSize: '0.7rem',
      fontWeight: 600,
      minWidth: '20px',
      textAlign: 'center'
    }}>
      {children}
    </span>
  );
}

function VoteBtn({ active, onClick, label, activeColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `rgba(${activeColor === '#34d399' ? '52,211,153' : '248,113,113'},0.15)` : 'transparent',
        border: `1px solid ${active ? activeColor : '#2e2e4a'}`,
        color: active ? activeColor : '#6b7280',
        borderRadius: '6px',
        width: '36px',
        height: '28px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  );
}

export default Questions;