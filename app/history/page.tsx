'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import { ROUTES, MESSAGES } from '@/lib/constants';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  background:               '#0b1326',
  surfaceContainerLowest:   '#060e20',
  surfaceContainerLow:      '#131b2e',
  surfaceContainerHigh:     '#222a3d',
  surfaceContainerHighest:  '#2d3449',
  onSurface:                '#dae2fd',
  onSurfaceVariant:         '#c8c4d8',
  outline:                  '#928ea1',
  outlineVariant:           '#474555',
  primary:                  '#c6c0ff',
  primaryContainer:         '#6d5bff',
  onPrimaryContainer:       '#fffeff',
  secondary:                '#a6e6ff',
  error:                    '#ffb4ab',
  errorContainer:           '#93000a',
  success:                  '#34d399',
  warning:                  '#fbbf24',
};

const LANGUAGES = ['All', 'JavaScript', 'Python', 'TypeScript', 'Java', 'C++', 'PHP', 'Go', 'Ruby', 'C'];
const STATUS_TABS = ['All Suggestions', 'Accepted', 'Pending', 'Rejected'];

interface Suggestion {
  suggestion_id: number;
  suggestion: string;
  severity: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_accepted: number;
  created_at: string;
  review_id: number;
  language: string;
}

export default function ReviewHistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All Suggestions');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ── Auth & Data Fetching ────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(ROUTES.LOGIN);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (activeTab !== 'All Suggestions') queryParams.append('status', activeTab.toLowerCase());
        if (selectedLanguage !== 'All') queryParams.append('language', selectedLanguage.toLowerCase());

        const res = await fetch(`/api/review/history?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setSuggestions(data.suggestions || []);
        } else {
          setToast({ message: data.message || MESSAGES.ERROR.SERVER_ERROR, type: 'error' });
        }
      } catch (err) {
        setToast({ message: 'Network error occurred', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [activeTab, selectedLanguage, router]);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return { bg: '#7f1d1d', text: '#fca5a5' };
      case 'high': return { bg: '#9a3412', text: '#fdba74' };
      case 'medium': return { bg: '#854d0e', text: '#fde047' };
      case 'low': return { bg: '#1e293b', text: '#94a3b8' };
      default: return { bg: T.surfaceContainerHighest, text: T.onSurfaceVariant };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return T.success;
      case 'pending': return T.warning;
      case 'rejected': return T.error;
      default: return T.outline;
    }
  };

  const handleDelete = async (review_id: number) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/review/${review_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setSuggestions(prev => prev.filter(s => s.review_id !== review_id));
      } else {
        setToast({ message: data.message || 'Failed to delete review', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error occurred', type: 'error' });
    }
  };

  return (
    <div style={{ backgroundColor: T.background, color: T.onSurface, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .msym {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
        }

        .pill-tab {
          padding: 8px 20px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid ${T.surfaceContainerHighest};
          background: transparent;
          color: ${T.outline};
          font-family: 'Poppins', sans-serif;
        }

        .pill-tab.active {
          background: ${T.primaryContainer};
          color: ${T.onPrimaryContainer};
          border-color: ${T.primaryContainer};
          box-shadow: 0 4px 12px ${T.primaryContainer}40;
        }

        .pill-tab:hover:not(.active) {
          border-color: ${T.outline};
          color: ${T.onSurface};
        }

        .lang-dropdown {
          background: ${T.surfaceContainerLow};
          border: 1px solid ${T.outlineVariant}40;
          color: ${T.onSurfaceVariant};
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          min-width: 160px;
        }

        .review-card {
          background: ${T.surfaceContainerLow};
          border: 1px solid ${T.surfaceContainerHighest}40;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: transform 0.2s, border-color 0.2s;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }

        .review-card:hover {
          border-color: ${T.outlineVariant}80;
          transform: translateY(-2px);
        }

        .status-border {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
        }

        .review-btn {
          padding: 8px 20px;
          border-radius: 8px;
          border: 1px solid ${T.outlineVariant};
          background: transparent;
          color: ${T.onSurface};
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Poppins', sans-serif;
        }

        .review-btn:hover {
          background: ${T.surfaceContainerHigh};
          border-color: ${T.outline};
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: ${T.outline};
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .delete-btn:hover {
          color: ${T.error};
          background: ${T.errorContainer}40;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
        
        {/* 1. PAGE HEADER */}
        <header style={{ marginBottom: 40 }}>
          <h1 style={{ 
            fontFamily: "'Poppins', sans-serif", 
            fontSize: 32, 
            fontWeight: 700, 
            color: '#ffffff',
            marginBottom: 4
          }}>
            Review History
          </h1>
          <p style={{ color: T.outline, fontSize: 14 }}>
            Showing your code review suggestions
          </p>
        </header>

        {/* 2. FILTER TABS ROW */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {STATUS_TABS.map(tab => (
              <button 
                key={tab} 
                className={`pill-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: T.outline, fontWeight: 500 }}>Language</span>
            <select 
              className="lang-dropdown"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </section>

        {/* 3. REVIEW CARDS LIST */}
        <section>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="msym" style={{ fontSize: 40, color: T.primary, animation: 'spin 2s linear infinite' }}>sync</div>
              <p style={{ marginTop: 12, color: T.outline }}>Loading your history...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{ 
              padding: '80px 20px', 
              textAlign: 'center', 
              background: T.surfaceContainerLow, 
              borderRadius: 24,
              border: `1px dashed ${T.surfaceContainerHighest}`
            }}>
              <span className="msym" style={{ fontSize: 64, color: T.outlineVariant, marginBottom: 20, opacity: 0.5 }}>history</span>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: T.onSurfaceVariant, marginBottom: 8 }}>No suggestions found</h3>
              <p style={{ color: T.outline, fontSize: 14 }}>Try changing your filters or start a new code review.</p>
            </div>
          ) : (
            suggestions.map(item => (
              <div key={item.suggestion_id} className="review-card">
                <div className="status-border" style={{ backgroundColor: getStatusColor(item.status) }} />
                
                {/* LEFT SIDE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge 
                      label={item.status.toUpperCase()} 
                      variant={item.status.toLowerCase() as any}
                    />
                    <span style={{ fontSize: 12, color: T.outline }}>
                      {getTimeAgo(item.created_at)}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: T.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.language}
                  </div>

                  <h3 style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: '#ffffff', 
                    margin: '4px 0',
                    lineHeight: 1.4,
                    maxWidth: '90%'
                  }}>
                    {item.suggestion}
                  </h3>
                </div>

                {/* RIGHT SIDE */}
                <div style={{ 
                  paddingLeft: 24, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end', 
                  justifyContent: 'space-between', 
                  alignSelf: 'stretch', 
                  gap: 16 
                }}>
                  {/* Top Row: Severity + Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      padding: '4px 10px', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      fontWeight: 700, 
                      letterSpacing: '0.05em',
                      backgroundColor: getSeverityColor(item.severity).bg,
                      color: getSeverityColor(item.severity).text,
                    }}>
                      {item.severity?.toUpperCase() || 'UNKNOWN'}
                    </div>
                    <button 
                      onClick={() => handleDelete(item.review_id)}
                      className="delete-btn msym"
                      title="Delete review"
                    >
                      delete
                    </button>
                  </div>

                  {/* Bottom Row: Review */}
                  <button 
                    className="review-btn"
                    onClick={() => router.push('/review/' + item.review_id + '/diff')}
                  >
                    Review →
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
