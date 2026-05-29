import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DUPLICATE_LIMIT = 85;

function Questions() {
  const [questions, setQuestions] = useState([]);
  const [myQuestions, setMyQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'
  const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false);
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

  useEffect(() => {
    refreshAll();
  }, []);

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
    
    setTimeout(() => {
      setMessage('');
    }, 8000);
  };

  const handleUpvote = async (questionId) => {
    try {
      const res = await axios.post(`/api/questions/${questionId}/upvote`, {}, config);
      setQuestions(questions.map(q => 
        q._id === questionId ? res.data.question : q
      ));
    } catch (err) {
      console.error('Error upvoting:', err);
    }
  };

  const handleDownvote = async (questionId) => {
    try {
      const res = await axios.post(`/api/questions/${questionId}/downvote`, {}, config);
      setQuestions(questions.map(q =>
        q._id === questionId ? res.data.question : q
      ));
    } catch (err) {
      console.error('Error downvoting:', err);
    }
  };

  const handleReply = async (questionId) => {
    const text = replyTexts[questionId];
    if (!text || !text.trim()) return;
    
    try {
      const res = await axios.post(`/api/questions/${questionId}/reply`, { text }, config);
      setQuestions(questions.map(q => 
        q._id === questionId ? res.data : q
      ));
      setReplyTexts({ ...replyTexts, [questionId]: '' });
      setShowReply({ ...showReply, [questionId]: false });
    } catch (err) {
      console.error('Error adding reply:', err);
    }
  };

  const handleReplyVote = async (questionId, replyId, voteType) => {
    try {
      const res = await axios.post(`/api/questions/${questionId}/replies/${replyId}/${voteType}`, {}, config);
      setQuestions(questions.map(q => q._id === questionId ? res.data : q));
      setMyQuestions(myQuestions.map(q => q._id === questionId ? res.data : q));
    } catch (err) {
      console.error(`Error ${voteType} reply:`, err);
    }
  };

  const handleMarkSolution = async (questionId, replyId) => {
    try {
      const res = await axios.post(`/api/questions/${questionId}/replies/${replyId}/solution`, {}, config);
      setQuestions(questions.map(q => q._id === questionId ? res.data : q));
      setMyQuestions(myQuestions.map(q => q._id === questionId ? res.data : q));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error marking solution');
    }
  };

  const hasUpvoted = (question) => {
    return question.upvotes?.some(u => u._id === user.id || u === user.id);
  };

  const hasDownvoted = (question) => {
    return question.downvotes?.some(u => u._id === user.id || u === user.id);
  };

  const hasReplyUpvoted = (reply) => {
    return reply.upvotes?.some(u => u._id === user.id || u === user.id);
  };

  const hasReplyDownvoted = (reply) => {
    return reply.downvotes?.some(u => u._id === user.id || u === user.id);
  };

  const canMarkSolution = (question) => {
    const askerId = question.createdBy?._id || question.createdBy;
    return askerId === user.id || user.role === 'admin';
  };

  const canUnmarkSolution = (question) => {
    return user.role === 'admin';
  };

  const getSimilarityPercent = (question) => {
    if (question.similarityPercent) return question.similarityPercent;
    return Math.round((question.similarity || 0) * 100);
  };

  const getMatchConfidence = (match) => match.confidence || match.similarity || 0;
  const hasBlockingDuplicate = showSimilar && similarQuestions.some(
    (match) => getMatchConfidence(match) > DUPLICATE_LIMIT
  );

  const handleViewFAQ = (faqId) => {
    navigate(`/faqs?faq=${faqId}`);
  };

  const sortedReplies = (replies = []) => [...replies].sort((a, b) => {
    if (a.isSolution && !b.isSolution) return -1;
    if (!a.isSolution && b.isSolution) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return (
    <div className="container">
      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h3>Post a Question</h3>
        <p style={{ opacity: 0.9, fontSize: '0.9rem', marginBottom: '1rem' }}>
          Your question will be visible to other students. If it gets {">"}3 upvotes, it may be added to the FAQ.
        </p>
        <form onSubmit={handlePostQuestion}>
          <div className="form-group">
            <textarea
              value={newQuestion}
              onChange={(e) => {
                setNewQuestion(e.target.value);
                setSimilarQuestions([]);
                setShowSimilar(false);
                setSimilarNotice('');
                setPendingSimilarConfirmation(false);
              }}
              placeholder="Type your question here..."
              rows="3"
              required
              style={{ borderRadius: '8px', padding: '0.75rem' }}
            />
          </div>
          <button
            type="submit"
            className="btn"
            disabled={hasBlockingDuplicate}
            style={{
              background: hasBlockingDuplicate ? '#ddd' : 'white',
              color: hasBlockingDuplicate ? '#777' : '#667eea',
              cursor: hasBlockingDuplicate ? 'not-allowed' : 'pointer',
              width: 'auto'
            }}
          >
            {pendingSimilarConfirmation ? 'Post Anyway' : 'Post Question'}
          </button>
        </form>
        
        {showSimilar && similarQuestions.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.95)', borderRadius: '8px', color: '#333' }}>
            <strong>{similarNotice || 'Similar questions found.'}</strong>
            <div style={{ marginTop: '0.75rem' }}>
              {similarQuestions.map((sq, idx) => (
                <div key={idx} style={{ 
                  padding: '0.75rem', 
                  background: sq.type === 'faq' ? '#e3f2fd' : '#f5f5f5', 
                  borderRadius: '4px', 
                  marginBottom: '0.5rem',
                  borderLeft: `4px solid ${sq.type === 'faq' ? '#2196F3' : '#4CAF50'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: sq.type === 'faq' ? '#1976D2' : '#388E3C' }}>
                      {sq.type === 'faq' ? 'FAQ' : 'Student Q'} - {getMatchConfidence(sq)}% match
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0' }}>"{sq.question}"</p>
                  {sq.reasons?.length > 0 && (
                    <small style={{ color: '#666' }}>{sq.reasons.slice(0, 2).join(', ')}</small>
                  )}
                  {sq.type === 'faq' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleViewFAQ(sq.id)}
                      style={{ marginTop: '0.5rem', width: 'auto' }}
                    >
                      View FAQ
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: 0 }}>
              Matches above {DUPLICATE_LIMIT}% cannot be posted. Lower matches need one more click after review.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Student Questions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'all' ? 'bold' : 'normal',
              background: activeTab === 'all' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'all' ? 'white' : '#333',
              transition: 'all 0.2s'
            }}
          >
            All ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'my' ? 'bold' : 'normal',
              background: activeTab === 'my' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'my' ? 'white' : '#333',
              transition: 'all 0.2s'
            }}
          >
            My Questions ({myQuestions.length})
          </button>
          {activeTab === 'all' && (
            <button
              onClick={() => setShowUnsolvedOnly(v => !v)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: showUnsolvedOnly ? 'bold' : 'normal',
                background: showUnsolvedOnly ? '#f39c12' : '#e0e0e0',
                color: showUnsolvedOnly ? 'white' : '#333',
                transition: 'all 0.2s'
              }}
            >
              Unsolved {!showUnsolvedOnly && `(Show)`}
            </button>
          )}
        </div>
      </div>
      
      {getDisplayedQuestions().length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          {activeTab === 'my'
            ? "You haven't asked any questions yet."
            : showUnsolvedOnly
              ? 'No unsolved questions — all have been answered!'
              : 'No questions yet. Be the first to ask!'
          }
        </div>
      ) : (
        getDisplayedQuestions().map((q) => (
          <div key={q._id} className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${q.status === 'pending' ? '#f39c12' : q.status === 'rejected' ? '#e74c3c' : '#667eea'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                {activeTab === 'my' && q.status && (
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.7rem',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    marginBottom: '0.4rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    background: q.status === 'pending' ? '#fff3e0' : q.status === 'rejected' ? '#ffebee' : '#e8f5e9',
                    color: q.status === 'pending' ? '#e65100' : q.status === 'rejected' ? '#c62828' : '#2e7d32'
                  }}>
                    {q.status}
                  </span>
                )}
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{q.question}</p>
                <small style={{ color: '#888' }}>
                  {q.createdBy?.name || 'Unknown'} • {new Date(q.createdAt).toLocaleDateString()} • {q.replies?.length || 0} {(q.replies?.length || 0) === 1 ? 'reply' : 'replies'}
                </small>
                {getSimilarityPercent(q) >= 60 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 8px', 
                      background: getSimilarityPercent(q) >= 85 ? '#ffebee' : '#fff3e0',
                      color: getSimilarityPercent(q) >= 85 ? '#c62828' : '#e65100',
                      borderRadius: '12px'
                    }}>
                      {getSimilarityPercent(q)}% similar to existing {q.similarToType === 'question' ? 'question' : 'FAQ'}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center', marginLeft: '1rem', minWidth: '64px' }}>
                <button 
                  onClick={() => handleUpvote(q._id)}
                  style={{ 
                    background: hasUpvoted(q) ? '#4CAF50' : '#f0f0f0',
                    border: 'none',
                    borderRadius: '6px',
                    width: '44px',
                    height: '34px',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    marginBottom: '0.25rem'
                  }}
                >
                  ▲
                </button>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {(q.upvoteCount || 0) - (q.downvoteCount || 0)}
                </div>
                <button
                  onClick={() => handleDownvote(q._id)}
                  style={{
                    background: hasDownvoted(q) ? '#e57373' : '#f0f0f0',
                    border: 'none',
                    borderRadius: '6px',
                    width: '44px',
                    height: '34px',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  ▼
                </button>
                <small style={{ display: 'block', color: '#888', marginTop: '0.35rem' }}>
                  {q.upvoteCount || 0} / {q.downvoteCount || 0}
                </small>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #ddd' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Replies ({q.replies?.length || 0})</h4>
              
              {sortedReplies(q.replies).map((reply) => (
                <div
                  key={reply._id}
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: reply.isSolution ? '#f1fff4' : '#f9f9f9',
                    borderRadius: '4px',
                    borderLeft: reply.isSolution ? '4px solid #4CAF50' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      {reply.isSolution && (
                        <>
                          <strong style={{ display: 'block', color: '#2e7d32', marginBottom: '0.35rem' }}>
                            ✓ Solution
                          </strong>
                          {reply.markedSolutionBy && (
                            <small style={{ color: '#888', display: 'block', marginBottom: '0.35rem' }}>
                              marked by {reply.markedSolutionBy?.name || 'Unknown'}{reply.markedSolutionBy?.role === 'admin' ? ' (Admin)' : ''}
                            </small>
                          )}
                        </>
                      )}
                      <p style={{ margin: 0 }}>{reply.text}</p>
                      <small style={{ color: '#888' }}>
                        by {reply.createdBy?.name || 'Unknown'}
                      </small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleReplyVote(q._id, reply._id, 'upvote')}
                        style={{
                          width: 'auto',
                          background: hasReplyUpvoted(reply) ? '#4CAF50' : '#f0f0f0',
                          color: hasReplyUpvoted(reply) ? 'white' : '#333'
                        }}
                      >
                        ▲ {reply.upvoteCount || 0}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleReplyVote(q._id, reply._id, 'downvote')}
                        style={{
                          width: 'auto',
                          background: hasReplyDownvoted(reply) ? '#e57373' : '#f0f0f0',
                          color: hasReplyDownvoted(reply) ? 'white' : '#333'
                        }}
                      >
                        ▼ {reply.downvoteCount || 0}
                      </button>
                      {canMarkSolution(q) && !reply.isSolution && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleMarkSolution(q._id, reply._id)}
                          style={{ width: 'auto' }}
                        >
                          Mark Solution
                        </button>
                      )}
                      {canUnmarkSolution(q) && reply.isSolution && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleMarkSolution(q._id, reply._id)}
                          style={{ width: 'auto' }}
                        >
                          Unmark Solution
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {showReply[q._id] ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <textarea
                    value={replyTexts[q._id] || ''}
                    onChange={(e) => setReplyTexts({ ...replyTexts, [q._id]: e.target.value })}
                    placeholder="Write a reply..."
                    rows="2"
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                  />
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => handleReply(q._id)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Submit Reply
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowReply({ ...showReply, [q._id]: false })}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowReply({ ...showReply, [q._id]: true })}
                  style={{ marginTop: '0.5rem' }}
                >
                  Add Reply
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Questions;
