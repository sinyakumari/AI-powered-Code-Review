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
          setSuggestions(data.suggestions);
          setCurrentIndex(0);
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

  // ─── Diff Rendering Logic ──────────────────────────────────────────────────
  const diffLines = useMemo(() => {
    if (!review || !currentSuggestion) 
      return [];
    
    const linesL = review.original_code
      .split('\n');
    const linesR = currentSuggestion
      .suggested_code.split('\n');
    
    // Find changed line indices
    const changedIndices = new Set<number>();
    let startIdx = (currentSuggestion.line_number || 1) - 1;

    // Fuzzy match original_snippet if available
    if (currentSuggestion.original_snippet) {
      const snippetLines = currentSuggestion.original_snippet.split('\n').filter(l => l.trim()).map(l => l.trim());
      if (snippetLines.length > 0) {
        for (let i = 0; i <= linesL.length - snippetLines.length; i++) {
          let match = true;
          for (let j = 0; j < snippetLines.length; j++) {
            if (linesL[i + j]?.trim() !== snippetLines[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            startIdx = i;
            break;
          }
        }
      }
    }
    
    // Mark changed lines
    for (let i = 0; i < linesR.length; i++) {
      const idx = startIdx + i;
      const l = linesL[idx]?.trim() ?? '';
      const r = linesR[i]?.trim() ?? '';
      if (l !== r) changedIndices.add(idx);
    }

    // Build diff for ALL lines
    const diff = [];
    for (let i = 0; i < linesL.length; i++) {
      const left = linesL[i];
      const right = (i >= startIdx && i < startIdx + linesR.length) 
        ? linesR[i - startIdx] 
        : null;
      
      const leftTrimmed = left?.trim() ?? '';
      const rightTrimmed = right?.trim() ?? '';
      const changed = leftTrimmed !== rightTrimmed;
      
      diff.push({
        num: i + 1,
        left,
        right,
        leftChanged: changed && left !== null && (i >= startIdx && i < startIdx + linesR.length),
        rightChanged: changed && (i >= startIdx && i < startIdx + linesR.length),
        isSeparator: false,
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
        <button 
          onClick={() => router.back()} 
          className="text-slate-400 hover:text-white transition-colors mb-6 flex items-center gap-2 font-medium text-sm"
        >
          {DIFF.BACK || '← Back'}
        </button>
        
        {/* 2. SUGGESTION CARD */}
        <section style={{
          background: '#131b2e',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Badge 
                label={currentSuggestion?.severity || 'medium'} 
                variant={(currentSuggestion?.severity as any) || 'medium'} 
              />
            </div>
            
            {/* Arrow Navigation */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="text-base text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ←
              </button>
              
              <span className="text-[12px] font-bold text-indigo-400">
                Suggestion {currentIndex + 1} of {totalCount}
              </span>
              
              <button 
                onClick={() => setCurrentIndex(Math.min(totalCount - 1, currentIndex + 1))}
                disabled={currentIndex === totalCount - 1}
                className="text-base text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20">
              <span className="msym text-lg text-indigo-400">shield</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1 leading-tight font-poppins">
                {currentSuggestion?.suggestion.split(':')[0] || 'Code Improvement'}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-3xl">
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
            <div style={{
              flex: 1,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRight: '1px solid #1e293b',
              overflow: 'visible',
            }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444, 0 0 20px #ef444466',
                flexShrink: 0,
                marginLeft: 2,
              }} />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}>ORIGINAL CODE</span>
            </div>
            {/* Right Header */}
            <div style={{
              flex: 1,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              overflow: 'visible',
            }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 10px #34d399, 0 0 20px #34d39966',
                flexShrink: 0,
                marginLeft: 2,
              }} />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}>AI SUGGESTION</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            height: 320,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13,
            background: '#060e20',
            overflow: 'hidden',
          }}>
            {/* Left Column (Original) */}
            <div className="no-scrollbar" style={{
              flex: 1,
              borderRight: '1px solid #1e293b',
              overflowY: 'auto',
              overflowX: 'auto',
            }}>
              {diffLines.map((line, idx) => (
                line.isSeparator ? (
                  <div key={`sep-l-${idx}`} style={{
                    background: '#1a2035',
                    padding: '2px 16px',
                    color: '#474555',
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}>
                    ...
                  </div>
                ) : (
                  <div 
                    key={`l-${line.num}`} 
                    className="flex"
                    style={line.leftChanged ? { backgroundColor: 'rgba(239, 68, 68, 0.15)' } : {}}
                  >
                    <div className="w-12 py-1 px-2 text-right text-slate-700 bg-[#0b1326] border-r border-slate-800/30 shrink-0 select-none">
                      {line.left !== null ? line.num : ''}
                    </div>
                    <pre className="py-1 px-4" style={{ color: line.leftChanged ? '#fca5a5' : '#cbd5e1' }}>
                      {line.left !== null ? (line.left || ' ') : ''}
                    </pre>
                  </div>
                )
              ))}
            </div>

            {/* Right Column (Suggested) */}
            <div className="no-scrollbar" style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'auto',
            }}>
              {diffLines.map((line, idx) => (
                line.isSeparator ? (
                  <div key={`sep-r-${idx}`} style={{
                    background: '#1a2035',
                    padding: '2px 16px',
                    color: '#474555',
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}>
                    ...
                  </div>
                ) : (
                  <div 
                    key={`r-${line.num}`} 
                    className="flex"
                    style={line.rightChanged ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : {}}
                  >
                    <div className="w-12 py-1 px-2 text-right text-slate-700 bg-[#0b1326] border-r border-slate-800/30 shrink-0 select-none">
                      {line.right !== null ? line.num : ''}
                    </div>
                    <pre className="py-1 px-4" style={{ color: line.rightChanged ? '#6ee7b7' : '#cbd5e1' }}>
                      {line.right !== null ? (line.right || ' ') : ''}
                    </pre>
                  </div>
                )
              ))}
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
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
            marginTop: 24
          }}>
            {/* Reject Button */}
            <button
              onClick={handleReject}
              disabled={actionLoading}
              style={{
                padding: '12px 32px',
                height: 48,
                borderRadius: 10,
                border: '1px solid #474555',
                background: currentSuggestion?.status === 'rejected'
                  ? '#2d1f3d' : '#131b2e',
                color: '#dae2fd',
                fontSize: 14,
                fontWeight: 600,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.2s',
                minWidth: 120,
              }}
            >
              ✕ Reject
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              style={{
                padding: '12px 32px',
                height: 48,
                borderRadius: 10,
                border: 'none',
                background: currentSuggestion?.status === 'accepted'
                  ? '#16a34a' : '#6d5bff',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.2s',
                minWidth: 180,
                boxShadow: '0 4px 20px rgba(109,91,255,0.3)',
              }}
            >
              ✓ Accept Suggestion
            </button>
          </div>
        </section>

      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .stitch-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .stitch-scroll::-webkit-scrollbar-track { background: #0b1326; }
        .stitch-scroll::-webkit-scrollbar-thumb { background: #2d3449; border-radius: 3px; }
        .stitch-scroll::-webkit-scrollbar-thumb:hover { background: #474555; }
      `}</style>
    </div>
  );
}
