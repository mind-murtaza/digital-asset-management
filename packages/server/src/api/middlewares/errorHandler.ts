/**
 * Centralized Error Handling Middleware (TypeScript)
 */
import type { Request, Response, NextFunction } from 'express';
import {
    ERROR_CLASSIFICATIONS,
    ERROR_CONFIG,
    SENSITIVE_PATTERNS,
} from '../../utils/constant/errors';

function sanitizeSensitiveData(text?: string): string | undefined {
    if (!text || !ERROR_CONFIG.SANITIZE_SENSITIVE_DATA) return text;
    let sanitized = text;
    SENSITIVE_PATTERNS.forEach((pattern) => {
        sanitized = sanitized!.replace(pattern, '[REDACTED]');
    });
    return sanitized;
}

function classifyError(error: any) {
    const errorCode = error.code || error.name || 'UNKNOWN_ERROR';
    const classification = ERROR_CLASSIFICATIONS[errorCode];
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
            severity: 'low' as const,
            code: 'VALIDATION_ERROR',
        };
    }
    if (error.name === 'CastError') {
        return {
            status: 400,
            category: 'validation',
            severity: 'low' as const,
            code: 'INVALID_ID_FORMAT',
        };
    }
    if (error.code === 11000) {
        return {
            status: 409,
            category: 'database',
            severity: 'low' as const,
            code: 'DUPLICATE_KEY_ERROR',
        };
    }
    if (error.name === 'MongoNetworkError') {
        return {
            status: 503,
            category: 'database',
            severity: 'critical' as const,
            code: 'DATABASE_CONNECTION_ERROR',
        };
    }
    return {
        status: error.status || 500,
        category: 'system',
        severity: 'high' as const,
        code: 'INTERNAL_SERVER_ERROR',
    };
}

function extractRequestContext(req: Request) {
    const correlationId =
        (req as any).correlationId || req.headers['x-correlation-id'] || undefined;
    return {
        correlationId,
        method: req.method,
        url: (req as any).originalUrl || req.url,
        userAgent: req.headers['user-agent'],
        ip: (req as any).ip || (req as any).connection?.remoteAddress,
        userId: (req as any).auth?.userId || null,
        email: (req as any).auth?.email || null,
        timestamp: new Date().toISOString(),
    };
}

function buildErrorResponse(error: any, context: any, classification: any) {
    const base: any = {
        success: false,
        error:
            sanitizeSensitiveData(error.message?.slice(0, ERROR_CONFIG.MAX_ERROR_MESSAGE_LENGTH)) ||
            'An error occurred',
        code: classification.code,
    };
    if (ERROR_CONFIG.INCLUDE_TIMESTAMP) base.timestamp = context.timestamp;
    if (ERROR_CONFIG.INCLUDE_REQUEST_ID && context.correlationId)
        base.correlationId = context.correlationId;
    if (ERROR_CONFIG.EXPOSE_ERROR_DETAILS) {
        if (error.details) base.details = error.details;
        if (ERROR_CONFIG.EXPOSE_STACK_TRACES && error.stack)
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

function logError(error: any, context: any, classification: any) {
    if (!ERROR_CONFIG.ENABLE_CONSOLE_LOGGING) return;
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
        ...(ERROR_CONFIG.EXPOSE_STACK_TRACES && {
            stack: sanitizeSensitiveData(error.stack),
        }),
        ...(ERROR_CONFIG.EXPOSE_ERROR_DETAILS && error.details && { details: error.details }),
    };
    if (ERROR_CONFIG.IS_DEVELOPMENT) {
        console.error('[ERROR]', JSON.stringify(logData, null, 2));
    } else {
        console.error(JSON.stringify(logData));
    }
}

export default function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) return next(err);
    try {
        const context = extractRequestContext(req);
        const classification = classifyError(err);
        logError(err, context, classification);
        const payload = buildErrorResponse(err, context, classification);
        res.status(classification.status).json(payload);
    } catch (handlerError: any) {
        console.error('Error handler failed:', handlerError);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'ERROR_HANDLER_FAILURE',
            ...(ERROR_CONFIG.INCLUDE_TIMESTAMP && {
                timestamp: new Date().toISOString(),
            }),
        });
    }
}
