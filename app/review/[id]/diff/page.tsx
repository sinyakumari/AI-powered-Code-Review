'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import { MESSAGES, DIFF, ROUTES } from '@/lib/constants';


interface Suggestion {
  suggestion_id: number;
  suggestion: string;
  severity: string;
  suggested_code: string;
  is_accepted: number;
  status: string;
  created_at: string;
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

  const [review, setReview] = useState<Review | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ─── Auth & Data Fetching ───────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
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
          // Only show pending suggestions for navigation
          setSuggestions(data.suggestions);
          
          // Find first pending index in the full list
          const firstPendingIdx = data.suggestions.findIndex((s: Suggestion) => s.status === 'pending');
          if (firstPendingIdx !== -1) {
            setCurrentIndex(firstPendingIdx);
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

    fetchData();
  }, [id, router]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });

  // ─── Suggestion Navigation ──────────────────────────────────────────────────
  const currentSuggestion = suggestions[currentIndex];
  

  const reviewedCount = useMemo(() => 
    suggestions.filter(s => s.status !== 'pending').length, 
  [suggestions]);

  const totalCount = suggestions.length;
  const progressPercent = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!currentSuggestion) return;
    const token = localStorage.getItem('token');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/review/${id}/suggestions/${currentSuggestion.suggestion_id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        showToast(DIFF.ACCEPT_MSG, 'success');
        // Accept means job done, redirect to dashboard as per rules
        setTimeout(() => router.push(ROUTES.DASHBOARD), 1500);
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
    if (!currentSuggestion) return;
    const token = localStorage.getItem('token');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/review/${id}/suggestions/${currentSuggestion.suggestion_id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        showToast(DIFF.REJECT_MSG, 'info');
        
        // Update local state
        const newSuggestions = [...suggestions];
        newSuggestions[currentIndex].status = 'rejected';
        setSuggestions(newSuggestions);

        if (data.all_rejected) {
          showToast(DIFF.ALL_REVIEWED, 'success');
          setTimeout(() => router.push(ROUTES.DASHBOARD), 1500);
        } else {
          // Find next pending
          const nextPending = newSuggestions.findIndex((s, idx) => idx > currentIndex && s.status === 'pending');
          if (nextPending !== -1) {
            setCurrentIndex(nextPending);
          } else {
            const firstPending = newSuggestions.findIndex(s => s.status === 'pending');
            if (firstPending !== -1) setCurrentIndex(firstPending);
          }
        }
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Diff Rendering Logic ──────────────────────────────────────────────────
  const diffLines = useMemo(() => {
    if (!review || !currentSuggestion) return [];
    
    const linesL = review.original_code.split('\n');
    const linesR = currentSuggestion.suggested_code.split('\n');
    const max = Math.max(linesL.length, linesR.length);
    
    const diff = [];
    for (let i = 0; i < max; i++) {
      const left = linesL[i] !== undefined ? linesL[i] : null;
      const right = linesR[i] !== undefined ? linesR[i] : null;
      const changed = left !== right;
      
      diff.push({
        num: i + 1,
        left,
        right,
        changed
      });
    }
    return diff;
  }, [review, currentSuggestion]);

  // ─── Render ────────────────────────────────────────────────────────────────
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
        
        {/* 2. SUGGESTION CARD */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-xl p-6 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Badge 
                label={currentSuggestion?.severity || 'medium'} 
                variant={(currentSuggestion?.severity as any) || 'medium'} 
              />
              <span className="text-[13px] font-semibold text-slate-400">
                Suggestion {currentIndex + 1} of {totalCount}
              </span>
            </div>
            
            {/* Navigation Dots */}
            <div className="flex gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={s.suggestion_id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'bg-[#6d5bff] scale-125' 
                      : s.status === 'pending' 
                        ? 'bg-slate-600 hover:bg-slate-500' 
                        : 'bg-slate-800 opacity-40'
                  }`}
                  title={s.suggestion}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-5">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20">
              <span className="msym text-2xl text-indigo-400">shield</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1 leading-tight font-poppins">
                {currentSuggestion?.suggestion.split(':')[0] || 'Code Improvement'}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
                {currentSuggestion?.suggestion.includes(':') 
                  ? currentSuggestion.suggestion.split(':').slice(1).join(':').trim() 
                  : currentSuggestion?.suggestion}
              </p>
            </div>
          </div>
        </section>

        {/* 3. SIDE BY SIDE DIFF PANEL */}
        <section className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8">
          <div className="flex border-b border-slate-800 bg-[#131b2e]">
            {/* Left Header */}
            <div className="flex-1 px-6 py-4 flex items-center gap-3 border-r border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
              <span className="text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase font-poppins">ORIGINAL CODE</span>
            </div>
            {/* Right Header */}
            <div className="flex-1 px-6 py-4 flex items-center gap-3 bg-[#131b2e]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#34d399] shadow-[0_0_10px_rgba(52,211,153,0.4)]" />
              <span className="text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase font-poppins">AI SUGGESTION</span>
            </div>
          </div>

          <div className="flex min-h-[460px] font-mono text-[13px] bg-[#060e20]">
            {/* Left Column (Original) */}
            <div className="flex-1 border-r border-slate-800/50">
              <div className="overflow-x-auto stitch-scroll h-full">
                {diffLines.map((line) => (
                  <div 
                    key={`l-${line.num}`} 
                    className={`flex ${line.changed && line.left !== null ? 'bg-[#7f1d1d]/25' : ''}`}
                  >
                    <div className="w-12 py-1 px-2 text-right text-slate-700 bg-[#0b1326] border-r border-slate-800/30 shrink-0 select-none">
                      {line.left !== null ? line.num : ''}
                    </div>
                    <pre className={`py-1 px-4 text-slate-300 ${line.changed && line.left !== null ? 'text-red-200' : ''}`}>
                      {line.left !== null ? (line.left || ' ') : ''}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (Suggested) */}
            <div className="flex-1">
              <div className="overflow-x-auto stitch-scroll h-full">
                {diffLines.map((line) => (
                  <div 
                    key={`r-${line.num}`} 
                    className={`flex ${line.changed && line.right !== null ? 'bg-[#064e3b]/30' : ''}`}
                  >
                    <div className="w-12 py-1 px-2 text-right text-slate-700 bg-[#0b1326] border-r border-slate-800/30 shrink-0 select-none">
                      {line.right !== null ? line.num : ''}
                    </div>
                    <pre className={`py-1 px-4 text-slate-300 ${line.changed && line.right !== null ? 'text-emerald-100' : ''}`}>
                      {line.right !== null ? (line.right || ' ') : ''}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. PROGRESS + ACTIONS */}
        <section className="mt-12">
          {/* Progress Row */}
          <div className="flex items-end justify-between mb-3 px-1">
            <div>
              <p className="text-sm font-medium text-slate-400">
                <span className="text-indigo-400 font-bold">{reviewedCount}</span> of {totalCount} suggestions reviewed
              </p>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {totalCount - reviewedCount} Remaining
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full mb-10 overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Action Buttons Swapped and Polished */}
          <div className="flex justify-end items-center gap-4">
            <div className="w-40">
              <button
                onClick={handleReject}
                disabled={actionLoading || currentSuggestion?.status !== 'pending'}
                className="w-full h-[46px] flex items-center justify-center gap-2 rounded-xl border border-red-500/50 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin-custom" />
                ) : (
                  <>✕ Reject</>
                )}
              </button>
            </div>
            <div className="w-60">
              <Button 
                label="✓ Accept Suggestion" 
                onClick={handleAccept} 
                loading={actionLoading}
                disabled={currentSuggestion?.status !== 'pending'}
              />
            </div>
          </div>
        </section>

      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx>{`
        .stitch-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .stitch-scroll::-webkit-scrollbar-track { background: #0b1326; }
        .stitch-scroll::-webkit-scrollbar-thumb { background: #2d3449; border-radius: 3px; }
        .stitch-scroll::-webkit-scrollbar-thumb:hover { background: #474555; }
      `}</style>
    </div>
  );
}
