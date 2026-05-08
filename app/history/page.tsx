'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { ROUTES, THEME } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useReviewStore } from '@/store/reviewStore';
import { useUIStore } from '@/store/uiStore';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  background: '#070c18',
  surface: '#0d1425',
  surfaceHigh: '#131b2e',
  border: '#2d3449',
  outline: '#474555',
  text: '#dae2fd',
  muted: '#928ea1',
};

const LANGUAGES = ['All', 'JavaScript', 'Python', 'TypeScript', 'Java', 'C++', 'PHP', 'Go', 'Ruby', 'C'];
const STATUS_TABS = ['all', 'pending', 'accepted', 'rejected'];

export default function ReviewHistoryPage() {
  const router = useRouter();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const { 
    reviews, 
    pagination, 
    loading, 
    filters, 
    setFilters, 
    fetchHistory, 
    deleteReview 
  } = useReviewStore();
  const [dataLoaded, setDataLoaded] = useState(false);
  const { showToast } = useUIStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(ROUTES.LOGIN);
      return;
    }

    // Check cache first
    const cached = sessionStorage.getItem('history_cache');
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        useReviewStore.setState({ reviews: cachedData, loading: false });
        setDataLoaded(true);
        return; // Don't fetch again
      } catch {
        // Cache invalid — fetch fresh
      }
    }

    // No cache — fetch from API
    if (token) {
      fetchHistory(token).then(() => {
        setDataLoaded(true);
        const updatedReviews = useReviewStore.getState().reviews;
        sessionStorage.setItem('history_cache', JSON.stringify(updatedReviews));
      });
    }
  }, [token, isAuthenticated, _hasHydrated, router, fetchHistory]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      const matchesFilter = 
        filters.status === 'all' || 
        review.status?.toLowerCase() === filters.status.toLowerCase();
      const matchesLanguage =
        !filters.language || filters.language === 'all' ||
        review.language?.toLowerCase() === filters.language.toLowerCase();
      return matchesFilter && matchesLanguage;
    });
  }, [reviews, filters.status, filters.language]);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const days = Math.floor(diffInHours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async (review_id: number) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    if (!token) return;

    const success = await deleteReview(review_id, token);
    if (success) {
      showToast('Review deleted successfully', 'success');
      
      // Clear cache so next visit refetches
      sessionStorage.removeItem('history_cache');
      
      // Update local state is handled by store's deleteReview already, 
      // but we need to update the cache with the new state
      const updated = reviews.filter(r => r.review_id !== review_id);
      sessionStorage.setItem('history_cache', JSON.stringify(updated));
    } else {
      showToast('Failed to delete review', 'error');
    }
  };

  return (
    <div className="min-h-screen font-poppins" style={{ backgroundColor: T.background, color: T.text }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .msym {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
        }

        .tab-btn {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid ${T.border};
          background: ${T.surfaceHigh};
          color: ${T.muted};
          font-family: 'Poppins', sans-serif;
          text-transform: capitalize;
        }

        .tab-btn.active {
          background: #6d5bff;
          color: #ffffff;
          border-color: #6d5bff;
          box-shadow: 0 0 15px rgba(109, 91, 255, 0.4);
        }

        .lang-dropdown {
          background: transparent;
          border: none;
          color: #ffffff;
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }

        .history-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (max-width: 900px) {
          .history-grid {
            grid-template-columns: 1fr;
          }
        }

        .review-card {
          background: ${T.surface};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 12px 18px;
          position: relative;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .review-card:hover {
          border-color: #6d5bff;
          background: #111a2e;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .delete-icon {
          color: ${T.outline};
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          border-radius: 6px;
        }

        .delete-icon:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .suggestion-title {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-family: 'Poppins', sans-serif;
        }

        .meta-text {
          font-size: 10px;
          color: ${T.muted};
          font-weight: 500;
          opacity: 0.6;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .review-btn {
          background: #6d5bff20;
          border: 1px solid #6d5bff40;
          color: #c6c0ff;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Poppins', sans-serif;
        }

        .review-btn:hover {
          background: #6d5bff;
          color: #ffffff;
          border-color: #6d5bff;
          box-shadow: 0 4px 12px rgba(109, 91, 255, 0.4);
        }
      `}</style>

      <Navbar />

      <main style={{ 
        maxWidth: 1350, 
        marginLeft: '40px', 
        marginRight: '40px', 
        padding: '24px 0' 
      }}>
        
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 4, fontFamily: 'Poppins' }}>Review History</h1>
          <p style={{ color: T.muted, fontSize: 13 }}>Track your code analysis sessions and improvements</p>
        </header>

        <section style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: 24, 
          flexWrap: 'wrap', 
          gap: 16 
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUS_TABS.map(tab => (
              <button 
                key={tab} 
                className={`tab-btn ${filters.status === tab ? 'active' : ''}`}
                onClick={() => setFilters({ status: tab })}
              >
                {tab === 'all' ? 'All Suggestions' : tab}
              </button>
            ))}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            background: T.surfaceHigh, 
            padding: '5px 12px', 
            borderRadius: '8px', 
            border: `1px solid ${T.border}` 
          }}>
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>Language:</span>
            <select 
              className="lang-dropdown"
              value={filters.language}
              onChange={(e) => setFilters({ language: e.target.value })}
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang.toLowerCase()}>{lang}</option>
              ))}
            </select>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          {(!_hasHydrated || (loading && !dataLoaded)) ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="msym" style={{ fontSize: 32, color: '#6d5bff', animation: 'spin 2s linear infinite' }}>sync</div>
              <p style={{ marginTop: 12, color: T.muted }}>Fetching history...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div style={{ 
              padding: '100px 24px', 
              textAlign: 'center', 
              background: T.surface, 
              borderRadius: 20,
              border: `1px dashed ${T.border}`
            }}>
              <span className="msym" style={{ fontSize: 50, color: T.border, marginBottom: 16 }}>history</span>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#dae2fd', marginBottom: 6 }}>No history found</h3>
              <p style={{ color: T.muted, fontSize: 14 }}>Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="history-grid">
              {filteredReviews.map(item => (
                <div key={item.review_id} className="review-card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge 
                        label={item.status.toUpperCase()} 
                        variant={item.status.toLowerCase() as any}
                      />
                      <span className="meta-text">{getTimeAgo(item.created_at)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge 
                        label={(item.severity || 'LOW').toUpperCase()} 
                        variant={(item.severity || 'low').toLowerCase() as any}
                      />
                      <span 
                        className="msym delete-icon" 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.review_id); }}
                      >
                        delete
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: -2 }}>
                    <Badge label={item.language} variant="project" />
                  </div>

                  <div style={{ flex: 1, marginTop: 12 }}>
                    <h3 className="suggestion-title">{item.suggestion}</h3>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button 
                      className="review-btn"
                      onClick={() => router.push(`/review/${item.parent_review_id}/diff?suggestion_id=${item.review_id}`)}
                    >
                      Review →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!loading && pagination && pagination.totalPages > 1 && (
          <div style={{ paddingTop: 16 }}>
            <Pagination 
              currentPage={filters.page} 
              totalPages={pagination.totalPages} 
              onPageChange={(newPage) => {
                setFilters({ page: newPage });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              transparent={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}
