/**
 * API Response Messages
 */
export const MESSAGES = {
  SUCCESS: {
    REGISTERED: "User registered successfully",
    LOGGED_IN: "Login successful",
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
  JWT_EXPIRY: "7d",
  BCRYPT_SALT_ROUNDS: 10,
};

export const REVIEW_STATUS = {
  PENDING: 'pending',
  FIXED: 'fixed',
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
};

export const NAV_LINKS = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD },
  { label: 'Review', href: ROUTES.REVIEW },
  { label: 'History', href: ROUTES.HISTORY },
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
