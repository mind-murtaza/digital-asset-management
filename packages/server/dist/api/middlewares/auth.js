"use strict";
/**
 * JWT Authentication Middleware (TypeScript)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const auth_schema_1 = require("../../schemas/auth.schema");
const auth_service_1 = require("../../services/auth.service");
const dao_1 = require("../../dao");
async function auth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER',
            });
            return;
        }
        const headerValidation = auth_schema_1.authHeaderSchema.safeParse(authHeader);
        if (!headerValidation.success) {
            res.status(401).json({
                success: false,
                error: 'Invalid authorization header format',
                code: 'INVALID_AUTH_HEADER',
                details: headerValidation.error.issues[0].message,
            });
            return;
        }
        const token = authHeader.slice(7);
        let payload;
        try {
            payload = (0, auth_service_1.verifyToken)(token);
        }
        catch (tokenError) {
            res.status(401).json({
                success: false,
                error: tokenError.message,
                code: tokenError.code || 'TOKEN_VERIFICATION_ERROR',
            });
            return;
        }
        const user = await dao_1.userDao.findById(payload.sub);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
            });
            return;
        }
        const statusInfo = user.getStatusInfo();
        if (!statusInfo.isActive) {
            res.status(Number(statusInfo.statusCode)).json({
                success: false,
                error: `Account ${statusInfo.status}`,
                code: 'ACCOUNT_STATUS_ERROR',
                status: statusInfo.status,
            });
            return;
        }
        req.auth = {
            userId: user._id?.toString(),
            email: user.email,
            status: user.status,
        };
        req.user = user;
        next();
    }
    catch (error) {
        const status = error.status || 500;
        const code = error.code || 'AUTH_MIDDLEWARE_ERROR';
        res.status(status).json({
            success: false,
            error: error.message || 'Authentication failed',
            code,
        });
    }
}
exports.default = auth;
