/**
 * Project Service (TypeScript)
 */

import projectDao from '../dao/project.dao';
import organizationDao from '../dao/organization.dao';
import computeParentPath from '../utils/project.utils';
import userDao from '../dao/user.dao';

function notFound(): any {
    const err: any = new Error('Project not found');
    err.status = 404;
    err.code = 'PROJECT_NOT_FOUND';
    return err;
}

async function assertUniqueSiblingName(
    organizationId: string,
    parentPath: string,
    name: string,
    excludeId?: string,
) {
    let exists: any;
    if (excludeId) {
        exists = await projectDao.findUniqueSiblingName(
            organizationId,
            parentPath,
            name,
            excludeId,
        );
    } else {
        exists = await projectDao.findUniqueSiblingName(organizationId, parentPath, name);
    }

    if (exists) {
        const err: any = new Error('Project with same name already exists at this level');
        err.status = 409;
        err.code = 'PROJECT_NAME_CONFLICT';
        throw err;
    }
}

async function create(payload: any, auth: any) {
    try {
        const userId = String(auth.userId);
        const parentPath = computeParentPath(String(payload.path).trim());
        await assertUniqueSiblingName(payload.organizationId, parentPath, payload.name);

        const organization: any = await organizationDao.findById(payload.organizationId);
        if (!organization) throw notFound();

        const user: any = await userDao.findById(userId);
        if (!user) throw notFound();

        const project = await projectDao.createProject({
            organizationId: payload.organizationId,
            name: String(payload.name).trim(),
            path: String(payload.path).trim(),
            ancestors: payload.ancestors ?? [],
            createdBy: userId,
        } as any);
        return { project };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Project create failed');
        err.status = 500;
        err.code = 'PROJECT_CREATE_ERROR';
        throw err;
    }
}

async function getById(id: string) {
    try {
        const project = await projectDao.findById(id);
        if (!project) throw notFound();
        return { project };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Project fetch failed');
        err.status = 500;
        err.code = 'PROJECT_FETCH_ERROR';
        throw err;
    }
}

async function resolveByPath(organizationId: string, path: string) {
    try {
        const project = await projectDao.findByPath(organizationId, path);
        if (!project) throw notFound();
        return { project };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Project resolve by path failed');
        err.status = 500;
        err.code = 'PROJECT_RESOLVE_ERROR';
        throw err;
    }
}

async function list(query: {
    organizationId?: string;
    path?: string;
    ancestorId?: string;
    page?: number;
    limit?: number;
}) {
    try {
        const { projects, total } = await projectDao.list(
            {
                organizationId: query.organizationId,
                path: query.path,
                ancestorId: query.ancestorId,
            },
            { page: query.page, limit: query.limit },
        );
        return { projects, total };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Project list failed');
        err.status = 500;
        err.code = 'PROJECT_LIST_ERROR';
        throw err;
    }
}

async function update(id: string, patch: any) {
    try {
        const current = await projectDao.findById(id);
        if (!current) throw notFound();
        if (patch.name || patch.path) {
            const nextName = patch.name !== undefined ? String(patch.name).trim() : current.name;
            const nextPath = patch.path !== undefined ? String(patch.path).trim() : current.path;
            const parentPath = computeParentPath(nextPath);
            await assertUniqueSiblingName(String(current.organizationId), parentPath, nextName, id);
        }
        const updated = await projectDao.updateById(id, patch);
        if (!updated) throw notFound();
        return { project: updated };
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Project update failed');
        err.status = 500;
        err.code = 'PROJECT_UPDATE_ERROR';
        throw err;
    }
}

async function softDelete(id: string) {
    try {
        await projectDao.softDeleteById(id);
    } catch (error: any) {
        if (error.status) throw error;
        const err: any = new Error('Project delete failed');
        err.status = 500;
        err.code = 'PROJECT_DELETE_ERROR';
        throw err;
    }
}

const service = { create, getById, resolveByPath, list, update, softDelete };
export = service;
