import { create } from 'zustand';

interface Language {
  name: string;
  percentage: number;
}

interface Repo {
  name: string;
  html_url: string;
  updated_at?: string;
}

interface Contribution {
  date: string;
  count: number;
}

interface ProfileState {
  languages: Language[];
  repos: Repo[];
  contributions: Contribution[];
  loading: boolean;
  githubLoading: boolean;

  // Actions
  fetchGithubData: (token: string, githubToken: string) => Promise<void>;
  setGithubData: (data: { languages?: Language[], repos?: Repo[], contributions?: Contribution[] }) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  languages: [],
  repos: [],
  contributions: [],
  loading: false,
  githubLoading: false,

  setGithubData: (data) => set((state) => ({ ...state, ...data })),

  fetchGithubData: async (token, githubToken) => {
    set({ githubLoading: true });
    try {
      const headers = { 
        'x-github-token': githubToken,
        'Authorization': `Bearer ${token}`
      };
      
      const [langRes, repoRes, contribRes] = await Promise.all([
        fetch('/api/github/languages', { headers }),
        fetch('/api/github/repos', { headers }),
        fetch('/api/github/contributions', { headers })
      ]);

      const [langData, repoData, contribData] = await Promise.all([
        langRes.json(),
        repoRes.json(),
        contribRes.json()
      ]);

      set({
        languages: langData.success ? langData.languages : [],
        repos: repoData.success 
          ? repoData.repos.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 3)
          : [],
        contributions: contribData.success ? contribData.contributions : [],
        githubLoading: false
      });
    } catch (error) {
      // silent fail
      set({ githubLoading: false });
    }
  },

  reset: () => set({
    languages: [],
    repos: [],
    contributions: [],
    loading: false,
    githubLoading: false
  })
}));
