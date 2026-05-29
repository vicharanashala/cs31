import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
    } catch (err) {
      setMessage('Error deleting FAQ');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="container">
      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Questions ({pendingQuestions.length})
        </button>
        <button 
          className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved FAQs ({approvedQuestions.length})
        </button>
      </div>

      {activeTab === 'pending' && (
        <>
          <h2 style={{ marginBottom: '1rem' }}>Pending Questions</h2>
          {pendingQuestions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#666' }}>
              No pending questions. All caught up!
            </div>
          ) : (
            pendingQuestions.map((q) => (
              <div key={q._id} className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #ffa500' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{q.question}</p>
                <small style={{ color: '#888' }}>
                  Posted by {q.createdBy?.name || 'Unknown'} • {new Date(q.createdAt).toLocaleDateString()}
                </small>
                
                <div style={{ marginTop: '1rem' }}>
                  <label><strong>Answer for FAQ:</strong></label>
                  <textarea
                    value={answer[q._id] || ''}
                    onChange={(e) => setAnswer({ ...answer, [q._id]: e.target.value })}
                    placeholder="Write the answer to be added to FAQ..."
                    rows="3"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  />
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleApprove(q._id)}
                  >
                    ✓ Approve & Add to FAQ
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleReject(q._id)}
                  >
                    ✕ Reject
                  </button>
                </div>

                <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.85rem' }}>
                  Upvotes: {q.upvoteCount || 0}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {activeTab === 'approved' && (
        <>
          <h2 style={{ marginBottom: '1rem' }}>Approved FAQs</h2>
          {approvedQuestions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#666' }}>
              No FAQs yet.
            </div>
          ) : (
            approvedQuestions.map((faq) => (
              <div key={faq._id} className="card" style={{ marginBottom: '1rem' }}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: '#888' }}>
                    Added {new Date(faq.createdAt).toLocaleDateString()}
                  </small>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteFAQ(faq._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;