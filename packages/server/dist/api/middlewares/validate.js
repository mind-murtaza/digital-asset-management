"use strict";
/**
 * Request Validation Middleware - Clean Zod Integration (TypeScript)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function formatValidationErrors(zodError) {
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
function validate(schema, source = 'body', options = {}) {
    return (req, res, next) => {
        try {
            const data = req[source] || {};
            const result = schema.safeParse(data);
            if (!result.success) {
                const { status = 400, mapError } = options;
                const errorResponse = mapError
                    ? mapError(result.error)
                    : formatValidationErrors(result.error);
                return res.status(status).json(errorResponse);
            }
            req[source] = result.data;
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
exports.default = { validate };
