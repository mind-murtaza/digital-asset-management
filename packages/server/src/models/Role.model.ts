/**
 * @fileoverview Role Model (TypeScript)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    permissions: string[];
    isSystemRole: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRoleDocument extends Document, IRole {}
export interface IRoleModel extends Model<IRoleDocument> {}

const RoleSchema = new Schema<IRoleDocument, IRoleModel>(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        name: { type: String, required: true, trim: true },
        description: { type: String },
        permissions: { type: [String], default: [] },
        isSystemRole: { type: Boolean, default: false },
        isDefault: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        collection: 'roles',
        minimize: false,
        toJSON: {
            virtuals: true,
            transform: (_d, r: any) => {
                delete r.__v;
                return r;
            },
        },
        toObject: {
            virtuals: true,
            transform: (_d, r: any) => {
                delete r.__v;
                return r;
            },
        },
    },
);

// Indexes
RoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
RoleSchema.index({ organizationId: 1, isDefault: 1 });

const Role = mongoose.model<IRoleDocument, IRoleModel>('Role', RoleSchema);
export default Role;
