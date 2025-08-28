/**
 * @fileoverview User Model - Identity, Credentials, and Settings (TypeScript)
 * Enterprise-grade Mongoose model with secure password handling, typed instance
 * methods/statics, and JSON transforms to remove sensitive fields.
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// =====================================
// Types
// =====================================

export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted';

export interface UserProfile {
    firstName?: string;
    lastName?: string;
}

export interface IUser {
    organizationId: mongoose.Types.ObjectId;
    email: string;
    password: string;
    profile: UserProfile;
    status: UserStatus;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserDocument extends Document, IUser {
    comparePassword(candidatePassword: string): Promise<boolean>;
    getFullName(): string;
    isActive(): boolean;
    getStatusInfo(): {
        isActive: boolean;
        status: UserStatus;
        statusCode: number | null;
    };
    updateLastLogin(): Promise<IUserDocument>;
    updateProfile(profile: Partial<UserProfile>): Promise<IUserDocument>;
    updatePassword(newPassword: string): Promise<IUserDocument>;
    softDelete(): Promise<IUserDocument>;
    updateStatus(status: UserStatus): Promise<IUserDocument>;
}

export interface FindActiveUsersOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface IUserModel extends Model<IUserDocument> {
    findByEmail(email: string): Promise<IUserDocument | null>;
    findActiveUsers(options?: FindActiveUsersOptions): Promise<{ users: any[]; total: number }>;
}

// =====================================
// Schema
// =====================================

const UserSchema = new Schema<IUserDocument, IUserModel>(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
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
    },
    {
        timestamps: true,
        collection: 'users',
        minimize: false,
        validateBeforeSave: true,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: any) => {
                delete ret.password;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform: (_doc, ret: any) => {
                delete ret.password;
                delete ret.__v;
                return ret;
            },
        },
    },
);

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
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
        next();
    } catch (error) {
        next(error as any);
    }
});

// =====================================
// Methods
// =====================================

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    try {
        const userWithPassword: IUserDocument | null = await (this.constructor as IUserModel)
            .findById(this._id)
            .select('+password');
        if (!userWithPassword || !userWithPassword.password) {
            const err: any = new Error('Password not set');
            err.status = 400;
            err.code = 'PASSWORD_NOT_SET';
            throw err;
        }
        return await bcrypt.compare(candidatePassword, userWithPassword.password);
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Password comparison failed');
        err.status = 500;
        err.code = 'PASSWORD_COMPARE_ERROR';
        throw err;
    }
};

UserSchema.methods.getFullName = function (): string {
    const firstName = this.profile?.firstName || '';
    const lastName = this.profile?.lastName || '';
    return `${firstName} ${lastName}`.trim();
};

UserSchema.methods.isActive = function (): boolean {
    return this.status === 'active';
};

UserSchema.methods.getStatusInfo = function (this: IUserDocument) {
    const STATUS_CODE_MAP: Record<UserStatus, number | null> = {
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

UserSchema.methods.updateLastLogin = async function (): Promise<IUserDocument> {
    try {
        this.lastLoginAt = new Date();
        return await this.save();
    } catch (error: any) {
        const err: any = new Error(`Last login update failed: ${error.message}`);
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
UserSchema.methods.updateProfile = async function (
    profileData: Partial<UserProfile>,
): Promise<IUserDocument> {
    try {
        Object.assign(this.profile, profileData);
        return await this.save();
    } catch (error: any) {
        const err: any = new Error(`Profile update failed: ${error.message}`);
        err.status = 500;
        err.code = 'PROFILE_UPDATE_ERROR';
        throw err;
    }
};

UserSchema.methods.updatePassword = async function (newPassword: string): Promise<IUserDocument> {
    try {
        this.password = newPassword;
        return await this.save();
    } catch (error: any) {
        const err: any = new Error(`Password update failed: ${error.message}`);
        err.status = 500;
        err.code = 'PASSWORD_UPDATE_ERROR';
        throw err;
    }
};

UserSchema.methods.softDelete = async function (): Promise<IUserDocument> {
    try {
        this.status = 'deleted';
        return await this.save();
    } catch (error: any) {
        const err: any = new Error(`Soft delete failed: ${error.message}`);
        err.status = 500;
        err.code = 'USER_SOFT_DELETE_ERROR';
        throw err;
    }
};

UserSchema.methods.updateStatus = async function (status: UserStatus): Promise<IUserDocument> {
    try {
        this.status = status;
        return await this.save();
    } catch (error: any) {
        const err: any = new Error(`Status update failed: ${error.message}`);
        err.status = 500;
        err.code = 'STATUS_UPDATE_ERROR';
        throw err;
    }
};

// =====================================
// Statics
// =====================================

UserSchema.statics.findByEmail = function (this: IUserModel, email: string) {
    return this.findOne({
        email: email.toLowerCase().trim(),
        status: { $ne: 'deleted' },
    });
};

UserSchema.statics.findActiveUsers = async function (
    this: IUserModel,
    options: FindActiveUsersOptions = {},
) {
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
    } catch (error: any) {
        const err: any = new Error(`Find active users failed: ${error.message}`);
        err.status = 500;
        err.code = 'FIND_ACTIVE_USERS_ERROR';
        throw err;
    }
};

// =====================================
// Virtuals
// =====================================

UserSchema.virtual('fullName').get(function (this: IUserDocument) {
    return this.getFullName();
});

UserSchema.virtual('initials').get(function (this: IUserDocument) {
    const firstName = this.profile?.firstName || '';
    const lastName = this.profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
});

// Ensure virtuals are serialized (already set via toJSON/toObject)

// =====================================
// Model
// =====================================

const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);

export default User;
