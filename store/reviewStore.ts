import { create } from 'zustand';

interface Review {
  review_id: number;
  parent_review_id: number;
  language: string;
  status: string;
  source: string;
  created_at: string;
  total_bugs: number;
  accepted_bugs: number;
  rejected_bugs: number;
  pending_bugs: number;
  severity?: string;
  suggestion?: string;
}

interface Pagination {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface ReviewState {
  reviews: Review[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
  filters: {
    status: string;
    language: string;
    page: number;
  };

  setFilters: (
    filters: Partial<ReviewState['filters']>
  ) => void;
  fetchHistory: (token: string) => Promise<void>;
  deleteReview: (
    reviewId: number, 
    token: string
  ) => Promise<boolean>;
}

export const useReviewStore = 
  create<ReviewState>((set, get) => ({
  reviews: [],
  pagination: null,
  loading: false,
  error: null,
  filters: {
    status: 'all',
    language: 'all',
    page: 1,
  },

  setFilters: (newFilters) => set((state) => ({
    filters: { 
      ...state.filters, 
      ...newFilters,
      page: (newFilters.status || newFilters.language) ? 1 : 
        (newFilters.page || state.filters.page)
    }
  })),

  fetchHistory: async (token) => {
    set({ loading: true, error: null });
    try {
      const { status, language, page } = 
        get().filters;
      const queryParams = new URLSearchParams();
      
      if (status !== 'all') {
        queryParams.append('status', status);
      }
      if (language !== 'all') {
        queryParams.append('language', language);
      }
      queryParams.append('page', page.toString());
      queryParams.append('limit', '8');

      const res = await fetch(
        `/api/reviews?${queryParams.toString()}`,
        {
          headers: { 
            Authorization: `Bearer ${token}` 
          },
        }
      );
      const data = await res.json();

      if (data.success) {
        set({ 
          reviews: data.reviews || [], 
          pagination: data.pagination,
          loading: false 
        });
      } else {
        set({ 
          error: data.message, 
          loading: false 
        });
      }
    } catch {
      set({ 
        error: 'Network error occurred', 
        loading: false 
      });
    }
  },

  deleteReview: async (suggestionId, token) => {
    try {
      const res = await fetch(
        `/api/suggestion/${suggestionId}`,
        {
          method: 'DELETE',
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          reviews: state.reviews.filter(
            r => r.review_id !== suggestionId
          )
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
