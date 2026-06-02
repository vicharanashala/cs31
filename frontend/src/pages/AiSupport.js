import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AiSupport() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am Mini Yaksha. Ask me anything about the Vicharanashala Internship program (stipends, timelines, NOC, projects, certificates), and I will scan our official FAQ index to give you an instant response!"
    }
  ]);
  const [input, setInput] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token');

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsgText = input.trim();
    const newMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsgText
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.post('/api/faqs/ask', { question: userMsgText }, config);
      
      let replyText = '';
      let showPostButton = false;
      if (res.data.ok) {
        replyText = `**Based on FAQ ("${res.data.question}") [Confidence: ${res.data.confidence}%]:**\n\n${res.data.answer}`;
      } else {
        replyText = res.data.answer;
        showPostButton = true;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: replyText,
          showPostButton
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: 'An error occurred while reaching Mini Yaksha. Please check your network connection or try again later.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    setInput(suggestionText);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: 'calc(100vh - 4rem)',
      width: '100%',
      maxWidth: '900px',
      margin: '0 auto',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-card)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-surface2)',
        borderBottom: '1px solid var(--border-card)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 8px var(--success)'
        }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-white)' }}>
            Mini Yaksha
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Broadcasting queries to verified Vicharanashala FAQ index
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--bg-main)'
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              width: '100%'
            }}
          >
            <div style={{
              maxWidth: '75%',
              background: msg.sender === 'user' ? 'var(--accent)' : 'var(--bg-surface2)',
              border: msg.sender === 'user' ? 'none' : '1px solid var(--border-card)',
              color: msg.sender === 'user' ? '#fff' : 'var(--text-main)',
              borderRadius: '12px',
              padding: '0.85rem 1.1rem',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              {/* Parse bold tags for bot responses */}
              {msg.text.split('\n\n').map((para, i) => {
                if (para.startsWith('**')) {
                  const parts = para.split('**');
                  return (
                    <p key={i} style={{ margin: i > 0 ? '0.75rem 0 0 0' : 0 }}>
                      <strong>{parts[1]}</strong>{parts[2]}
                    </p>
                  );
                }
                return <p key={i} style={{ margin: i > 0 ? '0.75rem 0 0 0' : 0 }}>{para}</p>;
              })}
            </div>
            {msg.showPostButton && (
              <button
                onClick={() => navigate('/questions')}
                style={{
                  marginTop: '0.5rem',
                  background: 'transparent',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  borderRadius: '8px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                onMouseEnter={(e) => { e.target.style.background = 'var(--bg-active)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
              >
                ❓ Go to Post Questions Page
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'var(--bg-surface2)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '0.85rem 1.1rem',
              color: 'var(--text-muted)',
              fontSize: '0.9rem'
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div style={{
          padding: '0 1.5rem',
          background: 'var(--bg-main)',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.5rem'
        }}>
          {[
            "What is the duration of the internship?",
            "Are these internships paid?",
            "What is Rosetta?",
            "Is NOC compulsory?"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                background: 'var(--bg-active)',
                border: '1px solid var(--border-card)',
                color: 'var(--accent)',
                borderRadius: '20px',
                padding: '0.35rem 0.8rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--bg-active)'; }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} style={{
        background: 'var(--bg-surface2)',
        borderTop: '1px solid var(--border-card)',
        padding: '1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Mini Yaksha..."
          style={{
            flex: 1,
            background: 'var(--bg-main)',
            border: '1px solid var(--border-card)',
            borderRadius: '10px',
            color: 'var(--text-main)',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'inherit'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          style={{
            background: input.trim() ? 'var(--accent)' : 'var(--border-card)',
            color: input.trim() ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '10px',
            padding: '0.75rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default AiSupport;
