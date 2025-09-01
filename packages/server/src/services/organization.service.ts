/**
 * Organization Service (TypeScript)
 */

import organizationDao from '../dao/organization.dao';
import userDao from '../dao/user.dao';

function notFound(): any {
    const err: any = new Error('Organization not found');
    err.status = 404;
    err.code = 'ORG_NOT_FOUND';
    return err;
}

async function create(payload: any, auth: any) {
    try {
        const userId = String(auth.userId);
        const user: any = await userDao.findById(userId);
        if (!user) throw new Error('User not found');

        const org = await organizationDao.createOrganization({
            name: String(payload.name).trim(),
            ownerId: userId,
            status: payload.status ?? 'active',
            settings: payload.settings,
        } as any);

        user.organizationId = org._id;
        await user.save();

        return { organization: org };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Organization create failed');
        err.status = 500;
        err.code = 'ORG_CREATE_ERROR';
        throw err;
    }
}

async function getById(id: string) {
    try {
        const org = await organizationDao.findById(id);
        if (!org) throw notFound();
        return { organization: org };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Organization fetch failed');
        err.status = 500;
        err.code = 'ORG_FETCH_ERROR';
        throw err;
    }
}

async function list(query: { status?: string; page?: number; limit?: number }) {
    try {
        const { organizations, total } = await organizationDao.list(
            { status: query.status as any },
            { page: query.page, limit: query.limit },
        );
        return { organizations, total };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Organization list failed');
        err.status = 500;
        err.code = 'ORG_LIST_ERROR';
        throw err;
    }
}

async function update(id: string, patch: any) {
    try {
        const updated = await organizationDao.updateById(id, patch);
        if (!updated) throw notFound();
        return { organization: updated };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Organization update failed');
        err.status = 500;
        err.code = 'ORG_UPDATE_ERROR';
        throw err;
    }
}

async function archive(id: string) {
    try {
        await organizationDao.setStatus(id, 'archived');
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Organization archive failed');
        err.status = 500;
        err.code = 'ORG_ARCHIVE_ERROR';
        throw err;
    }
}

const service = { create, getById, list, update, archive };
export = service;
