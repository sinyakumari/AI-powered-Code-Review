'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { MESSAGES, FINAL_CODE, ROUTES, COMMIT } from '@/lib/constants';

interface Suggestion {
  suggestion_id: number;
  suggestion: string;
  severity: string;
  suggested_code: string;
  is_accepted: number;
  status: string;
}

interface Review {
  review_id: number;
  original_code: string;
  ai_reviewed_code: string;
  language: string;
  status: string;
  source: string;
  created_at: string;
}

const T = {
  background: '#0b1326',
  surface: '#131b2e',
  primary: '#6d5bff',
  text: '#dae2fd',
  muted: '#928ea1',
  border: '#2d3449',
  surfaceHigh: '#222a3d',
  success: '#34d399',
  error: '#ef4444',
};

export default function FinalCodePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [review, setReview] = useState<Review | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalCode, setFinalCode] = useState<string>('');
  const [finalLoading, setFinalLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitResult, setCommitResult] = useState<{ branch: string; compareUrl: string } | null>(null);

  const [githubImport, setGithubImport] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('github_import');
    if (saved) {
      try {
        setGithubImport(JSON.parse(saved));
      } catch { /* silent */ }
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push(ROUTES.LOGIN); return; }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/review/${id}/diff`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setReview(data.review);
          setSuggestions(data.suggestions);
          
          const acceptedCount = data.suggestions.filter((s: any) => s.status === 'accepted').length;
          setCommitMessage(COMMIT.DEFAULT_MESSAGE_TEMPLATE.replace('{count}', acceptedCount.toString()));

          // Fetch AI-merged final code
          const finalRes = await fetch(`/api/review/${id}/final`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const finalData = await finalRes.json();
          if (finalData.success) {
            setFinalCode(finalData.final_code);
          } else {
            setFinalCode(data.review.original_code);
          }
        } else {
          showToast(data.message, 'error');
        }
      } catch {
        showToast('Failed to load review data', 'error');
      } finally {
        setLoading(false);
        setFinalLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });

  const acceptedSuggestions = suggestions.filter(s => s.status === 'accepted');



  const handleCopy = () => {
    if (!review) return;
    navigator.clipboard.writeText(finalCode);
    showToast('Code copied to clipboard!', 'success');
  };

  const handleCommit = async () => {
    if (!githubImport || !review) return;
    setCommitLoading(true);

    try {
      const token = localStorage.getItem('token');
      const ghToken = localStorage.getItem('github_token');
      const res = await fetch('/api/github/commit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-github-token': ghToken || ''
        },
        body: JSON.stringify({
          owner: githubImport.owner,
          repo: githubImport.repo,
          path: githubImport.path,
          content: finalCode,
          branch_name: `${COMMIT.BRANCH_PREFIX}${id}`,
          commit_message: commitMessage,
          review_id: id
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCommitResult({ branch: data.branch, compareUrl: data.compare_url });
        showToast(FINAL_CODE.COMMIT_SUCCESS, 'success');
      } else {
        showToast(data.message || MESSAGES.ERROR.GITHUB_COMMIT_FAILED, 'error');
      }
    } catch {
      showToast('Commit failed due to network error', 'error');
    } finally {
      setCommitLoading(false);
    }
  };

  if (loading || finalLoading) {
    return (
      <div style={{ minHeight: '100vh', background: T.background }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 80px)' }}>
          <div className="spin-sq" style={{ width: 40, height: 40, border: `3px solid ${T.primary}33`, borderTopColor: T.primary, borderRadius: 10 }} />
        </div>
      </div>
    );
  }



  return (
    <div style={{ minHeight: '100vh', background: T.background, color: T.text, fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <style jsx global>{`
        @keyframes spin-sq { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-sq { animation: spin-sq 0.8s linear infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: ${T.background}; }
        .custom-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: ${T.muted}; }
      `}</style>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <button 
          onClick={() => router.push(`/review/${id}/diff`)}
          style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', marginBottom: 24, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {FINAL_CODE.BACK_TO_REVIEW}
        </button>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: '#fff' }}>{FINAL_CODE.TITLE}</h1>
            <p style={{ color: T.muted, fontSize: 16 }}>
              {FINAL_CODE.SUBTITLE_TEMPLATE
                .replace('{accepted}', acceptedSuggestions.length.toString())
                .replace('{total}', suggestions.length.toString())}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={handleCopy}
              style={{ padding: '12px 24px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceHigh}
              onMouseLeave={e => e.currentTarget.style.background = T.surface}
            >
              {FINAL_CODE.COPY_BTN}
            </button>
            {githubImport && (
              <button 
                onClick={() => setShowCommitModal(true)}
                style={{ padding: '12px 24px', background: T.primary, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 12px ${T.primary}40` }}
              >
                {FINAL_CODE.COMMIT_BTN}
              </button>
            )}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Editor Area */}
          <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden', height: 600, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${T.border}`, background: '#1a2236', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {githubImport?.path || 'reviewed_code.js'}
              </span>
              <span style={{ fontSize: 12, color: T.success }}>{review?.language}</span>
            </div>
            <div className="custom-scroll" style={{ flex: 1, overflow: 'auto', padding: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, lineHeight: 1.6, background: '#060e20' }}>
              <pre>
                {finalCode.split('\n').map((line, i) => (
                  <div key={i} style={{ display: 'flex' }}>
                    <span style={{ width: 40, color: '#334155', textAlign: 'right', paddingRight: 16, userSelect: 'none' }}>{i + 1}</span>
                    <span style={{ color: T.text }}>{line || ' '}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#fff' }}>{FINAL_CODE.APPLIED_CHANGES}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {suggestions.map((s) => (
                  <div key={s.suggestion_id} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span style={{ color: s.status === 'accepted' ? T.success : T.error, fontWeight: 'bold' }}>
                      {s.status === 'accepted' ? '✓' : '✕'}
                    </span>
                    <div>
                      <p style={{ color: T.text, marginBottom: 4, fontWeight: 500 }}>{s.suggestion.split(':')[0]}</p>
                      <span style={{ fontSize: 11, color: T.muted, textTransform: 'capitalize' }}>{s.severity} • {s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Commit Modal */}
      {showCommitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, width: '100%', maxWidth: 500, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            {!commitResult ? (
              <>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#fff' }}>{FINAL_CODE.COMMIT_TITLE}</h2>
                <div style={{ background: T.background, padding: 16, borderRadius: 12, marginBottom: 24, fontSize: 13, color: T.muted }}>
                  <p style={{ marginBottom: 8 }}>Repo: <span style={{ color: T.primary }}>{githubImport?.owner}/{githubImport?.repo}</span></p>
                  <p style={{ marginBottom: 8 }}>File: <span style={{ color: T.text }}>{githubImport?.path}</span></p>
                  <p>Branch: <span style={{ color: T.success }}>{COMMIT.BRANCH_PREFIX}{id}</span></p>
                </div>
                
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: 'uppercase' }}>Commit Message</label>
                  <textarea 
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    style={{ width: '100%', padding: 16, background: T.background, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, resize: 'none', height: 100 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={() => setShowCommitModal(false)}
                    disabled={commitLoading}
                    style={{ flex: 1, padding: '14px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCommit}
                    disabled={commitLoading}
                    style={{ flex: 2, padding: '14px', background: T.primary, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {commitLoading ? <div className="spin-sq" style={{ width: 16, height: 16, border: '2px solid #ffffff33', borderTopColor: '#fff', borderRadius: 4 }} /> : 'Commit Changes →'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 32, background: `${T.success}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <span style={{ color: T.success, fontSize: 32 }}>✓</span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#fff' }}>{FINAL_CODE.COMMIT_SUCCESS}</h2>
                <p style={{ color: T.muted, marginBottom: 32 }}>Changes have been committed to the branch <br/> <span style={{ color: T.success }}>{commitResult.branch}</span></p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button 
                    onClick={() => window.open(commitResult.compareUrl, '_blank')}
                    style={{ padding: '14px', background: T.primary, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {FINAL_CODE.VIEW_ON_GITHUB}
                  </button>
                  <button 
                    onClick={() => setShowCommitModal(false)}
                    style={{ padding: '14px', background: T.surfaceHigh, border: 'none', borderRadius: 12, color: T.text, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
