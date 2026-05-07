'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { EDITOR, TABS, ROUTES, GITHUB, GITHUB_SIDEBAR, DIFF_CHECKER } from '@/lib/constants';
import { computeDiff, DiffMode } from '@/lib/diff';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

// ─── Design Tokens (Midnight Technical) ────────────────────────────────
const T = {
  background: '#0b1326',
  surface: '#131b2e',
  surfaceHigh: '#222a3d',
  surfaceHighest: '#2d3449',
  primary: '#6d5bff',
  primaryLight: '#c6c0ff',
  onSurface: '#dae2fd',
  onSurfaceVariant: '#c8c4d8',
  outline: '#928ea1',
  outlineVariant: '#474555',
  secondary: '#a6e6ff',
  success: '#34d399',
  border: '#2d3449',
  muted: '#928ea1',
  text: '#dae2fd',
};

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, githubToken, setGithubToken, isAuthenticated, _hasHydrated } = useAuthStore();
  const { showToast } = useUIStore();

  // ── Existing States ──
  const [activeTab, setActiveTab] = useState(TABS.PASTE);
  const [code, setCode] = useState('');
  const [codeSource, setCodeSource] = useState('paste');
  const [detectedLanguage, setDetectedLanguage] = useState('plaintext');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState('');

  // ── New GitHub States ──
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<any[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [importedFile, setImportedFile] = useState<{
    name: string, path: string, repo: string,
    owner: string, download_url: string
  } | null>(null);
  const [projectContext, setProjectContext] = useState<{
    fileTree: string, packageJson: string,
    repoName: string, owner: string
  } | null>(null);

  // ── Diff Checker States ──
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffRightCode, setDiffRightCode] = useState('');
  const [diffMode, setDiffMode] = useState<DiffMode>('smart');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pendingFileSelect, setPendingFileSelect] = useState<any | null>(null);

  // ── Commit States ──
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Manual updates from Diff Checker');
  const [commitBranchName, setCommitBranchName] = useState('');
  const [commitResult, setCommitResult] = useState<{ branch: string; compareUrl: string } | null>(null);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const leftLineNumbersRef = useRef<HTMLDivElement>(null);
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rightLineNumbersRef = useRef<HTMLDivElement>(null);
  const rightBgRef = useRef<HTMLDivElement>(null);

  // ── Diff Computation ──
  const { leftLines, rightLines } = useMemo(() => {
    const codeToUse = code || '';
    if (!diffRightCode || diffRightCode.trim() === '') {
      return {
        leftLines: codeToUse.split('\n').map((content, i) => ({
          lineNum: i + 1,
          content,
          type: 'unchanged' as const,
        })),
        rightLines: [] as { lineNum: number; content: string; type: 'unchanged' | 'removed' | 'added' }[],
      };
    }
    return computeDiff(codeToUse, diffRightCode, diffMode);
  }, [code, diffRightCode, diffMode]);

  const removalsCount = leftLines.filter(l => l.type === 'removed').length;
  const additionsCount = rightLines.filter(l => l.type === 'added').length;

  // ── Functions ──
  const fetchRepos = useCallback(async (gToken: string) => {
    if (!token || !gToken) {
      console.warn('GitHub Fetch: Missing tokens', { hasJwt: !!token, hasGh: !!gToken });
      return;
    }
    
    setGithubLoading(true);
    try {
      const res = await fetch('/api/github/repos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-github-token': gToken
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setRepos(data.repos);
      } else {
        console.error('GitHub API Error:', data.message);
        // Only clear if the GitHub token specifically is invalid
        if (res.status === 401 || data.message?.toLowerCase().includes('github')) {
          setGithubToken(null);
          showToast(data.message || 'GitHub session expired. Please reconnect.', 'error');
        }
      }
    } catch (err: any) {
      console.error('GitHub Fetch Exception:', err);
      showToast('Failed to connect to GitHub', 'error');
    } finally {
      setGithubLoading(false);
    }
  }, [token, setGithubToken, showToast]);

  const fetchFiles = async (owner: string, repo: string, path: string = '', gTokenOverride?: string) => {
    setGithubLoading(true);
    try {
      const activeToken = gTokenOverride || githubToken;
      if (!activeToken) return;

      const res = await fetch(`/api/github/repos/${owner}/${repo}/files?path=${path}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-github-token': activeToken,
        }
      });
      const data = await res.json();
      if (data.success) {
        // Sort: folders first then files, hide hidden files
        const sortedFiles = data.files
          .filter((f: any) => !f.name.startsWith('.'))
          .sort((a: any, b: any) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'dir' ? -1 : 1;
          });
        setFiles(sortedFiles);
        setCurrentPath(path);
      }
    } catch {
      showToast('Failed to load files', 'error');
    } finally {
      setGithubLoading(false);
    }
  };

  const fetchProjectContext = async (owner: string, repo: string, gTokenOverride?: string) => {
    try {
      const activeToken = gTokenOverride || githubToken;
      if (!activeToken) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-github-token': activeToken,
      };

      // Fetch Tree and Package.json in parallel
      const [treeRes, pkgRes] = await Promise.all([
        fetch(`/api/github/repos/${owner}/${repo}/tree`, { headers }),
        fetch(`/api/github/repos/${owner}/${repo}/package`, { headers })
      ]);

      const [treeData, pkgData] = await Promise.all([
        treeRes.json(),
        pkgRes.json()
      ]);

      if (treeData.success) {
        setProjectContext({
          fileTree: treeData.tree,
          packageJson: pkgData.success && pkgData.packageJson 
            ? JSON.stringify(pkgData.packageJson, null, 2) 
            : 'No package.json found',
          repoName: repo,
          owner: owner
        });
      }
    } catch (err) {
      console.error('Failed to fetch project context:', err);
    }
  };

  const handleFileImport = async (file: any) => {
    if (file.size > 10000) {
      showToast(GITHUB_SIDEBAR.FILE_TOO_LARGE, 'error');
      return;
    }

    setGithubLoading(true);
    try {
      const url = `/api/github/file?url=${encodeURIComponent(file.download_url)}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      const data = await res.json();

      if (data.success) {
        setCode(data.content);
        setCodeSource('github');
        setFileName(file.name);
        setImportedFile({
          name: file.name,
          path: file.path,
          repo: selectedRepo.name,
          owner: selectedRepo.owner.login,
          download_url: file.download_url
        });

        // Store import info in localStorage
        localStorage.setItem('github_import', JSON.stringify({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          path: file.path,
          download_url: file.download_url,
          review_id: null
        }));

        showToast(GITHUB_SIDEBAR.IMPORT_SUCCESS, 'success');
      } else {
        showToast(data.message || 'Failed to import file', 'error');
      }
    } catch (err) {
      showToast('Failed to import file', 'error');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleDisconnect = () => {
    setGithubToken(null);
    setRepos([]);
    setFiles([]);
    setSelectedRepo(null);
    setCurrentPath('');
    setImportedFile(null);
  };

  // ── State Persistence (Save) ──
  useEffect(() => {
    if (code) localStorage.setItem('review_code', code);
    else localStorage.removeItem('review_code');
  }, [code]);

  useEffect(() => {
    localStorage.setItem('review_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedRepo) localStorage.setItem('review_selected_repo', JSON.stringify(selectedRepo));
    else localStorage.removeItem('review_selected_repo');
  }, [selectedRepo]);

  useEffect(() => {
    localStorage.setItem('review_current_path', currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (importedFile) localStorage.setItem('review_imported_file', JSON.stringify(importedFile));
    else localStorage.removeItem('review_imported_file');
  }, [importedFile]);

  useEffect(() => {
    if (projectContext) localStorage.setItem('review_project_context', JSON.stringify(projectContext));
    else localStorage.removeItem('review_project_context');
  }, [projectContext]);

  // ── On Page Load (Restore) ──
  useEffect(() => {
    if (!_hasHydrated) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const ghTokenFromUrl = urlParams.get('github_token');
    
    // Restore Code
    const savedCode = localStorage.getItem('review_code');
    if (savedCode) setCode(savedCode);

    // Restore Tab (URL param takes precedence)
    const tabParam = urlParams.get('tab');
    if (tabParam && Object.values(TABS).includes(tabParam as any)) {
      setActiveTab(tabParam as any);
    } else {
      const savedTab = localStorage.getItem('review_active_tab');
      if (savedTab && Object.values(TABS).includes(savedTab as any)) {
        setActiveTab(savedTab as any);
      }
    }

    // Restore GitHub Data
    if (ghTokenFromUrl) {
      setGithubToken(ghTokenFromUrl);
      window.history.replaceState({}, '', `/review${tabParam ? `?tab=${tabParam}` : ''}`);
      fetchRepos(ghTokenFromUrl);
    } else if (githubToken) {
        fetchRepos(githubToken);
        
        // Restore Repo and Path
        const savedRepo = localStorage.getItem('review_selected_repo');
        const savedPath = localStorage.getItem('review_current_path') || '';
        const savedFile = localStorage.getItem('review_imported_file');
        const savedCtx = localStorage.getItem('review_project_context');

        if (savedRepo) {
          try {
            const repo = JSON.parse(savedRepo);
            setSelectedRepo(repo);
            // Fetch both files and context immediately
            fetchFiles(repo.owner.login, repo.name, savedPath, githubToken); 
            fetchProjectContext(repo.owner.login, repo.name, githubToken);
          } catch (e) {
            console.error("Failed to parse saved repo", e);
          }
        }
        if (savedFile) setImportedFile(JSON.parse(savedFile));
        if (savedCtx) setProjectContext(JSON.parse(savedCtx));
    }
  }, [fetchRepos, githubToken, setGithubToken, token, _hasHydrated]);

  // ── Auth guard ──
  useEffect(() => {
    if (!_hasHydrated) return;
    const isActuallyAuthenticated = isAuthenticated || (typeof window !== 'undefined' && !!localStorage.getItem('token'));
    if (!isActuallyAuthenticated) { router.push(ROUTES.LOGIN); return; }
  }, [isAuthenticated, _hasHydrated, router]);

  // ── Language Detection ──
  const detectLanguage = useCallback(async (snippet: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/review/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: snippet.slice(0, 500) }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetectedLanguage(data.language || 'plaintext');
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (code.trim()) {
      debounceTimer.current = setTimeout(() => detectLanguage(code), EDITOR.DEBOUNCE_MS);
    } else {
      setDetectedLanguage('plaintext');
    }
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [code, detectLanguage]);

  // ── Editor Helpers ──
  const handleTrySample = () => {
    setCode(EDITOR.SAMPLE_CODE);
    setActiveTab(TABS.PASTE);
    showToast('Sample code loaded', 'info');
  };
  const handleCopy = () => { if (!code) return; navigator.clipboard.writeText(code); showToast('Copied!', 'success'); };
  const handleClear = () => {
    setCode('');
    setFileName('');
    setDetectedLanguage('plaintext');
    setImportedFile(null);
    showToast('Editor cleared', 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const supported = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go'];
    if (!supported.includes(ext)) {
      showToast(GITHUB_SIDEBAR.UNSUPPORTED_FILE, 'error'); return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content.length > EDITOR.MAX_CHARS) {
        showToast(GITHUB_SIDEBAR.FILE_TOO_LARGE, 'error'); return;
      }
      setCode(content);
      setCodeSource('upload');
      setActiveTab(TABS.PASTE);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!code.trim()) { showToast('Please provide some code to analyze', 'error'); return; }
    if (code.length > EDITOR.MAX_CHARS) { showToast(`Code exceeds ${EDITOR.MAX_CHARS} characters`, 'error'); return; }
    if (!token) { showToast('Session expired. Please login again.', 'error'); router.push(ROUTES.LOGIN); return; }

    setIsAnalyzing(true);
    try {
      const payload: any = { code, source: codeSource };
      
      // Add GitHub context if available and source is github
      if (codeSource === 'github' && projectContext) {
        payload.github_context = {
          file_tree: projectContext.fileTree,
          package_json: projectContext.packageJson,
          filename: importedFile?.name || 'unknown',
          repo_name: projectContext.repoName
        };
      }

      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        // Update localStorage github_import with review_id if applicable
        const savedImport = localStorage.getItem('github_import');
        if (savedImport) {
          const importData = JSON.parse(savedImport);
          importData.review_id = data.review_id;
          localStorage.setItem('github_import', JSON.stringify(importData));
        }

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

  const handleCommit = async () => {
    if (!importedFile) {
      showToast('No GitHub file imported.', 'error');
      return;
    }

    setCommitLoading(true);

    try {
      const branchName = commitBranchName || `coderefine-manual-${new Date().getTime().toString().slice(-6)}`;

      const res = await fetch('/api/github/commit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-github-token': githubToken || ''
        },
        body: JSON.stringify({
          owner: importedFile.owner,
          repo: importedFile.repo,
          path: importedFile.path,
          content: diffRightCode,
          branch_name: branchName,
          commit_message: commitMessage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCommitResult({ branch: data.branch, compareUrl: data.compare_url });
        showToast('Changes committed successfully!', 'success');
      } else {
        showToast(data.message || 'Commit failed.', 'error');
      }
    } catch {
      showToast('Commit failed due to network error', 'error');
    } finally {
      setCommitLoading(false);
    }
  };

  const syncScroll = () => {
    if (textAreaRef.current && lineNumbersRef.current)
      lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
  };

  const lineNumbers = code.split('\n').map((_, i) => i + 1);
  const lineCount = lineNumbers.length;

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const tabs = [
    { id: TABS.PASTE, label: 'Paste Code', icon: 'code' },
    { id: TABS.UPLOAD, label: 'Upload File', icon: 'upload_file' },
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
    <main style={{ maxWidth: 1440, margin: '0 auto', padding: '8px 16px', fontFamily: "'Inter', sans-serif" }}>

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

        .stitch-scroll::-webkit-scrollbar       { width: 6px; height: 6px; }
        .stitch-scroll::-webkit-scrollbar-track  { background: #060e20; }
        .stitch-scroll::-webkit-scrollbar-thumb  { background: #2d3449; border-radius: 4px; }
        .stitch-scroll::-webkit-scrollbar-thumb:hover { background: #474555; }

        .diff-scroll::-webkit-scrollbar       { width: 4px; height: 4px; }
        .diff-scroll::-webkit-scrollbar-track  { background: #060e20; }
        .diff-scroll::-webkit-scrollbar-thumb  { background: #1a2236; border-radius: 2px; }
        .diff-scroll::-webkit-scrollbar-thumb:hover { background: #2d3449; }
        .diff-scroll { scrollbar-width: thin; scrollbar-color: #1a2236 #060e20; }

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
      <header style={{ marginBottom: 32, position: 'relative' }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 36, fontWeight: 700,
          letterSpacing: '-0.02em',
          color: T.primaryLight,
          marginBottom: 8,
        }}>
          Code Review
        </h1>
        <p style={{ color: T.onSurfaceVariant, fontSize: 16 }}>
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
            background: `${T.surfaceHigh}80`,
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
        borderBottom: `1px solid ${T.surfaceHighest}`,
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
                color: active ? T.primaryLight : T.outline,
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${T.primary}` : '2px solid transparent',
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

      {/* ── Diff Checker Toolbar (GitHub tab only) ── */}
      {activeTab === TABS.GITHUB && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 8, marginBottom: 8,
        }}>
          {/* Sidebar Toggle */}
          {isDiffMode && (
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 16px', fontSize: 12, fontWeight: 600,
                borderRadius: 6, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                background: 'transparent',
                color: T.outline,
                border: `1px solid ${T.outlineVariant}`,
                transition: 'all 0.2s',
              }}
            >
              <span className="msym" style={{ fontSize: 16 }}>
                {isSidebarOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
              </span>
              {isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
            </button>
          )}

          {/* Diff Mode Toggle button */}
          <button
            onClick={() => {
              if (isDiffMode) { setDiffRightCode(''); }
              setIsDiffMode(prev => !prev);
              if (!isDiffMode && !isSidebarOpen) setIsSidebarOpen(true); // Auto-open sidebar when exiting diff mode
            }}
            style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 600,
              borderRadius: 6, cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              background: isDiffMode ? T.primary : 'transparent',
              color: isDiffMode ? '#ffffff' : T.outline,
              border: isDiffMode ? 'none' : `1px solid ${T.outlineVariant}`,
              transition: 'all 0.2s',
            }}
          >
            {isDiffMode ? DIFF_CHECKER.EXIT_LABEL : DIFF_CHECKER.BUTTON_LABEL}
          </button>
        </div>
      )}

      {/* ── Editor Layout ── */}
      <div style={{
        background: T.surface,
        borderRadius: 12,
        border: `1px solid ${T.surfaceHighest}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        height: 600,
      }}>

        {/* ── GitHub Sidebar ── */}
        {activeTab === TABS.GITHUB && isSidebarOpen && (
          <aside style={{
            width: 300,
            flexShrink: 0,
            borderRight: `1px solid ${T.surfaceHighest}`,
            background: T.surface,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* STATE 1: Not Connected */}
            {!githubToken && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="28" height="28" fill={T.primaryLight} viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>{GITHUB_SIDEBAR.CONNECT_TITLE}</h3>
                <p style={{ fontSize: 12, color: T.outline, marginBottom: 20 }}>{GITHUB_SIDEBAR.CONNECT_DESC}</p>
                <button
                  onClick={() => { window.location.href = '/api/auth/github'; }}
                  style={{ width: '100%', padding: '10px', background: T.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {GITHUB_SIDEBAR.CONNECT_BTN}
                </button>
              </div>
            )}

            {/* STATE 2: Connected, Show Repos */}
            {githubToken && !selectedRepo && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: 16, borderBottom: `1px solid ${T.surfaceHighest}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.onSurface, margin: 0 }}>{GITHUB_SIDEBAR.REPOS_TITLE}</h3>
                    <button onClick={handleDisconnect} style={{ fontSize: 11, color: T.outline, background: 'transparent', border: `1px solid ${T.outlineVariant}`, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>{GITHUB_SIDEBAR.DISCONNECT}</button>
                  </div>
                  <input
                    type="text"
                    placeholder={GITHUB_SIDEBAR.SEARCH_PLACEHOLDER}
                    value={repoSearch}
                    onChange={e => setRepoSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: T.background, border: `1px solid ${T.surfaceHighest}`, borderRadius: 6, color: T.onSurface, fontSize: 12, outline: 'none' }}
                  />
                </div>
                <div className="stitch-scroll" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                  {githubLoading && repos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: T.outline, fontSize: 12 }}>{GITHUB_SIDEBAR.LOADING_REPOS}</div>
                  ) : (
                    filteredRepos.map(repo => (
                      <div
                        key={repo.id}
                        onClick={() => { 
                          setSelectedRepo(repo); 
                          fetchFiles(repo.owner.login, repo.name);
                          fetchProjectContext(repo.owner.login, repo.name);
                        }}
                        style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: `1px solid transparent`, transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHigh; e.currentTarget.style.borderColor = T.surfaceHighest; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className="msym" style={{ fontSize: 14, color: T.outline }}>folder</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.primaryLight }}>{repo.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {repo.language && <span style={{ fontSize: 10, padding: '1px 6px', background: T.surfaceHighest, borderRadius: 4, color: T.secondary }}>{repo.language}</span>}
                          <span style={{ fontSize: 10, padding: '1px 6px', background: T.surfaceHighest, borderRadius: 4, color: T.outline }}>{repo.private ? 'Private' : 'Public'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STATE 3: Repo Selected, Show File Tree */}
            {githubToken && selectedRepo && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: 16, borderBottom: `1px solid ${T.surfaceHighest}` }}>
                  <button onClick={() => {
                    if (currentPath === '') {
                      // At root — go back to repos list
                      setSelectedRepo(null);
                      setFiles([]);
                      setCurrentPath('');
                    } else {
                      // Inside folder — go back one level
                      const parts = currentPath.split('/');
                      parts.pop();
                      const newPath = parts.join('/');
                      fetchFiles(selectedRepo.owner.login, selectedRepo.name, newPath);
                    }
                  }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0, marginBottom: 8 }}>
                    <span className="msym" style={{ fontSize: 14 }}>arrow_back</span> {currentPath === '' ? 'Back to Repositories' : 'Back'}
                  </button>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 11, color: T.outline }}>
                    <span style={{ color: T.onSurface }}>{selectedRepo.name}</span>
                    {currentPath && currentPath.split('/').map((p, i) => (
                      <React.Fragment key={i}>
                        <span>/</span>
                        <span>{p}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="stitch-scroll" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                  {currentPath && (
                    <div
                      onClick={() => {
                        const parts = currentPath.split('/');
                        parts.pop();
                        fetchFiles(selectedRepo.owner.login, selectedRepo.name, parts.join('/'));
                      }}
                      style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.outline }}
                      onMouseEnter={e => e.currentTarget.style.background = T.surfaceHigh}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="msym" style={{ fontSize: 14 }}>arrow_upward</span> ..
                    </div>
                  )}
                  {githubLoading ? (
                    <div style={{ textAlign: 'center', padding: 20, color: T.outline, fontSize: 12 }}>{GITHUB_SIDEBAR.LOADING_FILES}</div>
                  ) : (
                    files.map(file => (
                      <div
                        key={file.sha}
                        onClick={() => {
                          if (file.type === 'dir') {
                            fetchFiles(selectedRepo.owner.login, selectedRepo.name, file.path);
                          } else {
                            if (isDiffMode && diffRightCode !== code && diffRightCode !== '') {
                              setPendingFileSelect(file);
                            } else {
                              handleFileImport(file);
                            }
                          }
                        }}
                        style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.surfaceHigh}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="msym" style={{ fontSize: 16, color: file.type === 'dir' ? '#fbbf24' : T.secondary }}>
                          {file.type === 'dir' ? 'folder' : 'description'}
                        </span>
                        <span style={{ fontSize: 12, color: T.onSurface, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                        {file.type === 'file' && <span style={{ fontSize: 10, color: T.outline }}>{file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* ── Editor Main Area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

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

          {/* File Info Bar (GitHub specific) */}
          {activeTab === TABS.GITHUB && importedFile && (
            <div style={{
              padding: '8px 16px',
              background: `${T.primary}15`,
              borderBottom: `1px solid ${T.surfaceHighest}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span className="msym" style={{ fontSize: 14, color: T.secondary }}>description</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.onSurface }}>
                {importedFile.name} — <span style={{ color: T.outline, fontWeight: 400 }}>Imported from GitHub</span>
              </span>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* ── Split Diff View ── */}
            {activeTab === TABS.GITHUB && isDiffMode ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Stats Bar */}
                <div style={{
                  background: '#131b2e', borderBottom: '1px solid #2d3449',
                  padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20,
                    padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  }}>● {removalsCount} {DIFF_CHECKER.LABEL_REMOVALS}</span>
                  <span style={{
                    background: 'rgba(52,211,153,0.15)', color: '#34d399',
                    border: '1px solid rgba(52,211,153,0.3)', borderRadius: 20,
                    padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  }}>● {additionsCount} {DIFF_CHECKER.LABEL_ADDITIONS}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#928ea1' }}>{DIFF_CHECKER.LABEL_LAST_COMPARED}</span>
                </div>

                {/* Two panels */}
                <div style={{ flex: 1, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

                  {/* LEFT PANEL */}
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #2d3449' }}>
                    {/* Header */}
                    <div style={{
                      background: '#1a2236', padding: '8px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: '1px solid #2d3449', flexShrink: 0,
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#928ea1', letterSpacing: '0.08em' }}>{DIFF_CHECKER.HEADER_ORIGINAL}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#928ea1', letterSpacing: '0.08em' }}>{leftLines.length} {DIFF_CHECKER.LINES_LABEL}</span>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(code); showToast(DIFF_CHECKER.COPY_TOOLTIP, 'success'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: '#928ea1', cursor: 'pointer', fontSize: 12 }}
                      ><span className="msym" style={{ fontSize: 14 }}>content_copy</span> {DIFF_CHECKER.COPY_TOOLTIP}</button>
                    </div>
                    {/* Body */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', background: '#060e20' }}>
                      {/* LEFT LINE NUMBERS */}
                      <div
                        ref={leftLineNumbersRef}
                        className="no-scrollbar"
                        style={{
                          width: 48, background: '#060e20',
                          padding: '8px 12px 8px 0', textAlign: 'right',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13, color: '#474555',
                          userSelect: 'none', overflowY: 'hidden',
                          flexShrink: 0, zIndex: 1,
                        }}
                      >
                        {leftLines.map((line, i) => (
                          <div key={i} style={{ 
                            height: 22.1, 
                            fontSize: 12,
                            background: line.type === 'removed' ? 'rgba(239,68,68,0.15)' : 'transparent',
                            color: line.type === 'removed' ? '#ef4444' : '#474555',
                          }}>{line.lineNum}</div>
                        ))}
                      </div>

                      {/* LEFT CODE PANEL */}
                      <div
                        ref={leftPanelRef}
                        className="no-scrollbar"
                        onScroll={() => {
                          if (leftLineNumbersRef.current && leftPanelRef.current) {
                            leftLineNumbersRef.current.scrollTop = leftPanelRef.current.scrollTop;
                          }
                        }}
                        style={{
                          flex: 1, overflow: 'auto', background: '#060e20',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                          padding: '8px 0',
                        }}
                      >
                        <div style={{ minWidth: 'max-content' }}>
                          {leftLines.map((line, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              height: 22.1,
                              width: '100%',
                            }}>
                              <div style={{ 
                                flex: 1, 
                                padding: '0 16px', 
                                background: line.type === 'removed' ? 'rgba(239,68,68,0.15)' : 'transparent',
                                color: line.type === 'removed' ? '#fca5a5' : '#c8c4d8',
                                whiteSpace: 'pre',
                              }}>
                                {line.type === 'removed' ? `- ${line.content}` : `  ${line.content}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT PANEL */}
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{
                      background: '#1a2236', padding: '8px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: '1px solid #2d3449', flexShrink: 0,
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#928ea1', letterSpacing: '0.08em' }}>{DIFF_CHECKER.HEADER_MODIFIED}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#928ea1', letterSpacing: '0.08em' }}>{diffRightCode ? diffRightCode.split('\n').length : 0} {DIFF_CHECKER.LINES_LABEL}</span>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(diffRightCode); showToast(DIFF_CHECKER.COPY_TOOLTIP, 'success'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: '#928ea1', cursor: 'pointer', fontSize: 12 }}
                      ><span className="msym" style={{ fontSize: 14 }}>content_copy</span> {DIFF_CHECKER.COPY_TOOLTIP}</button>
                    </div>
                    {/* Body — editable textarea with line numbers */}
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#060e20' }}>
                      {/* BACKGROUND LAYER (Continuous Highlights & Text) */}
                      <div
                        ref={rightBgRef}
                        className="no-scrollbar"
                        style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          padding: '8px 0', // match 8px top/bottom padding
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                          whiteSpace: 'pre', overflow: 'hidden',
                          pointerEvents: 'none', zIndex: 0,
                        }}
                      >
                        <div style={{ minWidth: 'max-content' }}>
                          {!diffRightCode ? (
                            <div style={{ paddingLeft: 64, color: '#474555', height: 22.1 }}>{DIFF_CHECKER.PLACEHOLDER_RIGHT}</div>
                          ) : (
                            rightLines.map((line, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                height: 22.1,
                                width: '100%',
                              }}>
                                <div style={{ width: 48, flexShrink: 0 }} /> {/* Spacer for line numbers */}
                                <div style={{ 
                                  flex: 1, 
                                  padding: '0 16px', 
                                  background: line.type === 'added' ? 'rgba(52,211,153,0.15)' : 'transparent',
                                  color: line.type === 'added' ? '#34d399' : '#dae2fd' 
                                }}>
                                  {line.content || ' '}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* FOREGROUND LAYER (Line Numbers + Textarea) */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'row', zIndex: 1 }}>
                        <div
                          ref={rightLineNumbersRef}
                          className="no-scrollbar"
                          style={{
                            width: 48, background: '#060e20',
                            padding: '8px 12px 8px 0', textAlign: 'right',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 13, color: '#474555',
                            userSelect: 'none', overflowY: 'hidden',
                            flexShrink: 0, zIndex: 1,
                          }}
                        >
                          {rightLines.length > 0 ? rightLines.map((line, i) => (
                            <div key={i} style={{ 
                              height: 22.1, 
                              fontSize: 12,
                              background: line.type === 'added' ? 'rgba(52,211,153,0.15)' : 'transparent',
                              color: line.type === 'added' ? '#34d399' : '#474555',
                            }}>{line.lineNum}</div>
                          )) : Array.from({ length: Math.max(leftLines.length, 1) }).map((_, i) => (
                            <div key={i} style={{ height: 22.1, fontSize: 12 }}>{i + 1}</div>
                          ))}
                        </div>

                        <textarea
                          ref={rightTextareaRef}
                          value={diffRightCode}
                          onChange={e => setDiffRightCode(e.target.value)}
                          onScroll={() => { 
                            if (rightLineNumbersRef.current && rightTextareaRef.current) rightLineNumbersRef.current.scrollTop = rightTextareaRef.current.scrollTop;
                            if (rightBgRef.current && rightTextareaRef.current) {
                              rightBgRef.current.scrollTop = rightTextareaRef.current.scrollTop;
                              rightBgRef.current.scrollLeft = rightTextareaRef.current.scrollLeft;
                            }
                          }}
                          spellCheck={false}
                          wrap="off"
                          className="no-scrollbar"
                          style={{
                            flex: 1, height: '100%',
                            background: 'transparent',
                            color: 'transparent', // Magic trick for custom editors
                            caretColor: '#dae2fd',
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                            lineHeight: '22.1px', padding: '8px 16px',
                            border: 'none', outline: 'none', resize: 'none', margin: 0,
                            whiteSpace: 'pre', overflow: 'auto',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Merge Buttons Row */}
                <div style={{
                  background: '#0d1627', borderTop: '1px solid #2d3449',
                  padding: '12px 24px', display: 'flex',
                  justifyContent: 'center', alignItems: 'center', gap: 16, flexShrink: 0,
                }}>
                  <button
                    onClick={() => { setDiffRightCode(code); showToast(DIFF_CHECKER.MERGED_TOAST, 'success'); }}
                    style={{
                      background: '#ef4444', color: '#fff', border: 'none',
                      padding: '10px 24px', borderRadius: 8, fontWeight: 600,
                      fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    }}
                  >{DIFF_CHECKER.MERGE_LEFT}</button>
                  <button
                    onClick={() => { setDiffRightCode(''); setIsDiffMode(false); }}
                    style={{
                      background: '#222a3d', color: '#928ea1',
                      border: '1px solid #474555',
                      width: 36, height: 36, borderRadius: 8,
                      fontSize: 16, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                  <button
                    onClick={() => { setCode(diffRightCode); showToast(DIFF_CHECKER.MERGED_TOAST, 'success'); }}
                    style={{
                      background: '#34d399', color: '#0b1326', border: 'none',
                      padding: '10px 24px', borderRadius: 8, fontWeight: 600,
                      fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    }}
                  >{DIFF_CHECKER.MERGE_RIGHT}</button>
                </div>
              </div>
            ) : (
              /* Normal editor — Paste, Upload, or GitHub without diff mode */
              <>
                {(activeTab === TABS.PASTE || (activeTab === TABS.GITHUB && !isDiffMode)) && (
                  <>
                    <div
                      ref={lineNumbersRef}
                      className="no-scrollbar"
                      style={{
                        width: 48, background: T.background,
                        borderRight: `1px solid ${T.surfaceHighest}`,
                        padding: '24px 12px 24px 0', textAlign: 'right',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13, color: T.outlineVariant,
                        userSelect: 'none', overflowY: 'hidden',
                        lineHeight: '1.7', flexShrink: 0,
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
                      placeholder={activeTab === TABS.GITHUB ? 'Select a file from the sidebar to import code...' : 'Paste your code here...'}
                      spellCheck={false}
                      className="no-scrollbar"
                      style={{
                        flex: 1, background: 'transparent', color: T.onSurface,
                        padding: 24, fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13, lineHeight: '1.7', resize: 'none',
                        border: 'none', outline: 'none', caretColor: T.primary,
                      }}
                    />
                  </>
                )}
                {activeTab === TABS.UPLOAD && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".js,.ts,.py,.java,.cpp,.c,.cs,.php,.rb,.go" />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%', maxWidth: 480, height: 320,
                        border: `2px dashed ${T.outlineVariant}`, borderRadius: 12,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.background = `${T.primary}08`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.outlineVariant; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span className="msym" style={{ fontSize: 48, color: T.primary, marginBottom: 16 }}>upload_file</span>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: T.onSurface, marginBottom: 8 }}>
                        {fileName || 'Upload your code file'}
                      </h3>
                      <p style={{ color: T.outline, fontSize: 13, textAlign: 'center', maxWidth: 280, marginBottom: 24 }}>
                        Drag and drop your file here, or click to browse. Max 10,000 characters.
                      </p>
                      <button style={{ padding: '10px 24px', background: T.surfaceHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 8, color: T.onSurface, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {fileName ? 'Change File' : 'Browse Files'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Status Bar ── */}
          <div style={{
            background: T.surfaceHigh,
            borderTop: `1px solid ${T.surfaceHighest}`,
            padding: '8px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px',
                background: T.surfaceHighest,
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
                  textTransform: 'uppercase',
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

            {!isDiffMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handleCopy}
                  style={btnBase}
                  onMouseEnter={e => { e.currentTarget.style.color = T.primary; e.currentTarget.style.background = `${T.primary}20`; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="msym" style={{ fontSize: 16 }}>content_copy</span>
                  Copy
                </button>
                <button
                  onClick={handleClear}
                  style={btnBase}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = '#ff6b6b15'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="msym" style={{ fontSize: 16 }}>delete</span>
                  Clear
                </button>
              </div>
            )}
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
          onClick={isDiffMode ? () => {
              if (!importedFile) {
                showToast('You must import a file from GitHub first to commit changes.', 'error');
                return;
              }
              const timestamp = new Date().getTime().toString().slice(-6);
              setCommitBranchName(`coderefine-manual-${timestamp}`);
              setShowCommitModal(true);
              setCommitResult(null);
          } : handleAnalyze}
          disabled={isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim())}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: isDiffMode ? '16px 20px' : '16px 36px',
            background: (isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim())) ? T.surfaceHighest : T.primary,
            color: (isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim())) ? T.outline : '#ffffff',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: 18,
            borderRadius: 12,
            border: 'none',
            cursor: (isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim())) ? 'not-allowed' : 'pointer',
            boxShadow: (isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim())) ? 'none' : `0 8px 32px ${T.primary}40`,
            opacity: (isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim())) ? 0.6 : 1,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={e => { if (!(isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim()))) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { if (!(isDiffMode ? !diffRightCode.trim() : (isAnalyzing || !code.trim()))) e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {isDiffMode ? 'Commit Changes' : (isAnalyzing ? 'Analyzing...' : 'Analyze Code')}
          <span className="msym analyze-arrow" style={{ fontSize: 22 }}>
            {isDiffMode ? 'commit' : 'arrow_forward'}
          </span>
        </button>
      </div>

      {/* Commit Modal */}
      {showCommitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, width: '100%', maxWidth: 500, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            {!commitResult ? (
              <>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#fff' }}>Commit Changes</h2>
                <div style={{ background: T.background, padding: 16, borderRadius: 12, marginBottom: 24, fontSize: 13, color: T.muted }}>
                  <p style={{ marginBottom: 8 }}>Repo: <span style={{ color: T.primary }}>{importedFile?.owner}/{importedFile?.repo}</span></p>
                  <p style={{ marginBottom: 8 }}>File: <span style={{ color: T.text }}>{importedFile?.path}</span></p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ margin: 0 }}>Branch:</p>
                    <input 
                      value={commitBranchName}
                      onChange={(e) => setCommitBranchName(e.target.value)}
                      style={{ 
                        flex: 1, background: 'transparent', border: 'none', 
                        color: T.success, fontSize: 13, padding: 0, outline: 'none', fontWeight: 600,
                        cursor: 'text', minWidth: 200
                      }}
                    />
                  </div>
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
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#fff' }}>Committed Successfully</h2>
                <p style={{ color: T.muted, marginBottom: 32 }}>Changes have been committed to the branch <br/> <span style={{ color: T.success }}>{commitResult.branch}</span></p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button 
                    onClick={() => window.open(commitResult.compareUrl, '_blank')}
                    style={{ padding: '14px', background: T.primary, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Create Pull Request
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

      {/* Unsaved Changes Modal */}
      {pendingFileSelect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, width: '100%', maxWidth: 400, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <span className="msym" style={{ color: '#ef4444', fontSize: 32 }}>warning</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#fff' }}>Unsaved Changes</h2>
            <p style={{ color: T.outline, marginBottom: 32, fontSize: 14 }}>
              You have uncommitted changes in the current file. If you switch files now, these changes will be lost.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setPendingFileSelect(null)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${T.outlineVariant}`, borderRadius: 12, color: T.outline, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleFileImport(pendingFileSelect);
                  setDiffRightCode('');
                  setPendingFileSelect(null);
                }}
                style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ReviewPage() {
  return (
    <div className="min-h-screen font-poppins" style={{ backgroundColor: T.background, color: T.onSurface }}>
      <Navbar />
      <Suspense fallback={
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <div className="spin-sq" style={{
            width: 40, height: 40,
            border: `3px solid ${T.primary}33`,
            borderTopColor: T.primary,
            borderRadius: 10,
          }} />
        </div>
      }>
        <ReviewContent />
      </Suspense>
    </div>
  );
}