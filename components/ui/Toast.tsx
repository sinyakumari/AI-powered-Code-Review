'use client';

import React, { useEffect } from 'react';
import { THEME } from '@/lib/constants';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#065f46', border: '#059669', text: '#ecfdf5' };
      case 'error':
        return { bg: '#7f1d1d', border: '#dc2626', text: '#fef2f2' };
      case 'info':
        return { bg: '#1e3a8a', border: '#2563eb', text: '#eff6ff' };
      default:
        return { bg: THEME.SURFACE, border: THEME.BORDER, text: THEME.TEXT };
    }
  };

  const colors = getColors();

  return (
    <div 
      className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div 
        style={{ 
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
        }}
        className="flex items-center gap-3 px-5 py-3.5 rounded-lg border min-w-[300px]"
      >
        <div className="flex-1 text-[13px] font-medium leading-relaxed">
          {message}
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-md transition-colors"
        >
          <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
