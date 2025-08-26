/**
 * @fileoverview User DAO - All database operations for User entity
 */

import bcrypt from 'bcryptjs';
import User, { type IUserDocument } from '../models/User.model';
import dbError from '../utils/db.error';

/**
 * Find user by id.
 * @param {string} userId - User id
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findById(userId: string): Promise<IUserDocument | null> {
    try {
        return await User.findById(userId);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find user by id failed', 500, error);
    }
}

/**
 * Find user by id including password field.
 * @param {string} userId - User id
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findByIdWithPassword(userId: string): Promise<IUserDocument | null> {
    try {
        return await User.findById(userId).select('+password');
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find user by id (with password) failed', 500, error);
    }
}

/**
 * Find user by email (normalized, excluding deleted).
 * @param {string} email - Email address
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findByEmail(email: string): Promise<IUserDocument | null> {
    try {
        return await User.findOne({
            email: email.toLowerCase().trim(),
            status: { $ne: 'deleted' },
        });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find user by email failed', 500, error);
    }
}

/**
 * Find user by email including password.
 * @param {string} email - Email address
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
    try {
        return await User.findOne({
            email: email.toLowerCase().trim(),
            status: { $ne: 'deleted' },
        }).select('+password');
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find user by email (with password) failed', 500, error);
    }
}

/**
 * Create a new user document.
 * @param {Partial<IUserDocument>} data - User fields
 * @returns {Promise<IUserDocument>} Created user
 * @throws {DUPLICATE_KEY_ERROR|DATABASE_ERROR|CONNECTION_ERROR}
 */
async function createUser(data: Partial<IUserDocument>): Promise<IUserDocument> {
    try {
        const user = new User(data);
        await user.save();
        return user;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Create user failed', 500, error);
    }
}

/**
 * Partially update profile fields for a user.
 * @param {string} userId - User id
 * @param {Record<string, any>} profileData - Profile fields patch
 * @returns {Promise<IUserDocument|null>} Updated user or null if not found
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function updateProfileById(
    userId: string,
    profileData: Record<string, any>,
): Promise<IUserDocument | null> {
    try {
        const user = await User.findById(userId);
        if (!user) return null;
        Object.keys(profileData).forEach((key) => {
            // @ts-ignore
            if (
                profileData[key] !== undefined &&
                Object.prototype.hasOwnProperty.call(user.profile, key)
            ) {
                // @ts-ignore
                user.profile[key] = profileData[key];
            }
        });
        return await user.save();
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Update user profile failed', 500, error);
    }
}

/**
 * Change password for a user id (hashes internally).
 * @param {string} userId - User id
 * @param {string} newPassword - New plain password
 * @returns {Promise<void>}
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function changePasswordById(
    userId: string,
    oldPassword: string,
    newPassword: string,
): Promise<void> {
    try {
        const user = await findById(userId);
        if (!user) throw dbError('NOT_FOUND', 'User not found', 404);
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) throw dbError('INVALID_CREDENTIALS', 'Invalid password', 401);
        const saltRounds = 12;
        const hashed = await bcrypt.hash(newPassword, saltRounds);
        await user.updateOne({ password: hashed });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Change password failed', 500, error);
    }
}

/**
 * Set lastLoginAt for a user id to now.
 * @param {string} userId - User id
 * @returns {Promise<void>}
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function setLastLoginById(userId: string): Promise<void> {
    try {
        await User.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Set last login failed', 500, error);
    }
}

/**
 * Soft delete a user by id (status = 'deleted').
 * @param {string} userId - User id
 * @returns {Promise<void>}
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function softDeleteById(userId: string): Promise<void> {
    try {
        await User.updateOne({ _id: userId }, { $set: { status: 'deleted' } });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Soft delete failed', 500, error);
    }
}

export default {
    findById,
    findByIdWithPassword,
    findByEmail,
    findByEmailWithPassword,
    createUser,
    updateProfileById,
    changePasswordById,
    setLastLoginById,
    softDeleteById,
};
