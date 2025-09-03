"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = errorHandler;
const errors_1 = require("../../utils/constant/errors");
function sanitizeSensitiveData(text) {
    if (!text || !errors_1.ERROR_CONFIG.SANITIZE_SENSITIVE_DATA)
        return text;
    let sanitized = text;
    errors_1.SENSITIVE_PATTERNS.forEach((pattern) => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
}
function classifyError(error) {
    const errorCode = error.code || error.name || 'UNKNOWN_ERROR';
    const classification = errors_1.ERROR_CLASSIFICATIONS[errorCode];
    if (classification) {
        return {
            status: error.status || classification.status,
            category: classification.category,
            severity: classification.severity,
            code: errorCode,
        };
    }
    if (error.name === 'ValidationError') {
        return {
            status: 400,
            category: 'validation',
            severity: 'low',
            code: 'VALIDATION_ERROR',
        };
    }
    if (error.name === 'CastError') {
        return {
            status: 400,
            category: 'validation',
            severity: 'low',
            code: 'INVALID_ID_FORMAT',
        };
    }
    if (error.code === 11000) {
        return {
            status: 409,
            category: 'database',
            severity: 'low',
            code: 'DUPLICATE_KEY_ERROR',
        };
    }
    if (error.name === 'MongoNetworkError') {
        return {
            status: 503,
            category: 'database',
            severity: 'critical',
            code: 'DATABASE_CONNECTION_ERROR',
        };
    }
    return {
        status: error.status || 500,
        category: 'system',
        severity: 'high',
        code: 'INTERNAL_SERVER_ERROR',
    };
}
function extractRequestContext(req) {
    const correlationId = req.correlationId || req.headers['x-correlation-id'] || undefined;
    return {
        correlationId,
        method: req.method,
        url: req.originalUrl || req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection?.remoteAddress,
        userId: req.auth?.userId || null,
        email: req.auth?.email || null,
        timestamp: new Date().toISOString(),
    };
}
function buildErrorResponse(error, context, classification) {
    const base = {
        success: false,
        error: sanitizeSensitiveData(error.message?.slice(0, errors_1.ERROR_CONFIG.MAX_ERROR_MESSAGE_LENGTH)) ||
            'An error occurred',
        code: classification.code,
    };
    if (errors_1.ERROR_CONFIG.INCLUDE_TIMESTAMP)
        base.timestamp = context.timestamp;
    if (errors_1.ERROR_CONFIG.INCLUDE_REQUEST_ID && context.correlationId)
        base.correlationId = context.correlationId;
    if (errors_1.ERROR_CONFIG.EXPOSE_ERROR_DETAILS) {
        if (error.details)
            base.details = error.details;
        if (errors_1.ERROR_CONFIG.EXPOSE_STACK_TRACES && error.stack)
            base.stack = sanitizeSensitiveData(error.stack);
        base.context = {
            category: classification.category,
            severity: classification.severity,
            method: context.method,
            url: context.url,
        };
    }
    return base;
}
function logError(error, context, classification) {
    if (!errors_1.ERROR_CONFIG.ENABLE_CONSOLE_LOGGING)
        return;
    const logData = {
        level: 'error',
        message: sanitizeSensitiveData(error.message),
        error: {
            name: error.name,
            code: classification.code,
            category: classification.category,
            severity: classification.severity,
            status: classification.status,
        },
        context,
        ...(errors_1.ERROR_CONFIG.EXPOSE_STACK_TRACES && {
            stack: sanitizeSensitiveData(error.stack),
        }),
        ...(errors_1.ERROR_CONFIG.EXPOSE_ERROR_DETAILS && error.details && { details: error.details }),
    };
    if (errors_1.ERROR_CONFIG.IS_DEVELOPMENT) {
        console.error('[ERROR]', JSON.stringify(logData, null, 2));
    }
    else {
        console.error(JSON.stringify(logData));
    }
}
function errorHandler(err, req, res, next) {
    if (res.headersSent)
        return next(err);
    try {
        const context = extractRequestContext(req);
        const classification = classifyError(err);
        logError(err, context, classification);
        const payload = buildErrorResponse(err, context, classification);
        res.status(classification.status).json(payload);
    }
    catch (handlerError) {
        console.error('Error handler failed:', handlerError);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'ERROR_HANDLER_FAILURE',
            ...(errors_1.ERROR_CONFIG.INCLUDE_TIMESTAMP && {
                timestamp: new Date().toISOString(),
            }),
        });
    }
}
