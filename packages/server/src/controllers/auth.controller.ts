/**
 * Authentication Controller (TypeScript)
 */

import type { Request, Response, NextFunction } from 'express';

const authService = require('../services/auth.service');

function forwardAuthError(err: any, next: NextFunction) {
    if (!err) return next();
    if (err.code === 11000 || err.code === 11001) {
        err.status = err.status || 409;
        err.message = err.message || 'Duplicate resource';
    }
    if (!err.status) {
        err.status = 500;
        err.code = err.code || 'AUTH_CONTROLLER_ERROR';
    }
    return next(err);
}

async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.register(req.body);
        res.status(result.statusCode || 201).json(result);
    } catch (err) {
        forwardAuthError(err, next);
    }
}

async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.login(req.body.email, req.body.password);
        res.json({ success: true, data: result, message: 'Login successful' });
    } catch (err) {
        forwardAuthError(err, next);
    }
}

async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.refresh(req.headers.authorization!.slice(7));
        res.json({
            success: true,
            data: result,
            message: 'Token refreshed successfully',
        });
    } catch (err) {
        forwardAuthError(err, next);
    }
}

const controller = { register, login, refresh };
export = controller;
