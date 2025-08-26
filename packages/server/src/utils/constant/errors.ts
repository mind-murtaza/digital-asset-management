const ERROR_CONFIG = {
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    ENABLE_CONSOLE_LOGGING: process.env.NODE_ENV !== 'test',
    EXPOSE_STACK_TRACES: process.env.NODE_ENV === 'development',
    EXPOSE_ERROR_DETAILS: process.env.NODE_ENV !== 'production',
    SANITIZE_SENSITIVE_DATA: true,
    INCLUDE_REQUEST_ID: true,
    INCLUDE_TIMESTAMP: true,
    MAX_ERROR_MESSAGE_LENGTH: 500,
};

const ERROR_CLASSIFICATIONS: Record<
    string,
    {
        status: number;
        category: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }
> = {
    INVALID_CREDENTIALS: { status: 401, category: 'auth', severity: 'medium' },
    TOKEN_VERIFICATION_ERROR: {
        status: 401,
        category: 'auth',
        severity: 'medium',
    },
    TOKEN_REQUIRED: { status: 401, category: 'auth', severity: 'low' },
    ACCOUNT_STATUS_ERROR: { status: 403, category: 'auth', severity: 'medium' },
    USER_NOT_FOUND: { status: 401, category: 'auth', severity: 'low' },
    MISSING_AUTH_HEADER: { status: 401, category: 'auth', severity: 'low' },
    INVALID_AUTH_HEADER: { status: 401, category: 'auth', severity: 'low' },
    VALIDATION_ERROR: { status: 400, category: 'validation', severity: 'low' },
    MULTI_VALIDATION_ERROR: {
        status: 400,
        category: 'validation',
        severity: 'low',
    },
    PAYLOAD_TOO_LARGE: {
        status: 413,
        category: 'validation',
        severity: 'medium',
    },
    DATABASE_ERROR: { status: 500, category: 'database', severity: 'high' },
    DUPLICATE_KEY_ERROR: { status: 409, category: 'database', severity: 'low' },
    DOCUMENT_NOT_FOUND: { status: 404, category: 'database', severity: 'low' },
    CONNECTION_ERROR: { status: 503, category: 'database', severity: 'critical' },
    BUSINESS_RULE_VIOLATION: {
        status: 422,
        category: 'business',
        severity: 'medium',
    },
    RESOURCE_CONFLICT: { status: 409, category: 'business', severity: 'medium' },
    INSUFFICIENT_PERMISSIONS: {
        status: 403,
        category: 'business',
        severity: 'medium',
    },
    RATE_LIMIT_EXCEEDED: { status: 429, category: 'system', severity: 'medium' },
    SERVICE_UNAVAILABLE: { status: 503, category: 'system', severity: 'high' },
    TIMEOUT_ERROR: { status: 408, category: 'system', severity: 'medium' },
    EXTERNAL_SERVICE_ERROR: {
        status: 502,
        category: 'external',
        severity: 'high',
    },
};

const SENSITIVE_PATTERNS: RegExp[] = [
    /password['":\s]*[^,}\s]*/gi,
    /token['":\s]*[^,}\s]*/gi,
    /secret['":\s]*[^,}\s]*/gi,
    /key['":\s]*[^,}\s]*/gi,
    /authorization['":\s]*bearer\s+[^,}\s]*/gi,
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

export { ERROR_CONFIG, ERROR_CLASSIFICATIONS, SENSITIVE_PATTERNS };
