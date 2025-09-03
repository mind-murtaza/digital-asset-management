"use strict";
/**
 * @fileoverview Organization DAO - Database operations for Organization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Organization_model_1 = __importDefault(require("../models/Organization.model"));
const db_error_1 = __importDefault(require("../utils/db.error"));
async function createOrganization(data) {
    try {
        const org = new Organization_model_1.default(data);
        await org.save();
        return org;
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Create organization failed', 500, error);
    }
}
async function findById(id) {
    try {
        return await Organization_model_1.default.findById(id);
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find organization by id failed', 500, error);
    }
}
async function list(filter = {}, options = {}) {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const query = {};
        if (filter.status)
            query.status = filter.status;
        const [organizations, total] = await Promise.all([
            Organization_model_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Organization_model_1.default.countDocuments(query),
        ]);
        return {
            organizations: organizations,
            total,
        };
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'List organizations failed', 500, error);
    }
}
async function updateById(id, patch) {
    try {
        const $set = {};
        if (patch.name !== undefined)
            $set.name = patch.name;
        if (patch.status !== undefined)
            $set.status = patch.status;
        if (patch.settings !== undefined)
            $set['settings'] = patch.settings;
        if (Object.keys($set).length === 0)
            return await Organization_model_1.default.findById(id);
        await Organization_model_1.default.updateOne({ _id: id }, { $set });
        return await Organization_model_1.default.findById(id);
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Update organization failed', 500, error);
    }
}
async function setStatus(id, status) {
    try {
        await Organization_model_1.default.updateOne({ _id: id }, { $set: { status } });
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Set organization status failed', 500, error);
    }
}
exports.default = { createOrganization, findById, list, updateById, setStatus };
