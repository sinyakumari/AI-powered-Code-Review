'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UI, ROUTES, THEME, NAV_LINKS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push(ROUTES.LOGIN);
  };

  return (
    <nav 
      style={{ 
        backgroundColor: THEME.SURFACE,
        borderBottom: `1px solid ${THEME.BORDER}` 
      }}
      className="sticky top-0 z-50 w-full h-[64px] flex items-center justify-between px-8 font-poppins shadow-lg"
    >
      {/* Left Side: Brand */}
      <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2.5 group">
        <div 
          style={{ color: THEME.PRIMARY }}
          className="text-2xl font-bold tracking-tighter transition-transform group-hover:scale-110"
        >
          &lt;&gt;
        </div>
        <span 
          style={{ color: THEME.TEXT }}
          className="text-sm font-bold uppercase tracking-[0.1em]"
        >
          {UI.APP_NAME}
        </span>
      </Link>

      {/* Center Side: Navigation */}
      <div className="flex items-center gap-1.5">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{ 
                color: isActive ? THEME.TEXT : THEME.TEXT_MUTED,
                backgroundColor: isActive ? `${THEME.PRIMARY}15` : 'transparent'
              }}
              className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all duration-300 hover:text-white ${!isActive && 'hover:bg-white/5'}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Right Side: User & Logout */}
      <div className="flex items-center gap-6">
        <Link href={ROUTES.PROFILE} className="flex items-center gap-3 group/user cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 transition-all duration-300 group-hover/user:border-indigo-500 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5 text-slate-400 group-hover/user:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="flex flex-col">
            <span 
              style={{ color: THEME.TEXT }}
              className="text-[13px] font-bold group-hover/user:text-white transition-colors"
            >
              {user?.name || 'Account'}
            </span>
          </div>
        </Link>
        
        <div className="w-[100px] scale-90 origin-right">
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: THEME.PRIMARY,
              color: 'white',
              width: '100%',
              padding: '10px 16px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover:brightness-110 active:scale-95 flex items-center justify-center"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
