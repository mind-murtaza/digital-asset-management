"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
/**
 * Authentication Service (TypeScript)
 */
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require('dotenv').config();
const dao_1 = require("../dao");
const sanitize_1 = require("../utils/sanitize");
const EXPIRES_IN = isNaN(Number(process.env.ACCESS_TOKEN_EXPIRY))
    ? 86400
    : Number(process.env.ACCESS_TOKEN_EXPIRY);
const ALGORITHM = 'HS256';
const JWT_CONFIG = {
    algorithm: ALGORITHM,
    expiresIn: EXPIRES_IN,
    issuer: process.env.ISSUER,
    audience: process.env.AUDIENCE,
};
function getJWTSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        const err = new Error('JWT_SECRET is not configured');
        err.status = 500;
        err.code = 'MISSING_JWT_SECRET';
        throw err;
    }
    return secret;
}
function signToken(user) {
    try {
        const payload = {
            sub: user._id.toString(),
            email: user.email,
            iat: Math.floor(Date.now() / 1000),
        };
        return jsonwebtoken_1.default.sign(payload, getJWTSecret(), JWT_CONFIG);
    }
    catch (error) {
        const authError = new Error('Token generation failed');
        authError.status = 500;
        authError.code = 'TOKEN_GENERATION_ERROR';
        throw authError;
    }
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, getJWTSecret(), {
            algorithms: [ALGORITHM],
        });
    }
    catch (error) {
        const authError = new Error('Invalid or expired token');
        authError.status = 401;
        authError.code = 'TOKEN_VERIFICATION_ERROR';
        throw authError;
    }
}
async function login(email, password) {
    try {
        const user = await dao_1.userDao.findByEmail(email);
        if (!user) {
            const error = new Error('Invalid credentials');
            error.status = 401;
            error.code = 'INVALID_CREDENTIALS';
            throw error;
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            const error = new Error('Invalid credentials');
            error.status = 401;
            error.code = 'INVALID_CREDENTIALS';
            throw error;
        }
        const statusInfo = user.getStatusInfo();
        if (!statusInfo.isActive) {
            const error = new Error(`Account ${statusInfo.status}`);
            error.status = statusInfo.statusCode;
            error.code = 'ACCOUNT_STATUS_ERROR';
            throw error;
        }
        const token = signToken(user);
        await user.updateLastLogin();
        return {
            user: (0, sanitize_1.sanitizeUser)(user),
            token,
        };
    }
    catch (error) {
        if (error.status)
            throw error;
        const authError = new Error('Authentication failed');
        authError.status = 500;
        authError.code = 'AUTHENTICATION_ERROR';
        throw authError;
    }
}
async function refresh(currentToken) {
    try {
        const payload = verifyToken(currentToken);
        const user = await dao_1.userDao.findById(payload.sub);
        if (!user) {
            const error = new Error('User not found');
            error.status = 401;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }
        const statusInfo = user.getStatusInfo();
        if (!statusInfo.isActive) {
            const error = new Error(`Account ${statusInfo.status}`);
            error.status = statusInfo.statusCode;
            error.code = 'ACCOUNT_STATUS_ERROR';
            throw error;
        }
        const newToken = signToken(user);
        await user.updateLastLogin();
        return {
            user: (0, sanitize_1.sanitizeUser)(user),
            token: newToken,
        };
    }
    catch (error) {
        if (error.status)
            throw error;
        const authError = new Error('Token refresh failed');
        authError.status = 500;
        authError.code = 'TOKEN_REFRESH_ERROR';
        throw authError;
    }
}
async function register(userData) {
    try {
        const email = userData.email;
        const findUser = await dao_1.userDao.findByEmail(email);
        if (findUser) {
            const error = new Error('User already exists');
            error.status = 400;
            error.code = 'USER_ALREADY_EXISTS';
            throw error;
        }
        const user = await dao_1.userDao.createUser(userData);
        return {
            user: (0, sanitize_1.sanitizeUser)(user),
            token: signToken(user),
        };
    }
    catch (error) {
        if (error.status)
            throw error;
        const authError = new Error('Registration failed');
        authError.status = 500;
        authError.code = 'REGISTRATION_ERROR';
        throw authError;
    }
}
const service = { login, refresh, register, signToken, verifyToken };
module.exports = service;
