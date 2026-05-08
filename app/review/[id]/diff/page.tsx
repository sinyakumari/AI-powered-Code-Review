'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { MESSAGES, DIFF, ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

interface Suggestion {
  suggestion_id: number;
  suggestion: string;
  severity: string;
  suggested_code: string;
  is_accepted: number;
  status: string;
  created_at: string;
  line_number?: number;
  original_snippet?: string;
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

export default function DiffViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const { showToast } = useUIStore();

  const [review, setReview] = useState<Review | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    
    const isActuallyAuthenticated = isAuthenticated || (typeof window !== 'undefined' && !!localStorage.getItem('token'));
    
    if (!isActuallyAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/review/${id}/diff`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setReview(data.review);
          setSuggestions(data.suggestions);
          
          // Focus specific suggestion if provided in URL
          const targetId = new URLSearchParams(window.location.search).get('suggestion_id');
          if (targetId) {
            const index = data.suggestions.findIndex((s: Suggestion) => s.suggestion_id === parseInt(targetId));
            if (index !== -1) setCurrentIndex(index);
            else setCurrentIndex(0);
          } else {
            setCurrentIndex(0);
          }
        } else {
          showToast(data.message || MESSAGES.ERROR.SERVER_ERROR, 'error');
        }
      } catch (err) {
        showToast('Network error occurred', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [id, router, token, isAuthenticated, showToast, _hasHydrated]);

  const currentSuggestion = suggestions[currentIndex];
  const reviewedCount = useMemo(() => suggestions.filter(s => s.status !== 'pending').length, [suggestions]);
  const totalCount = suggestions.length;
  const progressPercent = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  const handleAccept = async () => {
    if (!currentSuggestion || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/review/${id}/suggestions/${currentSuggestion.suggestion_id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        showToast(DIFF.ACCEPT_MSG, 'success');
        const newSuggestions = [...suggestions];
        newSuggestions[currentIndex].status = 'accepted';
        newSuggestions[currentIndex].is_accepted = 1;
        setSuggestions(newSuggestions);
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentSuggestion || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/review/${id}/suggestions/${currentSuggestion.suggestion_id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        showToast(DIFF.REJECT_MSG, 'info');
        const newSuggestions = [...suggestions];
        newSuggestions[currentIndex].status = 'rejected';
        newSuggestions[currentIndex].is_accepted = 0;
        setSuggestions(newSuggestions);
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const diffLines = useMemo(() => {
    if (!review || !currentSuggestion) return [];
    
    const linesL = review.original_code.split('\n');
    const linesR = (currentSuggestion.suggested_code || '').split('\n');
    
    let startIdx = (currentSuggestion.line_number || 1) - 1;
    if (currentSuggestion.original_snippet) {
      const snippetLines = currentSuggestion.original_snippet.split('\n').filter(l => l.trim()).map(l => l.trim());
      if (snippetLines.length > 0) {
        for (let i = 0; i <= linesL.length - snippetLines.length; i++) {
          let match = true;
          for (let j = 0; j < snippetLines.length; j++) {
            if (linesL[i + j]?.trim() !== snippetLines[j]) { match = false; break; }
          }
          if (match) { startIdx = i; break; }
        }
      }
    }
    
    const diff = [];
    for (let i = 0; i < linesL.length; i++) {
      const left = linesL[i];
      const right = (i >= startIdx && i < startIdx + linesR.length) ? linesR[i - startIdx] : null;
      const changed = (left?.trim() ?? '') !== (right?.trim() ?? '');
      
      diff.push({
        num: i + 1,
        left,
        right,
        leftChanged: changed && left !== null && (i >= startIdx && i < startIdx + linesR.length),
        rightChanged: changed && (i >= startIdx && i < startIdx + linesR.length),
      });
    }
    return diff;
  }, [review, currentSuggestion]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1326]">
        <Navbar />
        <div className="flex flex-col items-center justify-center" style={{ height: 'calc(100vh - 80px)' }}>
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b1326]">
        <Navbar />
        <div className="max-w-4xl mx-auto mt-20 text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 opacity-50">search_off</span>
          <h2 className="text-2xl font-bold text-slate-300 mb-2">{DIFF.NO_SUGGESTIONS}</h2>
          <p className="text-slate-500 mb-8">AI didn't find any issues in this review. Your code looks clean!</p>
          <div className="w-48 mx-auto">
            <Button label="Back to Dashboard" onClick={() => router.push(ROUTES.DASHBOARD)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-inter">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .msym {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
        }
      `}</style>

