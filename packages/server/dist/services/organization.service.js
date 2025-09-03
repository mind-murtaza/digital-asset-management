"use strict";
/**
 * Organization Service (TypeScript)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const organization_dao_1 = __importDefault(require("../dao/organization.dao"));
const user_dao_1 = __importDefault(require("../dao/user.dao"));
function notFound() {
    const err = new Error('Organization not found');
    err.status = 404;
    err.code = 'ORG_NOT_FOUND';
    return err;
}
async function create(payload, auth) {
    try {
        const userId = String(auth.userId);
        const user = await user_dao_1.default.findById(userId);
        if (!user)
            throw new Error('User not found');
        const org = await organization_dao_1.default.createOrganization({
            name: String(payload.name).trim(),
            ownerId: userId,
            status: payload.status ?? 'active',
            settings: payload.settings,
        });
        user.organizationId = org._id;
        await user.save();
        return { organization: org };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Organization create failed');
        err.status = 500;
        err.code = 'ORG_CREATE_ERROR';
        throw err;
    }
}
async function getById(id) {
    try {
        const org = await organization_dao_1.default.findById(id);
        if (!org)
            throw notFound();
        return { organization: org };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Organization fetch failed');
        err.status = 500;
        err.code = 'ORG_FETCH_ERROR';
        throw err;
    }
}
async function list(query) {
    try {
        const { organizations, total } = await organization_dao_1.default.list({ status: query.status }, { page: query.page, limit: query.limit });
        return { organizations, total };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Organization list failed');
        err.status = 500;
        err.code = 'ORG_LIST_ERROR';
        throw err;
    }
}
async function update(id, patch) {
    try {
        const updated = await organization_dao_1.default.updateById(id, patch);
        if (!updated)
            throw notFound();
        return { organization: updated };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Organization update failed');
        err.status = 500;
        err.code = 'ORG_UPDATE_ERROR';
        throw err;
    }
}
async function archive(id) {
    try {
        await organization_dao_1.default.setStatus(id, 'archived');
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Organization archive failed');
        err.status = 500;
        err.code = 'ORG_ARCHIVE_ERROR';
        throw err;
    }
}
const service = { create, getById, list, update, archive };
module.exports = service;
