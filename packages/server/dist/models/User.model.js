"use strict";
/**
 * @fileoverview User Model - Identity, Credentials, and Settings (TypeScript)
 * Enterprise-grade Mongoose model with secure password handling, typed instance
 * methods/statics, and JSON transforms to remove sensitive fields.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// =====================================
// Schema
// =====================================
const UserSchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization' },
    // Authentication
    email: { type: String, required: true, trim: true },
    password: { type: String, select: false, required: true },
    // Profile
    profile: {
        firstName: { type: String },
        lastName: { type: String },
    },
    // Account Status
    status: { type: String, default: 'active' },
    lastLoginAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'users',
    minimize: false,
    validateBeforeSave: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret.password;
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret.password;
            delete ret.__v;
            return ret;
        },
    },
});
// =====================================
// Indexes
// =====================================
UserSchema.index({ email: 1 }, { unique: true, background: true });
UserSchema.index({ status: 1 }, { background: true });
UserSchema.index({ status: 1, lastLoginAt: -1 }, { background: true });
// =====================================
// Hooks
// =====================================
UserSchema.pre('save', async function (next) {
    try {
        if (this.isModified('password')) {
            const saltRounds = 12;
            this.password = await bcryptjs_1.default.hash(this.password, saltRounds);
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
// =====================================
// Methods
// =====================================
UserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        const userWithPassword = await this.constructor
            .findById(this._id)
            .select('+password');
        if (!userWithPassword || !userWithPassword.password) {
            const err = new Error('Password not set');
            err.status = 400;
            err.code = 'PASSWORD_NOT_SET';
            throw err;
        }
        return await bcryptjs_1.default.compare(candidatePassword, userWithPassword.password);
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Password comparison failed');
        err.status = 500;
        err.code = 'PASSWORD_COMPARE_ERROR';
        throw err;
    }
};
UserSchema.methods.getFullName = function () {
    const firstName = this.profile?.firstName || '';
    const lastName = this.profile?.lastName || '';
    return `${firstName} ${lastName}`.trim();
};
UserSchema.methods.isActive = function () {
    return this.status === 'active';
};
UserSchema.methods.getStatusInfo = function () {
    const STATUS_CODE_MAP = {
        active: null,
        suspended: 403,
        deleted: 401,
        pending_verification: 401,
    };
    return {
        isActive: this.status === 'active',
        status: this.status,
        statusCode: STATUS_CODE_MAP[this.status],
    };
};
UserSchema.methods.updateLastLogin = async function () {
    try {
        this.lastLoginAt = new Date();
        return await this.save();
    }
    catch (error) {
        const err = new Error(`Last login update failed: ${error.message}`);
        err.status = 500;
        err.code = 'LAST_LOGIN_UPDATE_ERROR';
        throw err;
    }
};
/**
 * Updates user profile fields.
 * @param profileData Partial UserProfile to merge.
 * @returns Promise resolving to the updated user document.
 * @throws Error with status 500 and code PROFILE_UPDATE_ERROR on failure.
 */
UserSchema.methods.updateProfile = async function (profileData) {
    try {
        Object.assign(this.profile, profileData);
        return await this.save();
    }
    catch (error) {
        const err = new Error(`Profile update failed: ${error.message}`);
        err.status = 500;
        err.code = 'PROFILE_UPDATE_ERROR';
        throw err;
    }
};
UserSchema.methods.updatePassword = async function (newPassword) {
    try {
        this.password = newPassword;
        return await this.save();
    }
    catch (error) {
        const err = new Error(`Password update failed: ${error.message}`);
        err.status = 500;
        err.code = 'PASSWORD_UPDATE_ERROR';
        throw err;
    }
};
UserSchema.methods.softDelete = async function () {
    try {
        this.status = 'deleted';
        return await this.save();
    }
    catch (error) {
        const err = new Error(`Soft delete failed: ${error.message}`);
        err.status = 500;
        err.code = 'USER_SOFT_DELETE_ERROR';
        throw err;
    }
};
UserSchema.methods.updateStatus = async function (status) {
    try {
        this.status = status;
        return await this.save();
    }
    catch (error) {
        const err = new Error(`Status update failed: ${error.message}`);
        err.status = 500;
        err.code = 'STATUS_UPDATE_ERROR';
        throw err;
    }
};
// =====================================
// Statics
// =====================================
UserSchema.statics.findByEmail = function (email) {
    return this.findOne({
        email: email.toLowerCase().trim(),
        status: { $ne: 'deleted' },
    });
};
UserSchema.statics.findActiveUsers = async function (options = {}) {
    try {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.find({ status: 'active' })
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.countDocuments({ status: 'active' }),
        ]);
        return { users, total };
    }
    catch (error) {
        const err = new Error(`Find active users failed: ${error.message}`);
        err.status = 500;
        err.code = 'FIND_ACTIVE_USERS_ERROR';
        throw err;
    }
};
// =====================================
// Virtuals
// =====================================
UserSchema.virtual('fullName').get(function () {
    return this.getFullName();
});
UserSchema.virtual('initials').get(function () {
    const firstName = this.profile?.firstName || '';
    const lastName = this.profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
});
// Ensure virtuals are serialized (already set via toJSON/toObject)
// =====================================
// Model
// =====================================
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
