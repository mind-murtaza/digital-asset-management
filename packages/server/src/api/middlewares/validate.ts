/**
 * Request Validation Middleware - Clean Zod Integration (TypeScript)
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';

type RequestSource = 'body' | 'params' | 'query';

interface ValidateOptions {
    status?: number;
    mapError?: (error: ZodError) => any;
}

function formatValidationErrors(zodError: ZodError) {
    const errors = zodError.issues.map((issue) => ({
        field: issue.path.join('.') || 'root',
        message: issue.message,
        code: issue.code,
    }));

    return {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
    };
}

export function validate(
    schema: ZodTypeAny,
    source: RequestSource = 'body',
    options: ValidateOptions = {},
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = (req as any)[source] || {};
            const result = schema.safeParse(data);
            if (!result.success) {
                const { status = 400, mapError } = options;
                const errorResponse = mapError
                    ? mapError(result.error)
                    : formatValidationErrors(result.error);
                return res.status(status).json(errorResponse);
            }
            (req as any)[source] = result.data;
            next();
        } catch (error) {
            next(error);
        }
    };
}

export default { validate };
