'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { MESSAGES, ROUTES, UI, THEME } from '@/lib/constants';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      return MESSAGES.ERROR.REQUIRED_FIELDS;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return MESSAGES.ERROR.INVALID_EMAIL;
    }
    if (formData.password.length < 6) {
      return MESSAGES.ERROR.PASSWORD_MIN_LENGTH;
    }
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(ROUTES.LOGIN);
        }, 2000);
      } else {
        setError(data.message || MESSAGES.ERROR.SERVER_ERROR);
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
        className="w-full max-w-md min-h-[95vh] p-8 rounded-xl border shadow-2xl transition-all duration-300 flex flex-col justify-between"
      >
        <div className="text-center">
          <h1 
            style={{ color: THEME.TEXT }}
            className="text-2xl font-bold mb-1 tracking-tight"
          >
            {UI.REGISTER_TITLE}
          </h1>
          <p 
            style={{ color: THEME.TEXT_MUTED }}
            className="text-xs leading-relaxed"
          >
            {UI.REGISTER_SUBTITLE}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-0.5 mt-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <Input
              label="Confirm"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
          </div>

          {error && (
            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-pulse">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-3 p-2 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
              {MESSAGES.SUCCESS.REGISTERED} Redirecting...
            </div>
          )}

          <div className="pt-2">
            <Button
              label={UI.BUTTON_LABELS.CREATE_ACCOUNT}
              type="submit"
              loading={loading}
            />
          </div>
        </form>

        <div className="mt-4">
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
            <button className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {UI.BUTTON_LABELS.GOOGLE}
            </button>
            <button className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-slate-900 border border-slate-700 text-white font-semibold text-xs hover:bg-slate-800 transition-colors">
              <span className="text-sm leading-none font-mono">&lt;&gt;</span>
              {UI.BUTTON_LABELS.GITHUB}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs">
          <span style={{ color: THEME.TEXT_MUTED }}>
            Already have an account?{' '}
          </span>
          <Link 
            href={ROUTES.LOGIN}
            style={{ color: THEME.PRIMARY }}
            className="font-semibold hover:underline transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