      <Navbar />

      <main className="max-w-[1280px] mx-auto p-8 pt-6">
        <button onClick={() => router.push(ROUTES.REVIEW)} className="text-slate-400 hover:text-white transition-colors mb-6 flex items-center gap-2 font-medium text-sm">
          {DIFF.BACK || '← Back'}
        </button>
        
        <section style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Badge label={currentSuggestion?.severity || 'medium'} variant={(currentSuggestion?.severity as any) || 'medium'} />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="text-base text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">←</button>
              <span className="text-[12px] font-bold text-indigo-400">Suggestion {currentIndex + 1} of {totalCount}</span>
              <button onClick={() => setCurrentIndex(Math.min(totalCount - 1, currentIndex + 1))} disabled={currentIndex === totalCount - 1} className="text-base text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">→</button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20"><span className="msym text-lg text-indigo-400">shield</span></div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1 leading-tight font-poppins">{currentSuggestion?.suggestion.split(':')[0] || 'Code Improvement'}</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-3xl">{currentSuggestion?.suggestion.includes(':') ? currentSuggestion.suggestion.split(':').slice(1).join(':').trim() : currentSuggestion?.suggestion}</p>
            </div>
          </div>
        </section>

        <section className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8">
          <div className="flex border-b border-slate-800 bg-[#131b2e]">
            <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderRight: '1px solid #1e293b' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#94a3b8', textTransform: 'uppercase' }}>ORIGINAL CODE</span>
            </div>
            <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#94a3b8', textTransform: 'uppercase' }}>AI SUGGESTION</span>
            </div>
          </div>
          <div style={{ display: 'flex', height: 320, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, background: '#060e20', overflow: 'hidden' }}>
            <div className="no-scrollbar" style={{ flex: 1, borderRight: '1px solid #1e293b', overflowY: 'auto', overflowX: 'auto' }}>
              {diffLines.map((line) => (
                <div key={`l-${line.num}`} className="flex" style={line.leftChanged ? { backgroundColor: 'rgba(239, 68, 68, 0.15)' } : {}}>
                  <div className="w-12 py-1 px-2 text-right text-slate-400 bg-[#0b1326] border-r border-slate-800/30 shrink-0 select-none">{line.left !== null ? line.num : ''}</div>
                  <pre className="py-1 px-4" style={{ color: line.leftChanged ? '#fca5a5' : '#cbd5e1' }}>{line.left !== null ? (line.left || ' ') : ''}</pre>
                </div>
              ))}
            </div>
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
              {diffLines.map((line) => (
                <div key={`r-${line.num}`} className="flex" style={line.rightChanged ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : {}}>
                  <div className="w-12 py-1 px-2 text-right text-slate-400 bg-[#0b1326] border-r border-slate-800/30 shrink-0 select-none">{line.right !== null ? line.num : ''}</div>
                  <pre className="py-1 px-4" style={{ color: line.rightChanged ? '#6ee7b7' : '#cbd5e1' }}>{line.right !== null ? (line.right || ' ') : ''}</pre>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between mb-3 px-1">
            <div><p className="text-sm font-medium text-slate-400"><span className="text-indigo-400 font-bold">{reviewedCount}</span> of {totalCount} suggestions reviewed</p></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{totalCount - reviewedCount} Remaining</p>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between items-center mb-10">
            <div>
              {suggestions.some(s => s.status === 'accepted') && (
                <button onClick={() => router.push(`/review/${id}/final`)} style={{ padding: '8px 20px', borderRadius: 8, background: '#6d5bff20', border: '1px solid #6d5bff40', color: '#c6c0ff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>View Final Code →</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 24 }}>
            <button onClick={handleReject} disabled={actionLoading} style={{ padding: '12px 32px', height: 48, borderRadius: 10, border: '1px solid #474555', background: currentSuggestion?.status === 'rejected' ? '#2d1f3d' : '#131b2e', color: '#dae2fd', fontSize: 14, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s', minWidth: 120 }}>✕ Reject</button>
            <button onClick={handleAccept} disabled={actionLoading} style={{ padding: '12px 32px', height: 48, borderRadius: 10, border: 'none', background: currentSuggestion?.status === 'accepted' ? '#16a34a' : '#6d5bff', color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s', minWidth: 180, boxShadow: '0 4px 20px rgba(109,91,255,0.3)' }}>✓ Accept Suggestion</button>
          </div>
        </section>
      </main>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
