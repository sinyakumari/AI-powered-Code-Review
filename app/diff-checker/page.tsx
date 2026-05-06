'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Toast from '@/components/ui/Toast';
import { computeDiff, DiffMode, DiffLine } from '@/lib/diff';
import { DIFF_CHECKER, ROUTES } from '@/lib/constants';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        '#0b1326',
  surface:   '#131b2e',
  editorBg:  '#060e20',
  panelHdr:  '#1a2236',
  border:    '#2d3449',
  primary:   '#6d5bff',
  pLight:    '#c6c0ff',
  text:      '#dae2fd',
  muted:     '#928ea1',
  outline:   '#474555',
  removed:   '#ef4444',
  removedBg: 'rgba(239,68,68,0.15)',
  removedBorder: 'rgba(239,68,68,0.3)',
  added:     '#34d399',
  addedBg:   'rgba(52,211,153,0.15)',
  addedBorder: 'rgba(52,211,153,0.3)',
  mergeRow:  '#0d1627',
  clearBtn:  '#222a3d',
} as const;

// ─── Line-height constant (px) — must match textarea line-height ──────────────
const LINE_H = 22; // 13px * 1.7 ≈ 22px

// ─── Sub-components ──────────────────────────────────────────────────────────

interface PanelHeaderProps {
  label: string;
  lineCount: number;
  onCopy: () => void;
}
function PanelHeader({ label, lineCount, onCopy }: PanelHeaderProps) {
  return (
    <div
      style={{
        backgroundColor: T.panelHdr,
        borderBottom: `1px solid ${T.border}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <span style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>
        {label}&nbsp;&nbsp;
        <span style={{ color: T.outline, fontWeight: 400 }}>{lineCount} LINES</span>
      </span>
      <button
        onClick={onCopy}
        style={{
          background: 'none',
          border: `1px solid ${T.outline}`,
          borderRadius: 4,
          color: T.muted,
          fontSize: 11,
          padding: '2px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      </button>
    </div>
  );
}

interface EditorPanelProps {
  lines: DiffLine[];
  value: string;
  onChange: (v: string) => void;
  onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  highlightType: 'removed' | 'added';
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}
function EditorPanel({ lines, value, onChange, onScroll, placeholder, highlightType, textareaRef }: EditorPanelProps) {
  const highlightColor = highlightType === 'removed' ? T.removedBg : T.addedBg;
  const lineNumColor   = highlightType === 'removed' ? T.removed   : T.added;

  const bgRef = useRef<HTMLDivElement>(null);
  const numsRef = useRef<HTMLDivElement>(null);

  const handleInternalScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (bgRef.current) bgRef.current.scrollTop = scrollTop;
    if (numsRef.current) numsRef.current.scrollTop = scrollTop;
    onScroll(e);
  };

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: T.editorBg }}>
      {/* Background highlight rows */}
      <div
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          paddingLeft: 48,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: lines.length * LINE_H }}>
          {lines.map((line, idx) => (
            <div
              key={idx}
              style={{
                height: LINE_H,
                backgroundColor: line.type === highlightType ? highlightColor : 'transparent',
              }}
            />
          ))}
        </div>
      </div>

      {/* Line numbers */}
      <div
        ref={numsRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 48,
          pointerEvents: 'none',
          zIndex: 2,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 12,
          lineHeight: `${LINE_H}px`,
          userSelect: 'none',
          overflow: 'hidden',
          backgroundColor: T.editorBg,
          borderRight: `1px solid ${T.border}`,
        }}
      >
        <div style={{ height: lines.length * LINE_H }}>
          {lines.map((line, idx) => (
            <div
              key={idx}
              style={{
                height: LINE_H,
                textAlign: 'right',
                paddingRight: 10,
                color: line.type === highlightType ? lineNumColor : T.outline,
              }}
            >
              {line.lineNum}
            </div>
          ))}
        </div>
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={handleInternalScroll}
        placeholder={placeholder}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="no-scrollbar"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          color: T.text,
          caretColor: T.primary,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 13,
          lineHeight: `${LINE_H}px`,
          padding: `0 16px 0 56px`,
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflowY: 'auto',
          overflowX: 'auto',
          whiteSpace: 'pre',
          wordBreak: 'keep-all',
          tabSize: 2,
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiffCheckerPage() {
  const router = useRouter();

  const [leftCode,  setLeftCode]  = useState('');
  const [rightCode, setRightCode] = useState('');
  const [diffMode,  setDiffMode]  = useState<DiffMode>('smart');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const leftRef  = useRef<HTMLTextAreaElement>(null);
  const rightRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push(ROUTES.LOGIN);
  }, [router]);

  // ── Diff computation ────────────────────────────────────────────────────────
  const { leftLines, rightLines } = useMemo((): { leftLines: DiffLine[]; rightLines: DiffLine[] } => {
    if (!leftCode && !rightCode) {
      return { leftLines: [], rightLines: [] };
    }
    if (!rightCode.trim()) {
      return {
        leftLines: leftCode.split('\n').map((content, i) => ({
          lineNum: i + 1,
          content,
          type: 'unchanged' as const,
        })),
        rightLines: [],
      };
    }
    if (!leftCode.trim()) {
      return {
        leftLines: [],
        rightLines: rightCode.split('\n').map((content, i) => ({
          lineNum: i + 1,
          content,
          type: 'unchanged' as const,
        })),
      };
    }
    return computeDiff(leftCode, rightCode, diffMode);
  }, [leftCode, rightCode, diffMode]);

  const removalsCount  = leftLines.filter(l => l.type === 'removed').length;
  const additionsCount = rightLines.filter(l => l.type === 'added').length;

  // ── Synchronized scrolling ──────────────────────────────────────────────────
  const handleLeftScroll  = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (rightRef.current) rightRef.current.scrollTop = e.currentTarget.scrollTop;
  };
  const handleRightScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (leftRef.current) leftRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  // ── Merge / clear ───────────────────────────────────────────────────────────
  const mergeToRight = () => {
    setRightCode(leftCode);
    setToast({ message: DIFF_CHECKER.MERGED_TOAST, type: 'success' });
  };
  const mergeToLeft = () => {
    setLeftCode(rightCode);
    setToast({ message: DIFF_CHECKER.MERGED_TOAST, type: 'success' });
  };
  const clearBoth = () => {
    setLeftCode('');
    setRightCode('');
  };

  // ── Copy helpers ────────────────────────────────────────────────────────────
  const copyLeft  = () => { navigator.clipboard.writeText(leftCode);  setToast({ message: 'Copied!', type: 'info' }); };
  const copyRight = () => { navigator.clipboard.writeText(rightCode); setToast({ message: 'Copied!', type: 'info' }); };

  // ── Mode button style ───────────────────────────────────────────────────────
  const modeBtn = (mode: DiffMode) => ({
    padding: '5px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer' as const,
    border: `1px solid ${diffMode === mode ? T.primary : T.outline}`,
    backgroundColor: diffMode === mode ? T.primary  : T.surface,
    color:           diffMode === mode ? '#ffffff'  : T.muted,
    transition: 'all 0.15s ease',
  });

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: T.bg,
        color: T.text,
        fontFamily: '"Inter", "Poppins", sans-serif',
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
      {/* ── Navbar ── */}
      <Navbar />

      {/* ── Header row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px 10px',
          flexShrink: 0,
        }}
      >
        {/* Left: title + subtitle */}
        <div>
          <h1 style={{ 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28, 
            fontWeight: 700, 
            color: T.pLight, 
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: 8
          }}>
            {DIFF_CHECKER.TITLE}
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: T.muted }}>
            {DIFF_CHECKER.SUBTITLE}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
       
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div
        style={{
          padding: '6px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            backgroundColor: T.removedBg,
            color: T.removed,
            border: `1px solid ${T.removedBorder}`,
            borderRadius: 20,
            padding: '3px 12px',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          ● {removalsCount} removals
        </span>
        <span
          style={{
            backgroundColor: T.addedBg,
            color: T.added,
            border: `1px solid ${T.addedBorder}`,
            borderRadius: 20,
            padding: '3px 12px',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          ● {additionsCount} additions
        </span>

      </div>

      {/* ── Split panels card ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 16px 4px',
          overflow: 'hidden',
        }}
      >
        {/* Card wrapper */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            gap: 12,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Left panel card */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            <PanelHeader
              label={DIFF_CHECKER.HEADER_ORIGINAL}
              lineCount={leftLines.length}
              onCopy={copyLeft}
            />
            <EditorPanel
              lines={leftLines}
              value={leftCode}
              onChange={setLeftCode}
              onScroll={handleLeftScroll}
              placeholder={DIFF_CHECKER.PLACEHOLDER_LEFT}
              highlightType="removed"
              textareaRef={leftRef}
            />
          </div>

          {/* Right panel card */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            <PanelHeader
              label={DIFF_CHECKER.HEADER_MODIFIED}
              lineCount={rightLines.length}
              onCopy={copyRight}
            />
            <EditorPanel
              lines={rightLines}
              value={rightCode}
              onChange={setRightCode}
              onScroll={handleRightScroll}
              placeholder={DIFF_CHECKER.PLACEHOLDER_RIGHT}
              highlightType="added"
              textareaRef={rightRef}
            />
          </div>
        </div>
      </div>

      {/* ── Merge buttons row ── */}
      <div
        style={{
          marginTop: 10,
          padding: '0 20px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Inner pill container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 50,
            padding: '6px 8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          {/* Merge left → right */}
          <button
            onClick={mergeToRight}
            style={{
              backgroundColor: T.removed,
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              padding: '8px 20px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {DIFF_CHECKER.MERGE_LEFT}
          </button>

          {/* Clear / ✕ */}
          <button
            onClick={clearBoth}
            title="Clear both panels"
            style={{
              backgroundColor: T.clearBtn,
              color: T.muted,
              border: `1px solid ${T.outline}`,
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            ✕
          </button>

          {/* Merge right → left */}
          <button
            onClick={mergeToLeft}
            style={{
              backgroundColor: T.added,
              color: '#0b1326',
              border: 'none',
              borderRadius: 50,
              padding: '8px 20px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {DIFF_CHECKER.MERGE_RIGHT}
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
