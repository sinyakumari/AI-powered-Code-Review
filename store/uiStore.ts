import { create } from 'zustand';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

interface UIState {
  toasts: Toast[];
  isCommitModalOpen: boolean;
  
  // Actions
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
  setCommitModal: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  isCommitModalOpen: false,

  showToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { message, type, id }]
    }));

    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),

  setCommitModal: (isOpen) => set({ isCommitModalOpen: isOpen })
}));
