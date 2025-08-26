/**
 * JWT Authentication Middleware (TypeScript)
 */

import type { Request, Response, NextFunction } from 'express';
import { authHeaderSchema } from '../../schemas/auth.schema';
import { verifyToken } from '../../services/auth.service';
import { userDao } from '../../dao';

async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization as string | undefined;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER',
            });
            return;
        }

        const headerValidation = authHeaderSchema.safeParse(authHeader);
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

        let payload: any;
        try {
            payload = verifyToken(token);
        } catch (tokenError: any) {
            res.status(401).json({
                success: false,
                error: tokenError.message,
                code: tokenError.code || 'TOKEN_VERIFICATION_ERROR',
            });
            return;
        }

        const user = await userDao.findById(payload.sub);
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

        (req as any).auth = {
            userId: user._id?.toString(),
            email: user.email,
            status: user.status,
        };
        (req as any).user = user;

        next();
    } catch (error: any) {
        const status = error.status || 500;
        const code = error.code || 'AUTH_MIDDLEWARE_ERROR';
        res.status(status).json({
            success: false,
            error: error.message || 'Authentication failed',
            code,
        });
    }
}

export default auth;
