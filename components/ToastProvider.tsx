'use client';

import React from 'react';
import Toast from '@/components/ui/Toast';
import { useUIStore } from '@/store/uiStore';

export default function ToastProvider() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{ 
            position: 'fixed', 
            bottom: `${20 + (index * 80)}px`, 
            right: '20px', 
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
        >
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => removeToast(toast.id)} 
          />
        </div>
      ))}
    </>
  );
}
