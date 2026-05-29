import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Questions() {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [showReply, setShowReply] = useState({});
  const [message, setMessage] = useState('');
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [showSimilar, setShowSimilar] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const config = { headers: { 'x-auth-token': token } };

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('/api/questions', config);
      setQuestions(res.data);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    setSimilarQuestions([]);
    setShowSimilar(false);
    
    try {
      const res = await axios.post('/api/questions', { question: newQuestion }, config);
      
      if (res.data.hasMatch) {
        setSimilarQuestions(res.data.similarQuestions);
        setShowSimilar(true);
        setNewQuestion('');
        fetchQuestions();
      } else {
        setNewQuestion('');
        fetchQuestions();
        setMessage('Question posted successfully!');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error posting question');
    }
    
    setTimeout(() => {
      setMessage('');
      setSimilarQuestions([]);
      setShowSimilar(false);
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

  const hasUpvoted = (question) => {
    return question.upvotes?.some(u => u._id === user.id || u === user.id);
  };

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
              }}
              placeholder="Type your question here..."
              rows="3"
              required
              style={{ borderRadius: '8px', padding: '0.75rem' }}
            />
          </div>
          <button type="submit" className="btn" style={{ background: 'white', color: '#667eea', width: 'auto' }}>
            Post Question
          </button>
        </form>
        
        {showSimilar && similarQuestions.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.95)', borderRadius: '8px', color: '#333' }}>
            <strong>⚠️ Similar questions found (your question was still posted):</strong>
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
                      {sq.type === 'faq' ? '📖 FAQ' : '❓ Student Q'} — {sq.similarity}% match
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0' }}>"{sq.question}"</p>
                </div>
              ))}
            </div>
            <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: 0 }}>
              Check if these answer your question before posting a new one.
            </p>
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Student Questions ({questions.length})</h2>
      
      {questions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          No questions yet. Be the first to ask!
        </div>
      ) : (
        questions.map((q) => (
          <div key={q._id} className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #667eea' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{q.question}</p>
                <small style={{ color: '#888' }}>
                  Posted by {q.createdBy?.name || 'Unknown'} • {new Date(q.createdAt).toLocaleDateString()}
                </small>
                {q.similarity > 0.3 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 8px', 
                      background: q.similarity > 0.7 ? '#ffebee' : '#fff3e0',
                      color: q.similarity > 0.7 ? '#c62828' : '#e65100',
                      borderRadius: '12px'
                    }}>
                      {Math.round(q.similarity * 100)}% similar to existing {q.similarTo ? 'question' : 'FAQ'}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center', marginLeft: '1rem' }}>
                <button 
                  onClick={() => handleUpvote(q._id)}
                  style={{ 
                    background: hasUpvoted(q) ? '#4CAF50' : '#f0f0f0',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  ▲
                </button>
                <div style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>{q.upvoteCount || 0}</div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #ddd' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Replies ({q.replies?.length || 0})</h4>
              
              {q.replies?.map((reply, idx) => (
                <div key={idx} style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#f9f9f9', borderRadius: '4px' }}>
                  <p style={{ margin: 0 }}>{reply.text}</p>
                  <small style={{ color: '#888' }}>
                    — {reply.createdBy?.name || 'Unknown'}
                  </small>
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