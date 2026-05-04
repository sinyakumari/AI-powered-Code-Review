/**
 * API Response Messages
 */
export const MESSAGES = {
  SUCCESS: {
    REGISTERED: "User registered successfully",
    LOGGED_IN: "Login successful",
    SUGGESTION_ACCEPTED: "Suggestion accepted successfully",
    SUGGESTION_REJECTED: "Suggestion rejected",
    REVIEW_DELETED: 'Review deleted successfully',
    REVIEW_STATUS_UPDATED: 'Review status updated successfully',
    GOOGLE_LOGIN: 'Google login successful',
    GOOGLE_REGISTER: 'Account created with Google',
    PASSWORD_SET: 'Password set successfully',
    GITHUB_LOGIN: 'GitHub login successful',
    GITHUB_REGISTER: 'Account created with GitHub',
    PROFILE_UPDATED: 'Profile updated successfully',
  },
  ERROR: {
    REQUIRED_FIELDS: "All fields are required",
    INVALID_EMAIL: "Invalid email format",
    PASSWORD_MIN_LENGTH: "Password must be at least 6 characters long",
    EMAIL_ALREADY_EXISTS: "Email already registered",
    INVALID_CREDENTIALS: "Invalid email or password",
    DB_CONNECTION_ERROR: "Database connection failed",
    SERVER_ERROR: "An unexpected error occurred",
    UNAUTHORIZED: "Unauthorized access",
    TOKEN_EXPIRED: "Token expired",
    TOKEN_INVALID: "Invalid token",
    REVIEW_NOT_FOUND: "Review not found",
    INVALID_SOURCE: "Invalid source type",
    SUGGESTION_NOT_FOUND: "Suggestion not found",
    HISTORY_FETCH_FAILED: 'Failed to fetch review history',
    INVALID_STATUS: 'Invalid status value',
    GOOGLE_AUTH_FAILED: 'Google authentication failed',
    GOOGLE_TOKEN_FAILED: 'Failed to get Google token',
    GITHUB_AUTH_FAILED: 'GitHub authentication failed',
    GITHUB_TOKEN_FAILED: 'Failed to get GitHub token',
    GITHUB_FILE_TOO_LARGE: 'File too large for analysis',
    GITHUB_FETCH_FAILED: 'Failed to fetch from GitHub',
    PASSWORD_REQUIRED: 'Password must be at least 8 characters',
    PASSWORD_MISMATCH: 'Passwords do not match',
    PROFILE_NOT_FOUND: 'Profile not found',
    PROFILE_UPDATE_FAILED: 'Failed to update profile',
    INVALID_INPUT: 'Invalid input provided',
  },
};

/**
 * HTTP Status Codes
 */
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Auth Constants
 */
export const AUTH = {
  JWT_EXPIRY: '7d' as const,
  BCRYPT_SALT_ROUNDS: 10,
};

export const REVIEW_STATUS = {
  PENDING: 'pending',
  FIXED: 'fixed',
  REJECTED: 'rejected',
};

export const SUGGESTION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const SOURCE = {
  PASTE: 'paste',
  UPLOAD: 'upload',
  GITHUB: 'github',
};

export const OPENAI = {
  MODEL: 'llama-3.3-70b-versatile',
  MAX_TOKENS: 2000,
};

/**
 * Route Constants
 */
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  REVIEW: '/review',
  HISTORY: '/history',
  AUTH_SUCCESS: '/auth/success',
  SET_PASSWORD: '/auth/set-password',
  GITHUB_AUTH: '/api/auth/github',
  GITHUB_LOGIN_AUTH: '/api/auth/github/login',
  PROFILE: '/profile',
};

export const NAV_LINKS = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD },
  { label: 'Review', href: ROUTES.REVIEW },
  { label: 'History', href: ROUTES.HISTORY },
  { label: 'Profile', href: ROUTES.PROFILE },
];

/**
 * UI Constants
 */
export const UI = {
  APP_NAME: 'CodeRefine AI',
  LOGIN_TITLE: 'Enter Workspace',
  LOGIN_SUBTITLE: 'Securely access your AI-powered code review and bug detection workspace.',
  REGISTER_TITLE: 'Create Account',
  REGISTER_SUBTITLE: 'Join the Code review and bug fixing community',
  BUTTON_LABELS: {
    ANALYZE_CODE: 'Analyze Code →',
    CREATE_ACCOUNT: 'Create Account →',
    GOOGLE: 'Google',
    GITHUB: 'GitHub',
  },
  DIVIDERS: {
    OR_CONNECT: 'OR CONNECT VIA',
  }
};

