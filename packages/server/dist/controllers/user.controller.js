"use strict";
/**
 * User Controller (TypeScript)
 */
const userService = require('../services/user.service');
const { sanitizeUser } = require('../utils/sanitize');
function forwardUserError(err, next) {
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
async function me(req, res, next) {
    try {
        res.json({
            success: true,
            data: { user: sanitizeUser(req.user) },
        });
    }
    catch (err) {
        forwardUserError(err, next);
    }
}
async function updateProfile(req, res, next) {
    try {
        const updated = await userService.updateUserProfile(req.auth.userId, req.body);
        res.json({ success: true, data: updated });
    }
    catch (err) {
        forwardUserError(err, next);
    }
}
async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body;
        await userService.changePassword(req.auth.userId, currentPassword, newPassword);
        res.status(204).send();
    }
    catch (err) {
        forwardUserError(err, next);
    }
}
async function softDelete(req, res, next) {
    try {
        await userService.softDelete(req.auth.userId);
        res.status(204).send();
    }
    catch (err) {
        forwardUserError(err, next);
    }
}
const controller = { me, updateProfile, changePassword, softDelete };
module.exports = controller;
