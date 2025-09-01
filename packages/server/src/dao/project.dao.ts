/**
 * @fileoverview Project DAO - Database operations for Project
 */

import Project, { type IProjectDocument } from '../models/Project.model';
import Organization from '../models/Organization.model';
import User from '../models/User.model';
import dbError from '../utils/db.error';
import computeParentPath from '../utils/project.utils';

interface ListFilter {
    organizationId?: string;
    path?: string;
    ancestorId?: string;
}

interface ListOptions {
    page?: number;
    limit?: number;
}

async function createProject(data: Partial<IProjectDocument>): Promise<IProjectDocument> {
    try {
        const organization: any = await Organization.findById(data.organizationId);
        if (!organization) throw new Error('Organization not found');

        const user: any = await User.findById(data.createdBy);
        if (!user) throw new Error('User not found');

        const doc = new Project({
            ...data,
            nameLower: String(data.name || '')
                .trim()
                .toLowerCase(),
            parentPath: computeParentPath(String(data.path || '').trim()),
        } as any);
        await doc.save();
        return doc;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Create project failed', 500, error);
    }
}

async function findById(id: string): Promise<IProjectDocument | null> {
    try {
        return await Project.findById(id);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find project by id failed', 500, error);
    }
}

async function findByPath(organizationId: string, path: string): Promise<IProjectDocument | null> {
    try {
        return await Project.findOne({ organizationId, path, deletedAt: { $exists: false } });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find project by path failed', 500, error);
    }
}

async function findUniqueSiblingName(
    organizationId: string,
    parentPath: string,
    name: string,
    excludeId?: string,
): Promise<IProjectDocument | null> {
    try {
        const nameLower = String(name).trim().toLowerCase();
        const query: any = { organizationId, parentPath, nameLower, deletedAt: { $exists: false } };
        if (excludeId) query._id = { $ne: excludeId };
        return await Project.findOne(query);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find unique sibling name failed', 500, error);
    }
}

async function list(
    filter: ListFilter = {},
    options: ListOptions = {},
): Promise<{ projects: IProjectDocument[]; total: number }> {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const query: any = {};
        if (filter.organizationId) query.organizationId = filter.organizationId;
        if (filter.path) query.path = filter.path;
        if (filter.ancestorId) query['ancestors._id'] = filter.ancestorId;
        query.deletedAt = { $exists: false };

        const [projects, total] = await Promise.all([
            Project.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
            Project.countDocuments(query),
        ]);
        return { projects: projects as unknown as IProjectDocument[], total };
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'List projects failed', 500, error);
    }
}

async function updateById(
    id: string,
    patch: Partial<{ name: string; path: string; ancestors: any; deletedAt: Date | null }>,
): Promise<IProjectDocument | null> {
    try {
        const $set: any = {};
        if (patch.name !== undefined) {
            $set.name = patch.name;
            $set.nameLower = String(patch.name).trim().toLowerCase();
        }
        if (patch.path !== undefined) {
            $set.path = patch.path;
            $set.parentPath = computeParentPath(String(patch.path).trim());
        }
        if (patch.ancestors !== undefined) $set.ancestors = patch.ancestors;
        if (patch.deletedAt !== undefined) $set.deletedAt = patch.deletedAt;

        if (Object.keys($set).length === 0) return await Project.findById(id);
        await Project.updateOne({ _id: id }, { $set });
        return await Project.findById(id);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Update project failed', 500, error);
    }
}

async function softDeleteById(id: string): Promise<void> {
    try {
        await Project.updateOne({ _id: id }, { $set: { deletedAt: new Date() } });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Soft delete project failed', 500, error);
    }
}

export default {
    createProject,
    findById,
    findByPath,
    list,
    updateById,
    softDeleteById,
    findUniqueSiblingName,
};
