/**
 * Authentication Service (TypeScript)
 */
import jwt, { SignOptions } from 'jsonwebtoken';

require('dotenv').config();
import { userDao } from '../dao';
import { sanitizeUser } from '../utils/sanitize';

const EXPIRES_IN = isNaN(Number(process.env.ACCESS_TOKEN_EXPIRY))
    ? 86400
    : Number(process.env.ACCESS_TOKEN_EXPIRY);
const ALGORITHM = 'HS256';
const JWT_CONFIG: SignOptions = {
    algorithm: ALGORITHM,
    expiresIn: EXPIRES_IN,
    issuer: process.env.ISSUER,
    audience: process.env.AUDIENCE,
};

function getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        const err: any = new Error('JWT_SECRET is not configured');
        err.status = 500;
        err.code = 'MISSING_JWT_SECRET';
        throw err;
    }
    return secret;
}

function signToken(user: any): string {
    try {
        const payload = {
            sub: user._id.toString(),
            email: user.email,
            iat: Math.floor(Date.now() / 1000),
        };
        return jwt.sign(payload, getJWTSecret(), JWT_CONFIG);
    } catch (error) {
        const authError: any = new Error('Token generation failed');
        authError.status = 500;
        authError.code = 'TOKEN_GENERATION_ERROR';
        throw authError;
    }
}

function verifyToken(token: string): any {
    try {
        return jwt.verify(token, getJWTSecret(), {
            algorithms: [ALGORITHM],
        });
    } catch (error) {
        const authError: any = new Error('Invalid or expired token');
        authError.status = 401;
        authError.code = 'TOKEN_VERIFICATION_ERROR';
        throw authError;
    }
}

async function login(email: string, password: string) {
    try {
        const user = await userDao.findByEmail(email);
        if (!user) {
            const error: any = new Error('Invalid credentials');
            error.status = 401;
            error.code = 'INVALID_CREDENTIALS';
            throw error;
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            const error: any = new Error('Invalid credentials');
            error.status = 401;
            error.code = 'INVALID_CREDENTIALS';
            throw error;
        }
        const statusInfo = user.getStatusInfo();
        if (!statusInfo.isActive) {
            const error: any = new Error(`Account ${statusInfo.status}`);
            error.status = statusInfo.statusCode;
            error.code = 'ACCOUNT_STATUS_ERROR';
            throw error;
        }
        const token = signToken(user);
        await user.updateLastLogin();
        return {
            user: sanitizeUser(user),
            token,
        };
    } catch (error: any) {
        if (error.status) throw error;
        const authError: any = new Error('Authentication failed');
        authError.status = 500;
        authError.code = 'AUTHENTICATION_ERROR';
        throw authError;
    }
}

async function refresh(currentToken: string) {
    try {
        const payload = verifyToken(currentToken);
        const user = await userDao.findById(payload.sub);
        if (!user) {
            const error: any = new Error('User not found');
            error.status = 401;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }
        const statusInfo = user.getStatusInfo();
        if (!statusInfo.isActive) {
            const error: any = new Error(`Account ${statusInfo.status}`);
            error.status = statusInfo.statusCode;
            error.code = 'ACCOUNT_STATUS_ERROR';
            throw error;
        }
        const newToken = signToken(user);
        await user.updateLastLogin();
        return {
            user: sanitizeUser(user),
            token: newToken,
        };
    } catch (error: any) {
        if (error.status) throw error;
        const authError: any = new Error('Token refresh failed');
        authError.status = 500;
        authError.code = 'TOKEN_REFRESH_ERROR';
        throw authError;
    }
}

async function register(userData: any) {
    try {
        const email = userData.email;
        const findUser = await userDao.findByEmail(email);
        if (findUser) {
            const error: any = new Error('User already exists');
            error.status = 400;
            error.code = 'USER_ALREADY_EXISTS';
            throw error;
        }
        const user = await userDao.createUser(userData);
        return {
            user: sanitizeUser(user),
            token: signToken(user),
        };
    } catch (error: any) {
        if (error.status) throw error;
        const authError: any = new Error('Registration failed');
        authError.status = 500;
        authError.code = 'REGISTRATION_ERROR';
        throw authError;
    }
}

const service = { login, refresh, register, signToken, verifyToken };
export = service;
