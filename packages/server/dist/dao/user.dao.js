"use strict";
/**
 * @fileoverview User DAO - All database operations for User entity
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_model_1 = __importDefault(require("../models/User.model"));
const db_error_1 = __importDefault(require("../utils/db.error"));
/**
 * Find user by id.
 * @param {string} userId - User id
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findById(userId) {
    try {
        return await User_model_1.default.findById(userId);
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find user by id failed', 500, error);
    }
}
/**
 * Find user by id including password field.
 * @param {string} userId - User id
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findByIdWithPassword(userId) {
    try {
        return await User_model_1.default.findById(userId).select('+password');
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find user by id (with password) failed', 500, error);
    }
}
/**
 * Find user by email (normalized, excluding deleted).
 * @param {string} email - Email address
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findByEmail(email) {
    try {
        return await User_model_1.default.findOne({
            email: email.toLowerCase().trim(),
            status: { $ne: 'deleted' },
        });
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find user by email failed', 500, error);
    }
}
/**
 * Find user by email including password.
 * @param {string} email - Email address
 * @returns {Promise<IUserDocument|null>} User or null
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function findByEmailWithPassword(email) {
    try {
        return await User_model_1.default.findOne({
            email: email.toLowerCase().trim(),
            status: { $ne: 'deleted' },
        }).select('+password');
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find user by email (with password) failed', 500, error);
    }
}
/**
 * Create a new user document.
 * @param {Partial<IUserDocument>} data - User fields
 * @returns {Promise<IUserDocument>} Created user
 * @throws {DUPLICATE_KEY_ERROR|DATABASE_ERROR|CONNECTION_ERROR}
 */
async function createUser(data) {
    try {
        const user = new User_model_1.default(data);
        await user.save();
        return user;
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Create user failed', 500, error);
    }
}
/**
 * Partially update profile fields for a user.
 * @param {string} userId - User id
 * @param {Record<string, any>} profileData - Profile fields patch
 * @returns {Promise<IUserDocument|null>} Updated user or null if not found
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function updateProfileById(userId, profileData) {
    try {
        const user = await User_model_1.default.findById(userId);
        if (!user)
            return null;
        Object.keys(profileData).forEach((key) => {
            // @ts-ignore
            if (profileData[key] !== undefined &&
                Object.prototype.hasOwnProperty.call(user.profile, key)) {
                // @ts-ignore
                user.profile[key] = profileData[key];
            }
        });
        return await user.save();
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Update user profile failed', 500, error);
    }
}
/**
 * Change password for a user id (hashes internally).
 * @param {string} userId - User id
 * @param {string} newPassword - New plain password
 * @returns {Promise<void>}
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function changePasswordById(userId, oldPassword, newPassword) {
    try {
        const user = await findByIdWithPassword(userId);
        if (!user)
            throw (0, db_error_1.default)('NOT_FOUND', 'User not found', 404);
        const isPasswordValid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isPasswordValid)
            throw (0, db_error_1.default)('INVALID_CREDENTIALS', 'Invalid password', 401);
        const saltRounds = 12;
        const hashed = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await user.updateOne({ password: hashed });
    }
    catch (error) {
        if (error.status)
            throw error;
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Change password failed', 500, error);
    }
}
/**
 * Set lastLoginAt for a user id to now.
 * @param {string} userId - User id
 * @returns {Promise<void>}
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function setLastLoginById(userId) {
    try {
        await User_model_1.default.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Set last login failed', 500, error);
    }
}
/**
 * Soft delete a user by id (status = 'deleted').
 * @param {string} userId - User id
 * @returns {Promise<void>}
 * @throws {DATABASE_ERROR|CONNECTION_ERROR}
 */
async function softDeleteById(userId) {
    try {
        await User_model_1.default.updateOne({ _id: userId }, { $set: { status: 'deleted' } });
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Soft delete failed', 500, error);
    }
}
exports.default = {
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
