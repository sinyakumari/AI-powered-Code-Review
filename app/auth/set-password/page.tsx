'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { MESSAGES, ROUTES, THEME } from '@/lib/constants';

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (urlToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        localStorage.setItem('token', urlToken);
        localStorage.setItem('user', JSON.stringify({
          user_id: user.user_id,
          name: user.name,
          email: user.email
        }));
        setToken(urlToken);
      } catch (err) {
        console.error('Failed to parse user data:', err);
        router.push('/login?error=auth_failed');
      }
    } else {
      router.push('/login?error=auth_failed');
    }
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(MESSAGES.ERROR.PASSWORD_REQUIRED);
      return;
    }

    if (password !== confirmPassword) {
      setError(MESSAGES.ERROR.PASSWORD_MISMATCH);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(ROUTES.DASHBOARD);
      } else {
        setError(data.message || MESSAGES.ERROR.SERVER_ERROR);
      }
    } catch (err) {
      setError(MESSAGES.ERROR.SERVER_ERROR);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1326] text-[#dae2fd]" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="w-12 h-12 border-4 border-[#2d3449] border-t-[#6d5bff] rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Initializing...</h2>
      </div>
    );
  }

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
        className="w-full max-w-md p-8 rounded-xl border shadow-2xl flex flex-col justify-between"
      >
        <div className="text-center mb-6">
          <h1 
            style={{ color: THEME.TEXT }}
            className="text-2xl font-bold mb-1 tracking-tight"
          >
            Set Your Password
          </h1>
          <p 
            style={{ color: THEME.TEXT_MUTED }}
            className="text-xs leading-relaxed"
          >
            Please set a password to complete your account setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
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
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />

          {error && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-pulse">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              label="Save Password →"
              type="submit"
              loading={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1326] text-[#dae2fd]" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="w-12 h-12 border-4 border-[#2d3449] border-t-[#6d5bff] rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Loading...</h2>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
