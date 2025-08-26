/**
 * User Service (TypeScript)
 */
import { userDao } from '../dao';
import { sanitizeUser } from '../utils/sanitize';

async function updateUserProfile(userId: string, profileData: any) {
    try {
        const updatedUser = await userDao.updateProfileById(userId, profileData);
        if (!updatedUser) {
            const err: any = new Error('User not found');
            err.status = 404;
            err.code = 'USER_NOT_FOUND';
            throw err;
        }
        return { user: sanitizeUser(updatedUser) };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Profile update failed');
        err.status = 500;
        err.code = 'PROFILE_UPDATE_ERROR';
        throw err;
    }
}

async function changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
        await userDao.changePasswordById(userId, currentPassword, newPassword);
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Password change failed');
        err.status = 500;
        err.code = 'PASSWORD_CHANGE_ERROR';
        throw err;
    }
}

async function softDelete(userId: string) {
    try {
        await userDao.softDeleteById(userId);
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Account deletion failed');
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
export = service;
