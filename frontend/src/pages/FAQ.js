import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [formData, setFormData] = useState({ question: '', answer: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ question: '', answer: '' });
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');
  const config = { headers: { 'x-auth-token': token } };

  const fetchFAQs = async () => {
    try {
      const res = await axios.get('/api/faqs');
      setFaqs(res.data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/faqs', formData, config);
      setFormData({ question: '', answer: '' });
      setMessage('FAQ added successfully!');
      fetchFAQs();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error adding FAQ');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await axios.delete(`/api/faqs/${id}`, config);
      setMessage('FAQ deleted.');
      fetchFAQs();
    } catch (err) {
      setMessage('Error deleting FAQ');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const startEdit = (faq) => {
    setEditingId(faq._id);
    setEditData({ question: faq.question, answer: faq.answer });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ question: '', answer: '' });
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`/api/faqs/${id}`, editData, config);
      setEditingId(null);
      setEditData({ question: '', answer: '' });
      setMessage('FAQ updated!');
      fetchFAQs();
    } catch (err) {
      setMessage('Error updating FAQ');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="container">
      {message && (
        <div className={`alert ${message.includes('Error') || message.includes('deleted') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {/* Add FAQ Form */}
      <div className="faq-form">
        <h3>➕ Add New FAQ</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Question</label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Enter question..."
              required
            />
          </div>
          <div className="form-group">
            <label>Answer</label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Enter answer..."
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
            Add FAQ
          </button>
        </form>
      </div>

      {/* FAQ List */}
      <h2 style={{ marginBottom: '1rem' }}>All FAQs ({faqs.length})</h2>
      {faqs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          No FAQs yet. Add one above!
        </div>
      ) : (
        faqs.map((faq) => (
          <div key={faq._id} className="faq-item">
            {editingId === faq._id ? (
              <>
                <div className="form-group">
                  <input
                    type="text"
                    value={editData.question}
                    onChange={(e) => setEditData({ ...editData, question: e.target.value })}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <textarea
                    value={editData.answer}
                    onChange={(e) => setEditData({ ...editData, answer: e.target.value })}
                  />
                </div>
                <div className="faq-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => saveEdit(faq._id)}>
                    Save
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
                <div className="faq-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(faq)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(faq._id)}>
                    🗑️ Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default FAQ;