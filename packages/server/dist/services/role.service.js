"use strict";
/**
 * Role Service (TypeScript)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const role_dao_1 = __importDefault(require("../dao/role.dao"));
function notFound() {
    const e = new Error('Role not found');
    e.status = 404;
    e.code = 'ROLE_NOT_FOUND';
    return e;
}
async function create(payload) {
    try {
        const role = await role_dao_1.default.createRole({
            organizationId: payload.organizationId,
            name: String(payload.name).trim(),
            description: payload.description,
            permissions: payload.permissions ?? [],
            isSystemRole: !!payload.isSystemRole,
            isDefault: !!payload.isDefault,
        });
        return { role };
    }
    catch (error) {
        if (error.status)
            throw error;
        const e = new Error('Role create failed');
        e.status = 500;
        e.code = 'ROLE_CREATE_ERROR';
        throw e;
    }
}
async function getById(id) {
    try {
        const role = await role_dao_1.default.findById(id);
        if (!role)
            throw notFound();
        return { role };
    }
    catch (error) {
        if (error.status)
            throw error;
        const e = new Error('Role fetch failed');
        e.status = 500;
        e.code = 'ROLE_FETCH_ERROR';
        throw e;
    }
}
async function list(query) {
    try {
        const { roles, total } = await role_dao_1.default.list({ organizationId: query.organizationId }, { page: query.page, limit: query.limit });
        return { roles, total };
    }
    catch (error) {
        if (error.status)
            throw error;
        const e = new Error('Role list failed');
        e.status = 500;
        e.code = 'ROLE_LIST_ERROR';
        throw e;
    }
}
async function update(id, patch) {
    try {
        const updated = await role_dao_1.default.updateById(id, patch);
        if (!updated)
            throw notFound();
        return { role: updated };
    }
    catch (error) {
        if (error.status)
            throw error;
        const e = new Error('Role update failed');
        e.status = 500;
        e.code = 'ROLE_UPDATE_ERROR';
        throw e;
    }
}
async function remove(id) {
    try {
        await role_dao_1.default.removeById(id);
    }
    catch (error) {
        if (error.status)
            throw error;
        const e = new Error('Role delete failed');
        e.status = 500;
        e.code = 'ROLE_DELETE_ERROR';
        throw e;
    }
}
const service = { create, getById, list, update, remove };
module.exports = service;
