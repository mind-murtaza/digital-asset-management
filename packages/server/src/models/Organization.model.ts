/**
 * @fileoverview Organization Model (TypeScript)
 * Defines Organization schema, indexes, and transforms.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrgStatus = 'active' | 'suspended' | 'archived';

export interface OrganizationSettings {
    storageQuotaBytes: number;
    featureFlags: {
        enablePublicSharing: boolean;
        enableApiAccess: boolean;
    };
}

export interface IOrganization {
    name: string;
    status: OrgStatus;
    ownerId: mongoose.Types.ObjectId;
    settings: OrganizationSettings;
    createdAt: Date;
    updatedAt: Date;
}

export interface IOrganizationDocument extends Document, IOrganization {}
export interface IOrganizationModel extends Model<IOrganizationDocument> {}

const OrganizationSchema = new Schema<IOrganizationDocument, IOrganizationModel>(
    {
        name: { type: String, required: true, trim: true },
        status: { type: String, default: 'active' },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        settings: {
            storageQuotaBytes: { type: Number, default: 500_000_000_000 },
            featureFlags: {
                enablePublicSharing: { type: Boolean, default: true },
                enableApiAccess: { type: Boolean, default: false },
            },
        },
    },
    {
        timestamps: true,
        collection: 'organizations',
        minimize: false,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: any) => {
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform: (_doc, ret: any) => {
                delete ret.__v;
                return ret;
            },
        },
    },
);

// Indexes per DB_SCHEMA.md
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ createdAt: -1 });
OrganizationSchema.index({ name: 1 }, { partialFilterExpression: { status: 'active' } });

const Organization = mongoose.model<IOrganizationDocument, IOrganizationModel>(
    'Organization',
    OrganizationSchema,
);

export default Organization;
