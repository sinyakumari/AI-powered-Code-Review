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

/**
 * Route Constants
 */
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
};

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