/**
 * Badge Constants
 */
export const BADGE_VARIANTS = {
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved', 
  CLEAN: 'clean',
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const BADGE_COLORS = {
  in_progress: { bg: '#1e293b', text: '#3b82f6', border: '#1d4ed8' },
  resolved: { bg: '#14532d', text: '#4ade80', border: '#166534' },
  clean: { bg: '#334155', text: '#94a3b8', border: '#475569' },
  critical: { bg: '#450a0a', text: '#f87171', border: '#7f1d1d' },
  high: { bg: '#431407', text: '#fb923c', border: '#7c2d12' },
  medium: { bg: '#422006', text: '#fbbf24', border: '#713f12' },
  low: { bg: '#064e3b', text: '#34d399', border: '#065f46' },
  fixed: { bg: '#064e3b', text: '#34d399', border: '#065f46' },
  pending: { bg: '#422006', text: '#fbbf24', border: '#713f12' },
  rejected: { bg: '#450a0a', text: '#f87171', border: '#7f1d1d' },
  project: { bg: '#222a3d', text: '#a6e6ff', border: '#474555' },
};

/**
 * Theme Colors (Midnight Technical)
 */
export const THEME = {
  BACKGROUND: '#0b1326',
  SURFACE: '#171f33',
  PRIMARY: '#6d5bff',
  PRIMARY_HOVER: '#553fe6',
  TEXT: '#dae2fd',
  TEXT_MUTED: '#c8c4d8',
  BORDER: '#2d3449',
};

/**
 * Profile Design Tokens
 */
export const PROFILE_TOKENS = {
  background: '#0b1326',
  surface: '#131b2e',
  surfaceHigh: '#222a3d',
  surfaceHighest: '#2d3449',
  primary: '#6d5bff',
  primaryLight: '#c6c0ff',
  onSurface: '#dae2fd',
  onSurfaceVariant: '#c8c4d8',
  outline: '#928ea1',
  outlineVariant: '#474555',
  secondary: '#a6e6ff',
  success: '#34d399',
};


export const EDITOR = {
  MAX_CHARS: 10000,
  DEBOUNCE_MS: 1000,
  DRAFT_KEY: 'draft_code',
  SAMPLE_CODE: `function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i <= items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  eval("console.log(total)");
  return total;
}`
}

export const TABS = {
  PASTE: 'paste',
  UPLOAD: 'upload',
  GITHUB: 'github',
}

export const DIFF = {
  ACCEPT_MSG: 'Suggestion accepted! Great choice.',
  REJECT_MSG: 'Suggestion rejected.',
  ALL_REVIEWED: 'All suggestions reviewed!',
  NO_SUGGESTIONS: 'No suggestions found for this review.',
  BACK: '← Back',
}

export const GITHUB = {
  AUTH_FAILED: 'GitHub authentication failed',
  CONNECT_TITLE: 'Connect to GitHub',
  CONNECT_DESC: 'Import your repositories and select files for deep AI analysis.',
  CONNECT_BTN: 'Connect GitHub Account',
  REPOS_TITLE: 'Select Repository',
  DISCONNECT: 'Disconnect',
  LOADING_REPOS: 'Fetching your repositories...',
  LOADING_FILES: 'Loading repository contents...',
  IMPORT_SUCCESS: 'File imported successfully!',
  FILE_TOO_LARGE: 'File too large for analysis (max 10,000 characters)',
};

export const PROFILE = {
  EDIT_TITLE: 'Edit Profile',
  SAVE_BTN: 'Save Changes',
  CANCEL_BTN: 'Cancel',
  CONNECT_GITHUB: 'Connect GitHub to see data',
  NO_BIO: 'Add a bio',
  NO_USERNAME: 'Set username',
  CONTRIBUTION_TITLE: 'CONTRIBUTION MATRIX',
  CONTRIBUTION_SUBTITLE: 'Activity and commits across the organization over the last year.',
  TECH_STACK_TITLE: 'CORE TECH STACK',
  PROJECTS_TITLE: 'ACTIVE PROJECTS',
};
