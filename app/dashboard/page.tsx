'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ReviewCard from '@/components/features/ReviewCard';
import { THEME, ROUTES, BADGE_VARIANTS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    
    const isActuallyAuthenticated = isAuthenticated || (typeof window !== 'undefined' && !!localStorage.getItem('token'));
    
    if (!isActuallyAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isAuthenticated, _hasHydrated, router]);

  const mockReviews = [
    { filename: 'auth_service.ts', status: BADGE_VARIANTS.IN_PROGRESS as any, statusLabel: 'IN PROGRESS', date: 'Oct 24, 2023', issuesCount: 12 },
    { filename: 'payment_gateway.py', status: BADGE_VARIANTS.RESOLVED as any, statusLabel: 'RESOLVED', date: 'Oct 22, 2023', issuesCount: 4 },
    { filename: 'user_profile.jsx', status: BADGE_VARIANTS.CLEAN as any, statusLabel: 'CLEAN', date: 'Oct 20, 2023', issuesCount: 0 },
  ];

  return (
    <div style={{ backgroundColor: THEME.BACKGROUND }} className="min-h-screen font-poppins selection:bg-indigo-500/30">
      <Navbar />
      
      <main style={{ 
        maxWidth: 1350, 
        marginLeft: '40px', 
        marginRight: '40px', 
        padding: '24px 0' 
      }}>
        {/* Welcome Section */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 style={{ color: THEME.TEXT }} className="text-3xl font-bold mb-2 tracking-tight">
              Welcome, {user?.name || 'Developer'}!
            </h1>
            <p style={{ color: THEME.TEXT_MUTED }} className="text-sm font-medium">
              Ready to analyze your latest commits? Your AI workspace is standing by.
            </p>
          </div>
          <div className="w-[180px]">
            <button
              onClick={() => router.push(ROUTES.REVIEW)}
              style={{
                backgroundColor: THEME.PRIMARY,
                color: '#fff',
                width: '100%',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                minWidth: 180,
                whiteSpace: 'nowrap',
                boxShadow: `0 4px 20px ${THEME.PRIMARY}40`,
                transition: 'all 0.3s ease'
              }}
              className="hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              Start New Review
            </button>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { 
              id: 'paste',
              title: 'Paste Code', 
              subtitle: 'Directly analyze code snippets', 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )
            },
            { 
              id: 'upload',
              title: 'Upload Code', 
              subtitle: 'Select files from your local drive', 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )
            },
            { 
              id: 'github',
              title: 'Import from GitHub', 
              subtitle: 'Connect repositories directly', 
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              )
            }
          ].map((card, i) => (
            <div 
              key={i}
              onClick={() => router.push(`${ROUTES.REVIEW}?tab=${card.id}`)}
              style={{ backgroundColor: THEME.SURFACE, borderColor: THEME.BORDER }}
              className="p-8 rounded-2xl border hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group"
            >
              <div style={{ color: THEME.PRIMARY }} className="mb-6 p-3 rounded-lg bg-indigo-500/10 w-fit group-hover:scale-110 transition-transform">
                {card.icon}
              </div>
              <h3 style={{ color: THEME.TEXT }} className="text-xl font-bold mb-2">
                {card.title}
              </h3>
              <p style={{ color: THEME.TEXT_MUTED }} className="text-xs leading-relaxed">
                {card.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Recent AI Insight */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <h2 style={{ color: THEME.TEXT }} className="text-xl font-bold tracking-tight">
                Recent AI Insight
              </h2>
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
            </div>
            <div 
              style={{ backgroundColor: THEME.SURFACE, borderColor: THEME.BORDER }}
              className="p-8 rounded-2xl border shadow-sm"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Badge label="CRITICAL" variant={BADGE_VARIANTS.CRITICAL as any} />
                  <h3 style={{ color: THEME.TEXT }} className="text-lg font-bold mt-3">
                    Insecure Password Hashing detected
                  </h3>
                </div>
                <div className="w-[120px]">
                   <button
                     onClick={() => {}}
                     style={{
                       backgroundColor: THEME.PRIMARY,
                       color: '#fff',
                       width: '100%',
                       padding: '10px 16px',
                       borderRadius: '8px',
                       fontSize: '12px',
                       fontWeight: 700,
                       transition: 'all 0.2s'
                     }}
                     className="hover:brightness-110 active:scale-95"
                   >
                     Apply Fix
                   </button>
                </div>
              </div>
              <div className="bg-[#0b1326] p-5 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner">
                <div className="flex gap-4 opacity-50">
                  <span className="text-slate-600 w-4 text-right">41</span>
                  <span className="text-slate-300">const pass = req.body.password;</span>
                </div>
                <div className="flex gap-4 bg-red-500/10 py-0.5 border-l-2 border-red-500/50">
                  <span className="text-red-500/50 w-4 text-right">42</span>
                  <span className="text-red-400">- const hashed = crypto.createHash(&apos;md5&apos;).update(pass).digest();</span>
                </div>
                <div className="flex gap-4 bg-green-500/10 py-0.5 border-l-2 border-green-500/50">
                  <span className="text-green-500/50 w-4 text-right">42</span>
                  <span className="text-green-400">+ const hashed = await bcrypt.hash(pass, 10);</span>
                </div>
                <div className="flex gap-4 opacity-50">
                  <span className="text-slate-600 w-4 text-right">43</span>
                  <span className="text-slate-300">saveToDatabase(hashed);</span>
                </div>
              </div>
              <div className="flex gap-3 items-start mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <svg className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ color: THEME.TEXT_MUTED }} className="text-xs leading-relaxed italic">
                  &ldquo;MD5 is cryptographically broken and should not be used for password hashing. Switching to Bcrypt ensures higher security standards by implementing salt and adaptive hashing.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="lg:col-span-5">
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ color: THEME.TEXT }} className="text-xl font-bold tracking-tight">
                Recent Reviews
              </h2>
            </div>
            <div className="space-y-4">
              {mockReviews.map((review, i) => (
                <ReviewCard key={i} {...review} />
              ))}
            </div>
            <button 
              onClick={() => router.push(ROUTES.HISTORY)}
              style={{ color: THEME.PRIMARY }}
              className="mt-8 text-[13px] font-bold flex items-center gap-2 hover:translate-x-1 transition-transform group"
            >
              View Full History 
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
