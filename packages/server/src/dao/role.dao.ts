/**
 * @fileoverview Role DAO - Database operations for Role
 */

import Role, { type IRoleDocument } from '../models/Role.model';
import dbError from '../utils/db.error';

async function createRole(data: Partial<IRoleDocument>): Promise<IRoleDocument> {
    try {
        const role = new Role(data);
        await role.save();
        return role;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Create role failed', 500, error);
    }
}

async function findById(id: string): Promise<IRoleDocument | null> {
    try {
        return await Role.findById(id);
    } catch (e: any) {
        throw dbError('DATABASE_ERROR', 'Find role failed', 500, e);
    }
}

async function list(
    filter: { organizationId?: string } = {},
    options: { page?: number; limit?: number } = {},
): Promise<{ roles: IRoleDocument[]; total: number }> {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const query: any = {};
        if (filter.organizationId) query.organizationId = filter.organizationId;
        const [roles, total] = await Promise.all([
            Role.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Role.countDocuments(query),
        ]);
        return { roles: roles as unknown as IRoleDocument[], total };
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'List roles failed', 500, error);
    }
}

async function updateById(
    id: string,
    patch: Partial<IRoleDocument>,
): Promise<IRoleDocument | null> {
    try {
        await Role.updateOne({ _id: id }, { $set: patch });
        return await Role.findById(id);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Update role failed', 500, error);
    }
}

async function removeById(id: string): Promise<void> {
    try {
        await Role.deleteOne({ _id: id });
    } catch (e: any) {
        throw dbError('DATABASE_ERROR', 'Delete role failed', 500, e);
    }
}

export default { createRole, findById, list, updateById, removeById };
