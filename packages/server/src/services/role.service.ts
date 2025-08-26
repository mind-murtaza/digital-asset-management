/**
 * Role Service (TypeScript)
 */

import roleDao from '../dao/role.dao';

function notFound(): any {
    const e: any = new Error('Role not found');
    e.status = 404;
    e.code = 'ROLE_NOT_FOUND';
    return e;
}

async function create(payload: any) {
    try {
        const role = await roleDao.createRole({
            organizationId: payload.organizationId,
            name: String(payload.name).trim(),
            description: payload.description,
            permissions: payload.permissions ?? [],
            isSystemRole: !!payload.isSystemRole,
            isDefault: !!payload.isDefault,
        } as any);
        return { role };
    } catch (error: any) {
        if (error.status) throw error;
        const e: any = new Error('Role create failed');
        e.status = 500;
        e.code = 'ROLE_CREATE_ERROR';
        throw e;
    }
}

async function getById(id: string) {
    try {
        const role = await roleDao.findById(id);
        if (!role) throw notFound();
        return { role };
    } catch (error: any) {
        if (error.status) throw error;
        const e: any = new Error('Role fetch failed');
        e.status = 500;
        e.code = 'ROLE_FETCH_ERROR';
        throw e;
    }
}

async function list(query: { organizationId?: string; page?: number; limit?: number }) {
    try {
        const { roles, total } = await roleDao.list(
            { organizationId: query.organizationId },
            { page: query.page, limit: query.limit },
        );
        return { roles, total };
    } catch (error: any) {
        if (error.status) throw error;
        const e: any = new Error('Role list failed');
        e.status = 500;
        e.code = 'ROLE_LIST_ERROR';
        throw e;
    }
}

async function update(id: string, patch: any) {
    try {
        const updated = await roleDao.updateById(id, patch);
        if (!updated) throw notFound();
        return { role: updated };
    } catch (error: any) {
        if (error.status) throw error;
        const e: any = new Error('Role update failed');
        e.status = 500;
        e.code = 'ROLE_UPDATE_ERROR';
        throw e;
    }
}

async function remove(id: string) {
    try {
        await roleDao.removeById(id);
    } catch (error: any) {
        if (error.status) throw error;
        const e: any = new Error('Role delete failed');
        e.status = 500;
        e.code = 'ROLE_DELETE_ERROR';
        throw e;
    }
}

const service = { create, getById, list, update, remove };
export = service;
