"use strict";
/**
 * @fileoverview Role DAO - Database operations for Role
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Role_model_1 = __importDefault(require("../models/Role.model"));
const db_error_1 = __importDefault(require("../utils/db.error"));
async function createRole(data) {
    try {
        const role = new Role_model_1.default(data);
        await role.save();
        return role;
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Create role failed', 500, error);
    }
}
async function findById(id) {
    try {
        return await Role_model_1.default.findById(id);
    }
    catch (e) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find role failed', 500, e);
    }
}
async function list(filter = {}, options = {}) {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const query = {};
        if (filter.organizationId)
            query.organizationId = filter.organizationId;
        const [roles, total] = await Promise.all([
            Role_model_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Role_model_1.default.countDocuments(query),
        ]);
        return { roles: roles, total };
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'List roles failed', 500, error);
    }
}
async function updateById(id, patch) {
    try {
        await Role_model_1.default.updateOne({ _id: id }, { $set: patch });
        return await Role_model_1.default.findById(id);
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Update role failed', 500, error);
    }
}
async function removeById(id) {
    try {
        await Role_model_1.default.deleteOne({ _id: id });
    }
    catch (e) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Delete role failed', 500, e);
    }
}
exports.default = { createRole, findById, list, updateById, removeById };
