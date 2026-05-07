import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  github_id?: string;
  bio?: string;
  location?: string;
  timezone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  githubToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  setGithubToken: (token: string | null) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      githubToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        }
        set({ user, token, isAuthenticated: true });
      },

      setGithubToken: (token) => {
        if (typeof window !== 'undefined') {
          if (token) localStorage.setItem('github_token', token);
          else localStorage.removeItem('github_token');
        }
        set({ githubToken: token });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('github_token');
          localStorage.removeItem('github_import');
          localStorage.removeItem('review_code');
        }
        set({ 
          user: null, 
          token: null, 
          githubToken: null, 
          isAuthenticated: false 
        });
      },

      updateUser: (userData) => set((state) => {
        const newUser = state.user ? { ...state.user, ...userData } : null;
        if (newUser && typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(newUser));
        }
        return { user: newUser };
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recovery logic: if store is not authenticated but manual tokens exist, sync them
          if (!state.isAuthenticated && typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            if (token && userStr) {
              try {
                const user = JSON.parse(userStr);
                // Directly mutate state during rehydration to avoid multiple render cycles
                state.user = user;
                state.token = token;
                state.isAuthenticated = true;
              } catch (e) {
                console.error('Failed to recover legacy auth session', e);
              }
            }
          }
          state.setHasHydrated(true);
        }
      },
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        githubToken: state.githubToken,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
