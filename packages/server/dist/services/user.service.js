"use strict";
/**
 * User Service (TypeScript)
 */
const dao_1 = require("../dao");
const sanitize_1 = require("../utils/sanitize");
async function updateUserProfile(userId, profileData) {
    try {
        const updatedUser = await dao_1.userDao.updateProfileById(userId, profileData);
        if (!updatedUser) {
            const err = new Error('User not found');
            err.status = 404;
            err.code = 'USER_NOT_FOUND';
            throw err;
        }
        return { user: (0, sanitize_1.sanitizeUser)(updatedUser) };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Profile update failed');
        err.status = 500;
        err.code = 'PROFILE_UPDATE_ERROR';
        throw err;
    }
}
async function changePassword(userId, currentPassword, newPassword) {
    try {
        await dao_1.userDao.changePasswordById(userId, currentPassword, newPassword);
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Password change failed');
        err.status = 500;
        err.code = 'PASSWORD_CHANGE_ERROR';
        throw err;
    }
}
async function softDelete(userId) {
    try {
        await dao_1.userDao.softDeleteById(userId);
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Account deletion failed');
        err.status = 500;
        err.code = 'ACCOUNT_DELETE_ERROR';
        throw err;
    }
}
const service = {
    updateUserProfile,
    changePassword,
    softDelete,
};
module.exports = service;
