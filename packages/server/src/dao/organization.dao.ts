/**
 * @fileoverview Organization DAO - Database operations for Organization
 */

import Organization, {
    type IOrganizationDocument,
    type OrgStatus,
} from '../models/Organization.model';
import dbError from '../utils/db.error';
import userDao from './user.dao';

async function createOrganization(
    data: Partial<IOrganizationDocument>,
): Promise<IOrganizationDocument> {
    try {
        const user: any = await userDao.findById(String(data.ownerId));
        if (!user) throw new Error('User not found');
        // Create organization
        const org = new Organization(data);
        await org.save();
        // Set user's organizationId
        user.organizationId = org._id;
        await user.save();
        return org;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Create organization failed', 500, error);
    }
}

async function findById(id: string): Promise<IOrganizationDocument | null> {
    try {
        return await Organization.findById(id);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find organization by id failed', 500, error);
    }
}

async function list(
    filter: { status?: OrgStatus } = {},
    options: { page?: number; limit?: number } = {},
): Promise<{ organizations: IOrganizationDocument[]; total: number }> {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const query: any = {};
        if (filter.status) query.status = filter.status;
        const [organizations, total] = await Promise.all([
            Organization.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Organization.countDocuments(query),
        ]);
        return {
            organizations: organizations as unknown as IOrganizationDocument[],
            total,
        };
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'List organizations failed', 500, error);
    }
}

async function updateById(
    id: string,
    patch: Partial<{ name: string; status: OrgStatus; settings: any }>,
): Promise<IOrganizationDocument | null> {
    try {
        const $set: any = {};
        if (patch.name !== undefined) $set.name = patch.name;
        if (patch.status !== undefined) $set.status = patch.status;
        if (patch.settings !== undefined) $set['settings'] = patch.settings;
        if (Object.keys($set).length === 0) return await Organization.findById(id);
        await Organization.updateOne({ _id: id }, { $set });
        return await Organization.findById(id);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Update organization failed', 500, error);
    }
}

async function setStatus(id: string, status: OrgStatus): Promise<void> {
    try {
        await Organization.updateOne({ _id: id }, { $set: { status } });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Set organization status failed', 500, error);
    }
}

export default { createOrganization, findById, list, updateById, setStatus };
