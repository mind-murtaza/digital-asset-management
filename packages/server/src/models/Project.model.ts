/**
 * @fileoverview Project Model (TypeScript)
 * Defines Project schema, indexes, and transforms.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import computeParentPath from '../utils/project.utils';

export interface ProjectAncestor {
    _id: mongoose.Types.ObjectId;
    name: string;
}

export interface IProject {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    nameLower: string;
    path: string;
    parentPath: string;
    ancestors: ProjectAncestor[];
    createdBy: mongoose.Types.ObjectId;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProjectDocument extends Document, IProject {}
export interface IProjectModel extends Model<IProjectDocument> {}

const AncestorSchema = new Schema<ProjectAncestor>(
    {
        _id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
        name: { type: String, required: true, trim: true },
    },
    { _id: false },
);

const ProjectSchema = new Schema<IProjectDocument, IProjectModel>(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        name: { type: String, required: true, trim: true },
        nameLower: { type: String, required: true, trim: true },
        path: { type: String, required: true, trim: true },
        parentPath: { type: String, required: true, trim: true },
        ancestors: { type: [AncestorSchema], default: [] },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        deletedAt: { type: Date },
    },
    {
        timestamps: true,
        collection: 'projects',
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

// Ensure derived fields
ProjectSchema.pre('save', function (next) {
    try {
        this.nameLower = String(this.name).trim().toLowerCase();
        this.parentPath = computeParentPath(String(this.path).trim());
        next();
    } catch (error) {
        next(error as any);
    }
});

// Indexes per DB_SCHEMA.md + sibling-name uniqueness constraint
ProjectSchema.index(
    { organizationId: 1, path: 1 },
    { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } },
);
ProjectSchema.index({ organizationId: 1, 'ancestors._id': 1 });
ProjectSchema.index({ organizationId: 1, deletedAt: 1, updatedAt: -1 });
ProjectSchema.index(
    { organizationId: 1, parentPath: 1, nameLower: 1 },
    { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } },
);

const Project = mongoose.model<IProjectDocument, IProjectModel>('Project', ProjectSchema);

export default Project;
