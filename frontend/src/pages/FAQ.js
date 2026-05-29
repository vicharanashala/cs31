import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');

  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = storedUser.role === 'admin';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '👋' };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌆' };
    return { text: 'Good Night', emoji: '🌙' };
  };

  const greeting = getGreeting();

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('/api/auth/me', { headers: { 'x-auth-token': token } });
      setUserName(res.data.user.name);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await axios.get('/api/faqs/sections');
      setSections(res.data);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const fetchFAQs = async () => {
    try {
      const params = {};
      if (selectedSection) params.section = selectedSection;
      if (search) params.search = search;
      
      const res = await axios.get('/api/faqs', { params });
      setFaqs(res.data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [selectedSection, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await axios.delete(`/api/faqs/${id}`, { headers: { 'x-auth-token': token } });
      setMessage('FAQ deleted.');
      fetchFAQs();
    } catch (err) {
      setMessage('Error deleting FAQ');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const groupedFaqs = faqs.reduce((acc, faq) => {
    const section = faq.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(faq);
    return acc;
  }, {});

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setSelectedSection('');
  };

  return (
    <div className="container">
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
      }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          {greeting.text}, {userName || storedUser.name} {greeting.emoji}
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.95, margin: 0 }}>
          Welcome to your samagama.
        </p>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="🔍 Search FAQs..."
          value={search}
          onChange={handleSearchChange}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '1rem' }}
        />
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectedSection === '' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedSection('')}
            style={{ padding: '0.5rem 1rem' }}
          >
            All
          </button>
          {sections.map(section => (
            <button
              key={section}
              className={`btn ${selectedSection === section ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setSelectedSection(section); setSearch(''); }}
              style={{ padding: '0.5rem 1rem' }}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      {search && (
        <h2 style={{ marginBottom: '1rem' }}>
          Search results for "{search}" ({faqs.length})
        </h2>
      )}

      {Object.keys(groupedFaqs).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          No FAQs found.
        </div>
      ) : (
        Object.entries(groupedFaqs).map(([section, sectionFaqs]) => (
          <div key={section} style={{ marginBottom: '2rem' }}>
            <h2 style={{ 
              marginBottom: '1rem', 
              paddingBottom: '0.5rem', 
              borderBottom: '2px solid #1a1a2e',
              color: '#1a1a2e'
            }}>
              {section}
            </h2>
            {sectionFaqs.map((faq) => (
              <div key={faq._id} className="faq-item">
                <h3>{faq.question}</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{faq.answer}</p>
                {isAdmin && (
                  <div className="faq-actions">
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(faq._id)}>
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default FAQ;