import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';

const HIGHLIGHT_MESSAGE = 'Showing the FAQ that looks similar to your question.';

function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Simulated state for helpful counts and clicked status
  const [helpfulVotes, setHelpfulVotes] = useState({});
  const [helpfulClicked, setHelpfulClicked] = useState({});

  const highlightedFaqId = searchParams.get('faq');

  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = storedUser.role === 'admin';

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
    fetchSections();
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [selectedSection, search, highlightedFaqId]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await axios.delete(`/api/faqs/${id}`, { headers: { 'x-auth-token': token } });
      setMessage('FAQ deleted successfully.');
      fetchFAQs();
    } catch (err) {
      setMessage('Error deleting FAQ');
    }
    setTimeout(() => setMessage(''), 3000);
  };

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

  // Helper to generate consistent views count
  const getViews = (id) => {
    const code = id ? id.charCodeAt(id.length - 1) + id.charCodeAt(0) : 42;
    return 100 + (code % 250);
  };

  // Helper to generate consistent initial helpful count
  const getHelpfulCount = (id) => {
    if (helpfulVotes[id] !== undefined) return helpfulVotes[id];
    const code = id ? id.charCodeAt(id.length - 2) || 12 : 12;
    const initialVal = 10 + (code % 110);
    setHelpfulVotes(prev => ({ ...prev, [id]: initialVal }));
    return initialVal;
  };

  const handleHelpfulClick = (id) => {
    if (helpfulClicked[id]) {
      // Toggle off
      setHelpfulVotes(prev => ({ ...prev, [id]: prev[id] - 1 }));
      setHelpfulClicked(prev => ({ ...prev, [id]: false }));
    } else {
      // Toggle on
      setHelpfulVotes(prev => ({ ...prev, [id]: prev[id] + 1 }));
      setHelpfulClicked(prev => ({ ...prev, [id]: true }));
    }
  };

  const getTagsForSection = (section) => {
    const sec = (section || 'General').toLowerCase();
    if (sec.includes('stipend') || sec.includes('perk') || sec.includes('pay')) return ['#stipend', '#perks', '#payout'];
    if (sec.includes('tech') || sec.includes('stack') || sec.includes('tool')) return ['#techstack', '#react', '#node'];
    if (sec.includes('duration') || sec.includes('time') || sec.includes('date') || sec.includes('timeline')) return ['#duration', '#timeline', '#academic'];
    if (sec.includes('noc')) return ['#noc', '#college', '#approval'];
    if (sec.includes('selection') || sec.includes('offer') || sec.includes('cert')) return ['#selection', '#certificate', '#offerletter'];
    if (sec.includes('conduct') || sec.includes('communication') || sec.includes('slack')) return ['#conduct', '#slack', '#channels'];
    if (sec.includes('rosetta') || sec.includes('journal')) return ['#rosetta', '#journal', '#learning'];
    return ['#general', '#internship', '#faq'];
  };

  const getSectionBadgeColor = (section) => {
    const sec = (section || 'General').toLowerCase();
    if (sec.includes('stipend') || sec.includes('perk')) return { text: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' }; // Stipend
    if (sec.includes('tech')) return { text: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' }; // Tech
    if (sec.includes('apply') || sec.includes('process')) return { text: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)' }; // Process
    if (sec.includes('noc')) return { text: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' }; // NOC
    return { text: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' }; // General / Other
  };

  // Helper to parse question prefix (e.g. "1.2 What is...") for numerical sorting
  const parseQuestionNumber = (q) => {
    const match = q.match(/^(\d+)\.(\d+)/);
    if (match) {
      return [parseInt(match[1], 10), parseInt(match[2], 10)];
    }
    return [99, 99];
  };

  // Sort FAQs numerically by prefix so they render in correct cohort order
  const sortedFaqs = [...faqs].sort((a, b) => {
    const [aSec, aQ] = parseQuestionNumber(a.question);
    const [bSec, bQ] = parseQuestionNumber(b.question);
    if (aSec !== bSec) return aSec - bSec;
    return aQ - bQ;
  });

  return (
    <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
      
      {/* Title Header Row */}
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
          Dynamic FAQ Directory
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => navigate('/ai-support')}
            style={{
              background: 'transparent',
              border: '1px solid #7c6af5',
              color: '#7c6af5',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(124, 106, 245, 0.1)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
          >
            💬 Open Mini Yaksha
          </button>
          <span style={{ fontSize: '1.25rem', color: '#7a7990', cursor: 'pointer' }} title="FAQ Documentation">📖</span>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: message.includes('Error') ? '#3c1e1e' : 'rgba(52, 211, 153, 0.08)',
          border: `1px solid ${message.includes('Error') ? '#7c1f1f' : 'rgba(52, 211, 153, 0.25)'}`,
          color: message.includes('Error') ? '#f87171' : '#34d399',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem'
        }}>
          <span>{message}</span>
          {highlightedFaqId && (
            <button
              type="button"
              onClick={clearHighlightedFAQ}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: '6px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                marginLeft: '1rem'
              }}
            >
              Show all FAQs
            </button>
          )}
        </div>
      )}

      {/* Search Input Box */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <span style={{
          position: 'absolute',
          left: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#7a7990',
          fontSize: '1rem'
        }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search verified FAQ index..."
          value={search}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            padding: '0.85rem 1rem 0.85rem 2.75rem',
            borderRadius: '12px',
            border: '1px solid #1f1b3c',
            background: '#0d0c1b',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#7c6af5'}
          onBlur={(e) => e.target.style.borderColor = '#1f1b3c'}
        />
      </div>

      {/* Categories chips filter */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          display: 'block',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: '#525166',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem'
        }}>
          Categories
        </span>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSearchParams({}); setSelectedSection(''); }}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '20px',
              border: selectedSection === '' ? '1px solid #7c6af5' : '1px solid #1f1b3c',
              background: selectedSection === '' ? 'rgba(124, 106, 245, 0.15)' : '#0d0c1b',
              color: selectedSection === '' ? '#a78bfa' : '#8f8eaf',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            All
          </button>
          {sections.map(section => {
            const isSelected = selectedSection === section;
            return (
              <button
                key={section}
                onClick={() => { setSearchParams({}); setSelectedSection(section); setSearch(''); }}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #7c6af5' : '1px solid #1f1b3c',
                  background: isSelected ? 'rgba(124, 106, 245, 0.15)' : '#0d0c1b',
                  color: isSelected ? '#a78bfa' : '#8f8eaf',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                {section}
              </button>
            );
          })}
        </div>
      </div>

      {search && (
        <h4 style={{ color: '#8f8eaf', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Search results for "{search}" ({faqs.length})
        </h4>
      )}

      {/* FAQs Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
        {sortedFaqs.length === 0 ? (
          <div style={{
            background: '#121026',
            border: '1px solid #1f1b3c',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#7a7990',
            fontSize: '0.9rem'
          }}>
            No FAQs found matching the selected filters.
          </div>
        ) : (
          sortedFaqs.map((faq) => {
            const colors = getSectionBadgeColor(faq.section);
            const isHelpful = helpfulClicked[faq._id];
            return (
              <div
                key={faq._id}
                style={{
                  background: '#121026',
                  border: faq._id === highlightedFaqId ? '1px solid #34d399' : '1px solid #1f1b3c',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                  position: 'relative',
                  boxShadow: faq._id === highlightedFaqId ? '0 0 15px rgba(52, 211, 153, 0.1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (faq._id !== highlightedFaqId) {
                    e.currentTarget.style.borderColor = '#2e2a5e';
                  }
                }}
                onMouseLeave={(e) => {
                  if (faq._id !== highlightedFaqId) {
                    e.currentTarget.style.borderColor = '#1f1b3c';
                  }
                }}
              >
                {/* Category Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    color: colors.text,
                    background: colors.bg
                  }}>
                    {faq.section || 'General'}
                  </span>
                  
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDelete(faq._id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = 1}
                      onMouseLeave={(e) => e.target.style.opacity = 0.7}
                      title="Delete FAQ"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {/* Question */}
                <h3 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.4
                }}>
                  {faq.question}
                </h3>

                {/* Answer */}
                <p style={{
                  margin: '0 0 1.25rem 0',
                  fontSize: '0.9rem',
                  color: '#b4b3c8',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {faq.answer}
                </p>

                {/* Tags Row */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {getTagsForSection(faq.section).map(tag => (
                    <span key={tag} style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: '0.78rem',
                      color: '#6366f1',
                      fontWeight: 600
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer Metadata & Helpful count */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #1f1b3c',
                  paddingTop: '1rem',
                  fontSize: '0.78rem',
                  color: '#7a7990'
                }}>
                  <span>{getViews(faq._id)} views</span>

                  <button
                    onClick={() => handleHelpfulClick(faq._id)}
                    style={{
                      background: isHelpful ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: isHelpful ? '1px solid #6366f1' : '1px solid transparent',
                      color: isHelpful ? '#a5b4fc' : '#7a7990',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { if(!isHelpful) e.target.style.color = '#fff'; }}
                    onMouseLeave={(e) => { if(!isHelpful) e.target.style.color = '#7a7990'; }}
                  >
                    👍 Helpful ({getHelpfulCount(faq._id)})
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

export default FAQ;
