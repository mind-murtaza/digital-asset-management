"use strict";
/**
 * Project Service (TypeScript)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const project_dao_1 = __importDefault(require("../dao/project.dao"));
const organization_dao_1 = __importDefault(require("../dao/organization.dao"));
const project_utils_1 = __importDefault(require("../utils/project.utils"));
const user_dao_1 = __importDefault(require("../dao/user.dao"));
function notFound() {
    const err = new Error('Project not found');
    err.status = 404;
    err.code = 'PROJECT_NOT_FOUND';
    return err;
}
async function assertUniqueSiblingName(organizationId, parentPath, name, excludeId) {
    let exists;
    if (excludeId) {
        exists = await project_dao_1.default.findUniqueSiblingName(organizationId, parentPath, name, excludeId);
    }
    else {
        exists = await project_dao_1.default.findUniqueSiblingName(organizationId, parentPath, name);
    }
    if (exists) {
        const err = new Error('Project with same name already exists at this level');
        err.status = 409;
        err.code = 'PROJECT_NAME_CONFLICT';
        throw err;
    }
}
async function create(payload, auth) {
    try {
        const userId = String(auth.userId);
        const parentPath = (0, project_utils_1.default)(String(payload.path).trim());
        await assertUniqueSiblingName(payload.organizationId, parentPath, payload.name);
        const organization = await organization_dao_1.default.findById(payload.organizationId);
        if (!organization)
            throw notFound();
        const user = await user_dao_1.default.findById(userId);
        if (!user)
            throw notFound();
        const project = await project_dao_1.default.createProject({
            organizationId: payload.organizationId,
            name: String(payload.name).trim(),
            path: String(payload.path).trim(),
            ancestors: payload.ancestors ?? [],
            createdBy: userId,
        });
        return { project };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Project create failed');
        err.status = 500;
        err.code = 'PROJECT_CREATE_ERROR';
        throw err;
    }
}
async function getById(id) {
    try {
        const project = await project_dao_1.default.findById(id);
        if (!project)
            throw notFound();
        return { project };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Project fetch failed');
        err.status = 500;
        err.code = 'PROJECT_FETCH_ERROR';
        throw err;
    }
}
async function resolveByPath(organizationId, path) {
    try {
        const project = await project_dao_1.default.findByPath(organizationId, path);
        if (!project)
            throw notFound();
        return { project };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Project resolve by path failed');
        err.status = 500;
        err.code = 'PROJECT_RESOLVE_ERROR';
        throw err;
    }
}
async function list(query) {
    try {
        const { projects, total } = await project_dao_1.default.list({
            organizationId: query.organizationId,
            path: query.path,
            ancestorId: query.ancestorId,
        }, { page: query.page, limit: query.limit });
        return { projects, total };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Project list failed');
        err.status = 500;
        err.code = 'PROJECT_LIST_ERROR';
        throw err;
    }
}
async function update(id, patch) {
    try {
        const current = await project_dao_1.default.findById(id);
        if (!current)
            throw notFound();
        if (patch.name || patch.path) {
            const nextName = patch.name !== undefined ? String(patch.name).trim() : current.name;
            const nextPath = patch.path !== undefined ? String(patch.path).trim() : current.path;
            const parentPath = (0, project_utils_1.default)(nextPath);
            await assertUniqueSiblingName(String(current.organizationId), parentPath, nextName, id);
        }
        const updated = await project_dao_1.default.updateById(id, patch);
        if (!updated)
            throw notFound();
        return { project: updated };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Project update failed');
        err.status = 500;
        err.code = 'PROJECT_UPDATE_ERROR';
        throw err;
    }
}
async function softDelete(id) {
    try {
        await project_dao_1.default.softDeleteById(id);
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Project delete failed');
        err.status = 500;
        err.code = 'PROJECT_DELETE_ERROR';
        throw err;
    }
}
const service = { create, getById, resolveByPath, list, update, softDelete };
module.exports = service;
