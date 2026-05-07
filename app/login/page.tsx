'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { MESSAGES, ROUTES, UI, THEME } from '@/lib/constants';
import Link from 'next/link';

import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // Ensure page starts fresh on mount
  React.useEffect(() => {
    setEmail('');
    setPassword('');
    setLoading(false);
    setIsSubmitting(false);
    setDisabled(false);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('error') === 'google_failed') {
        setError('Google authentication failed. Please try again.');
      } else if (urlParams.get('error') === 'github_failed') {
        setError('GitHub login failed. Please try again.');
      } else {
        setError('');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError(MESSAGES.ERROR.REQUIRED_FIELDS);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setAuth(data.user, data.token);
        router.push(ROUTES.DASHBOARD);
      } else {
        setError(data.message || MESSAGES.ERROR.INVALID_CREDENTIALS);
      }
    } catch (err) {
      setError(MESSAGES.ERROR.SERVER_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ backgroundColor: THEME.BACKGROUND }}
      className="min-h-screen flex items-center justify-center p-4 font-poppins"
    >
      <div 
        style={{ 
          backgroundColor: THEME.SURFACE,
          borderColor: THEME.BORDER 
        }}
        className="w-full max-w-md p-6 rounded-xl border shadow-2xl"
      >
        <div className="text-center mb-5">
          <h1 
            style={{ color: THEME.TEXT }}
            className="text-xl font-bold mb-1 tracking-tight"
          >
            {UI.LOGIN_TITLE}
          </h1>
          <p 
            style={{ color: THEME.TEXT_MUTED }}
            className="text-xs leading-relaxed"
          >
            {UI.LOGIN_SUBTITLE}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-0.5">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <div className="relative">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <button 
              type="button"
              style={{ color: THEME.PRIMARY }}
              className="absolute top-0 right-0 text-[10px] font-semibold hover:underline"
            >
              FORGOT?
            </button>
          </div>

          {error && (
            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-pulse">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              label={UI.BUTTON_LABELS.ANALYZE_CODE}
              type="submit"
              loading={loading || isSubmitting}
              disabled={disabled}
              fullWidth
            />
          </div>
        </form>

        {/* Social Login Section */}
        <div className="mt-5">
          <div className="relative flex items-center justify-center mb-4">
            <div className="border-t border-slate-700 w-full absolute"></div>
            <span 
              style={{ backgroundColor: THEME.SURFACE, color: THEME.TEXT_MUTED }} 
              className="px-3 text-[9px] font-bold tracking-[0.2em] relative"
            >
              {UI.DIVIDERS.OR_CONNECT}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={() => { window.location.href = '/api/auth/google' }}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {UI.BUTTON_LABELS.GOOGLE}
            </button>
            <button 
              onClick={() => { window.location.href = '/api/auth/github/login' }}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-slate-900 border border-slate-700 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
            >
              <span className="text-sm leading-none font-mono">&lt;&gt;</span>
              {UI.BUTTON_LABELS.GITHUB}
            </button>
          </div>
        </div>

        <div className="mt-5 text-center text-xs">
          <span style={{ color: THEME.TEXT_MUTED }}>
            New to the platform?{' '}
          </span>
          <Link 
            href={ROUTES.REGISTER}
            style={{ color: THEME.PRIMARY }}
            className="font-semibold hover:underline transition-colors"
          >
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}
