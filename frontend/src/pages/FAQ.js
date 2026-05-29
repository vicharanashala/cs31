import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const HIGHLIGHT_MESSAGE = 'Showing the FAQ that looks similar to your question.';

function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const highlightedFaqId = searchParams.get('faq');

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
      if (highlightedFaqId) {
        const res = await axios.get(`/api/faqs/${highlightedFaqId}`);
        setFaqs([res.data]);
        setMessage(HIGHLIGHT_MESSAGE);
        return;
      }

      if (message === HIGHLIGHT_MESSAGE) setMessage('');

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
  }, [selectedSection, search, highlightedFaqId]);

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
    if (highlightedFaqId) setSearchParams({});
    setSearch(e.target.value);
    setSelectedSection('');
  };

  const clearHighlightedFAQ = () => {
    setSearchParams({});
    setMessage('');
    setSearch('');
    setSelectedSection('');
  };

  return (
    <div className="container">
      <div style={{
        background: 'linear-gradient(135deg, #23233a 0%, #1a1a2e 100%)',
        border: '1px solid #2e2e4a',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        color: 'white'
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
          {highlightedFaqId && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={clearHighlightedFAQ}
              style={{ marginLeft: '1rem', width: 'auto' }}
            >
              Show all FAQs
            </button>
          )}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search FAQs..."
          value={search}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #2e2e4a',
            background: '#1a1a2e',
            color: '#e2e8f0',
            fontSize: '0.9rem',
            outline: 'none',
            marginBottom: '1rem',
            boxSizing: 'border-box'
          }}
        />
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectedSection === '' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setSearchParams({}); setSelectedSection(''); }}
            style={{ padding: '0.5rem 1rem' }}
          >
            All
          </button>
          {sections.map(section => (
            <button
              key={section}
              className={`btn ${selectedSection === section ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setSearchParams({}); setSelectedSection(section); setSearch(''); }}
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
              borderBottom: `2px solid ${'#2e2e4a'}`,
              color: '#e2e8f0'
            }}>
              {section}
            </h2>
            {sectionFaqs.map((faq) => (
              <div
                key={faq._id}
                className="faq-item"
                style={faq._id === highlightedFaqId ? {
                  borderLeft: '4px solid #34d399',
                  background: 'rgba(52,211,153,0.06)'
                } : undefined}
              >
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
