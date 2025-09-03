"use strict";
/**
 * Authentication Controller (TypeScript)
 */
const authService = require('../services/auth.service');
function forwardAuthError(err, next) {
    if (!err)
        return next();
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
async function register(req, res, next) {
    try {
        const result = await authService.register(req.body);
        res.status(result.statusCode || 201).json({
            success: true,
            data: result,
            message: 'Registration successful',
        });
    }
    catch (err) {
        forwardAuthError(err, next);
    }
}
async function login(req, res, next) {
    try {
        const result = await authService.login(req.body.email, req.body.password);
        res.status(result.statusCode || 200).json({
            success: true,
            data: result,
            message: 'Login successful',
        });
    }
    catch (err) {
        forwardAuthError(err, next);
    }
}
async function refresh(req, res, next) {
    try {
        const result = await authService.refresh(req.headers.authorization.slice(7));
        res.status(result.statusCode || 200).json({
            success: true,
            data: result,
            message: 'Token refreshed successfully',
        });
    }
    catch (err) {
        forwardAuthError(err, next);
    }
}
const controller = { register, login, refresh };
module.exports = controller;
