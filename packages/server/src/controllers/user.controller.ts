/**
 * User Controller (TypeScript)
 */

import type { Request, Response, NextFunction } from 'express';

const userService = require('../services/user.service');
const { sanitizeUser } = require('../utils/sanitize');

function forwardUserError(err: any, next: NextFunction) {
    if (err && (err.code === 11000 || err.code === 11001)) {
        err.status = err.status || 409;
        err.message = err.message || 'Duplicate resource';
        err.code = err.code || 'DUPLICATE_RESOURCE';
    }
    if (!err.status) {
        err.status = 500;
        err.code = err.code || 'USER_CONTROLLER_ERROR';
    }
    return next(err);
}

async function me(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({
            success: true,
            data: { user: sanitizeUser((req as any).user) },
        });
    } catch (err) {
        forwardUserError(err, next);
    }
}

async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const updated = await userService.updateUserProfile((req as any).auth.userId, req.body);
        res.json({ success: true, data: updated });
    } catch (err) {
        forwardUserError(err, next);
    }
}

async function changePassword(req: Request, res: Response, next: NextFunction) {
    try {
        const { currentPassword, newPassword } = req.body;
        await userService.changePassword((req as any).auth.userId, currentPassword, newPassword);
        res.status(204).send();
    } catch (err) {
        forwardUserError(err, next);
    }
}

async function softDelete(req: Request, res: Response, next: NextFunction) {
    try {
        await userService.softDelete((req as any).auth.userId);
        res.status(204).send();
    } catch (err) {
        forwardUserError(err, next);
    }
}

const controller = { me, updateProfile, changePassword, softDelete };
export = controller;
