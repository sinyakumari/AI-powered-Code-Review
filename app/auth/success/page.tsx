'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

function AuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      const userStr = searchParams.get('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          
          // Use Zustand store instead of manual localStorage
          setAuth(user, token);
          
          // Redirect to dashboard
          router.push('/dashboard');
        } catch (err) {
          console.error('Failed to parse user data:', err);
          router.push('/login?error=auth_failed');
        }
      } else {
        router.push('/login?error=auth_failed');
      }
    };

    handleAuth();
  }, [router, searchParams, setAuth]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1326] text-[#dae2fd]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="w-12 h-12 border-4 border-[#2d3449] border-t-[#6d5bff] rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-semibold">Authenticating...</h2>
      <p className="text-[#c8c4d8] mt-2 text-sm">Please wait while we log you in.</p>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1326] text-[#dae2fd]" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="w-12 h-12 border-4 border-[#2d3449] border-t-[#6d5bff] rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Authenticating...</h2>
      </div>
    }>
      <AuthSuccessContent />
    </Suspense>
  );
}
