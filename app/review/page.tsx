'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Toast from '@/components/ui/Toast';
import { EDITOR, TABS, ROUTES } from '@/lib/constants';

// ─── Stitch "Midnight Technical" Design Tokens ────────────────────────────────
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
};

function ReviewContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [activeTab,        setActiveTab]        = useState(TABS.PASTE);
  const [code,             setCode]             = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('plaintext');
  const [isAnalyzing,      setIsAnalyzing]      = useState(false);
  const [fileName,         setFileName]         = useState('');
  const [toast,            setToast]            = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const textAreaRef    = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const debounceTimer  = useRef<NodeJS.Timeout | null>(null);

  // ── FIX 2: Code not clearing on mount
  useEffect(() => {
    setCode('');
    setFileName('');
    setDetectedLanguage('plaintext');
    localStorage.removeItem(EDITOR.DRAFT_KEY);
  }, []);

  // ── Auth guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push(ROUTES.LOGIN); return; }
    const tabParam = searchParams.get('tab');
    if (tabParam && Object.values(TABS).includes(tabParam as any))
      setActiveTab(tabParam as any);
  }, [router, searchParams]);

  useEffect(() => () => { localStorage.removeItem(EDITOR.DRAFT_KEY); }, []);

  // ── Language detection
  const detectLanguage = useCallback(async (snippet: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/review/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: snippet.slice(0, 500) }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetectedLanguage(data.language || 'javascript');
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (code.trim()) {
      debounceTimer.current = setTimeout(() => detectLanguage(code), EDITOR.DEBOUNCE_MS);
    } else {
      setDetectedLanguage('plaintext');
    }
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [code, detectLanguage]);

  // ── Helpers
  const showToast       = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });
  const handleTrySample = () => { setCode(EDITOR.SAMPLE_CODE); showToast('Sample code loaded', 'info'); };
  const handleCopy      = () => { if (!code) return; navigator.clipboard.writeText(code); showToast('Copied!', 'success'); };
  const handleClear     = () => { setCode(''); setFileName(''); setDetectedLanguage('plaintext'); showToast('Editor cleared', 'info'); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.js','.ts','.py','.java','.cpp','.c','.cs','.php','.rb','.go'].includes(ext)) {
      showToast('Unsupported file type', 'error'); return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content.length > EDITOR.MAX_CHARS) { showToast('File too large (max 10,000 chars)', 'error'); return; }
      setCode(content);
      setActiveTab(TABS.PASTE);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!code.trim())                    { showToast('Please provide some code to analyze', 'error'); return; }
    if (code.length > EDITOR.MAX_CHARS)  { showToast(`Code exceeds ${EDITOR.MAX_CHARS} characters`, 'error'); return; }
    const token = localStorage.getItem('token');
    if (!token) { showToast('Session expired. Please login again.', 'error'); router.push(ROUTES.LOGIN); return; }

    setIsAnalyzing(true);
    try {
      const res  = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, source: activeTab === TABS.UPLOAD ? 'upload' : 'paste' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCode('');
        localStorage.removeItem(EDITOR.DRAFT_KEY);
        router.push(`/review/${data.review_id}/diff`);
      } else {
        showToast(data.message || 'Analysis failed', 'error');
        setIsAnalyzing(false);
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
      setIsAnalyzing(false);
    }
  };

  const syncScroll = () => {
    if (textAreaRef.current && lineNumbersRef.current)
      lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
  };

  const lineNumbers = code.split('\n').map((_, i) => i + 1);
  const lineCount   = lineNumbers.length;

  const tabs = [
    { id: TABS.PASTE,  label: 'Paste Code',        icon: 'code' },
    { id: TABS.UPLOAD, label: 'Upload File',        icon: 'upload_file' },
    { id: TABS.GITHUB, label: 'Import from GitHub', icon: 'data_object' },
  ];

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 12px',
    fontSize: 12, fontWeight: 600,
    color: T.outline,
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '8px 16px', fontFamily: "'Inter', sans-serif" }}>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .msym {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
        }
        .msym-filled {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
        }

        .stitch-scroll::-webkit-scrollbar       { width: 8px; height: 8px; }
        .stitch-scroll::-webkit-scrollbar-track  { background: #060e20; }
        .stitch-scroll::-webkit-scrollbar-thumb  { background: #2d3449; border-radius: 4px; }
        .stitch-scroll::-webkit-scrollbar-thumb:hover { background: #474555; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes spin-sq {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-sq { animation: spin-sq 1.6s linear infinite; }

        @keyframes stitch-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        .stitch-pulse { animation: stitch-pulse 2s ease-in-out infinite; }

        .analyze-btn:hover .analyze-arrow { transform: translateX(4px); }
        .analyze-arrow { transition: transform 0.2s; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ marginBottom: 40, position: 'relative' }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 40, fontWeight: 700,
          letterSpacing: '-0.02em',
          color: T.primary,
          marginBottom: 12,
        }}>
          Code Review
        </h1>
        <p style={{ color: T.onSurfaceVariant, fontSize: 18 }}>
          Paste, upload, or import your code for AI analysis
        </p>
        <button
          onClick={handleTrySample}
          style={{
            position: 'absolute', top: 8, right: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            fontSize: 12, fontWeight: 600,
            color: T.outlineVariant,
            background: `${T.surfaceContainerLow}80`,
            border: `1px solid ${T.outlineVariant}4d`,
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = T.onSurfaceVariant)}
          onMouseLeave={e => (e.currentTarget.style.color = T.outlineVariant)}
        >
          <span className="msym" style={{ fontSize: 14 }}>lightbulb</span>
          Try Sample Code
        </button>
      </header>

      {/* ── Tab Switcher ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginBottom: 24,
        borderBottom: `1px solid ${T.surfaceContainerHighest}`,
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600, fontSize: 14,
                letterSpacing: '0.025em',
                color: active ? T.primary : T.outline,
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${T.primaryContainer}` : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.onSurface; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.outline; }}
            >
              <span className="msym" style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Editor Container ── */}
      <div style={{
        background: T.surfaceContainerLow,
        borderRadius: 8,
        border: `1px solid ${T.surfaceContainerHighest}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 500,
        margin: '0 12px',
      }}>

        {/* Editor body */}
        <div style={{ flexGrow: 1, display: 'flex', position: 'relative', minHeight: 420 }}>

          {/* AI Analyzing overlay */}
          {isAnalyzing && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: `${T.background}cc`,
              backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16,
            }}>
              <div className="spin-sq" style={{
                width: 48, height: 48,
                border: `4px solid ${T.primary}33`,
                borderTopColor: T.primary,
                borderRadius: 12,
              }} />
              <p className="stitch-pulse" style={{
                color: T.primary,
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: '0.025em',
                fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                🤖 AI is analyzing your code...
              </p>
            </div>
          )}

          {/* Paste Code tab */}
          {activeTab === TABS.PASTE && (
            <>
              <div
                ref={lineNumbersRef}
                className="no-scrollbar"
                style={{
                  width: 48,
                  background: T.surfaceContainerLowest,
                  borderRight: `1px solid ${T.surfaceContainerHighest}`,
                  padding: '24px 12px 24px 0',
                  textAlign: 'right',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  color: T.outlineVariant,
                  userSelect: 'none',
                  overflowY: 'hidden',
                  lineHeight: '1.7',
                  flexShrink: 0,
                }}
              >
                {lineNumbers.map(n => (
                  <div key={n} style={{ lineHeight: '1.7' }}>{n}</div>
                ))}
              </div>

              <textarea
                ref={textAreaRef}
                value={code}
                onChange={e => setCode(e.target.value)}
                onScroll={syncScroll}
                placeholder="Paste your code here..."
                spellCheck={false}
                className="stitch-scroll"
                style={{
                  flex: 1,
                  background: T.surfaceContainerLow,
                  color: T.onSurface,
                  padding: 24,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  lineHeight: '1.7',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  minHeight: 420,
                  caretColor: T.primary,
                }}
              />

              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0,
                width: 4,
                background: `linear-gradient(to left, ${T.primary}0d, transparent)`,
                pointerEvents: 'none',
              }} />
            </>
          )}

          {/* Upload File tab */}
          {activeTab === TABS.UPLOAD && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".js,.ts,.py,.java,.cpp,.c,.cs,.php,.rb,.go" />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', minHeight: 360,
                  border: `2px dashed ${T.outlineVariant}`,
                  borderRadius: 8,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.primaryContainer; (e.currentTarget as HTMLDivElement).style.background = `${T.primaryContainer}0d`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.outlineVariant; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <span className="msym" style={{ fontSize: 48, color: T.primary, marginBottom: 16, opacity: 0.7 }}>upload_file</span>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: T.onSurface, marginBottom: 8 }}>
                  {fileName || 'Upload your code file'}
                </h3>
                <p style={{ color: T.outline, fontSize: 13, textAlign: 'center', maxWidth: 280, marginBottom: 24 }}>
                  Drag and drop your file here, or click to browse. Max 10,000 characters.
                </p>
                <button style={{ padding: '10px 24px', background: T.surfaceContainerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 6, color: T.onSurface, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {fileName ? 'Change File' : 'Browse Files'}
                </button>
              </div>
            </div>
          )}

          {/* GitHub tab */}
          {activeTab === TABS.GITHUB && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <span className="msym" style={{ fontSize: 48, color: T.outline, marginBottom: 16, opacity: 0.4 }}>data_object</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: T.outline, marginBottom: 8 }}>
                GitHub integration coming soon
              </h3>
              <p style={{ color: T.outline, fontSize: 13, textAlign: 'center', maxWidth: 280, opacity: 0.7 }}>
                We&apos;re working on direct GitHub repo imports. Stay tuned for seamless CI/CD integration!
              </p>
            </div>
          )}
        </div>

        {/* ── Status Bar ── */}
        <div style={{
          background: T.surfaceContainerHigh,
          borderTop: `1px solid ${T.surfaceContainerHighest}`,
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px',
              background: T.surfaceContainerHighest,
              borderRadius: 8,
              border: `1px solid ${T.outlineVariant}4d`,
            }}>
              <span className="msym" style={{ fontSize: 14, color: T.secondary }}>
                {detectedLanguage === 'plaintext' ? 'code' : 'javascript'}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                letterSpacing: '0.08em',
                color: T.onSurfaceVariant,
                textTransform: 'uppercase' as const,
                fontFamily: "'Inter', sans-serif",
              }}>
                {detectedLanguage}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.outline }}>
              Chars: <span style={{ color: T.onSurface }}>{code.length.toLocaleString()}</span>
              {' '}/ 10,000 | Lines: <span style={{ color: T.onSurface }}>{lineCount}</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleCopy}
              style={btnBase}
              onMouseEnter={e => { e.currentTarget.style.color = T.primary; e.currentTarget.style.background = `${T.primaryContainer}33`; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.outline;  e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="msym" style={{ fontSize: 16 }}>content_copy</span>
              Copy
            </button>
            <button
              onClick={handleClear}
              style={btnBase}
              onMouseEnter={e => { e.currentTarget.style.color = T.error; e.currentTarget.style.background = `${T.errorContainer}33`; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="msym" style={{ fontSize: 16 }}>delete</span>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ── Action Area ── */}
      <div style={{
        marginTop: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: T.outline }}>
          <span className="msym-filled" style={{ fontSize: 20, color: T.secondary }}>info</span>
          <p>Maximum code length for deep analysis is 10,000 characters.</p>
        </div>

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !code.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 32px',
            background: isAnalyzing || !code.trim() ? T.surfaceContainerHigh : T.primaryContainer,
            color: isAnalyzing || !code.trim() ? T.outline : T.onPrimaryContainer,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: 18,
            borderRadius: 12,
            border: 'none',
            cursor: isAnalyzing || !code.trim() ? 'not-allowed' : 'pointer',
            boxShadow: isAnalyzing || !code.trim() ? 'none' : `0 8px 32px ${T.primary}33`,
            opacity: isAnalyzing || !code.trim() ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!isAnalyzing && code.trim()) e.currentTarget.style.background = '#553fe6'; }}
          onMouseLeave={e => { if (!isAnalyzing && code.trim()) e.currentTarget.style.background = T.primaryContainer; }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
          <span className="msym analyze-arrow" style={{ fontSize: 22 }}>arrow_forward</span>
        </button>
      </div>

      

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}

export default function ReviewPage() {
  return (
    <div style={{ backgroundColor: '#0b1326', color: '#dae2fd', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <Suspense fallback={
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 128 }}>
          <div style={{
            width: 32, height: 32,
            border: '2px solid #6d5bff',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      }>
        <ReviewContent />
      </Suspense>
    </div>
  );
}