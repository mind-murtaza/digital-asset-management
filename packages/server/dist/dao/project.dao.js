"use strict";
/**
 * @fileoverview Project DAO - Database operations for Project
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Project_model_1 = __importDefault(require("../models/Project.model"));
const Organization_model_1 = __importDefault(require("../models/Organization.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const db_error_1 = __importDefault(require("../utils/db.error"));
const project_utils_1 = __importDefault(require("../utils/project.utils"));
async function createProject(data) {
    try {
        const organization = await Organization_model_1.default.findById(data.organizationId);
        if (!organization)
            throw new Error('Organization not found');
        const user = await User_model_1.default.findById(data.createdBy);
        if (!user)
            throw new Error('User not found');
        const doc = new Project_model_1.default({
            ...data,
            nameLower: String(data.name || '')
                .trim()
                .toLowerCase(),
            parentPath: (0, project_utils_1.default)(String(data.path || '').trim()),
        });
        await doc.save();
        return doc;
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Create project failed', 500, error);
    }
}
async function findById(id) {
    try {
        return await Project_model_1.default.findById(id);
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find project by id failed', 500, error);
    }
}
async function findByPath(organizationId, path) {
    try {
        return await Project_model_1.default.findOne({ organizationId, path, deletedAt: { $exists: false } });
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find project by path failed', 500, error);
    }
}
async function findUniqueSiblingName(organizationId, parentPath, name, excludeId) {
    try {
        const nameLower = String(name).trim().toLowerCase();
        const query = { organizationId, parentPath, nameLower, deletedAt: { $exists: false } };
        if (excludeId)
            query._id = { $ne: excludeId };
        return await Project_model_1.default.findOne(query);
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Find unique sibling name failed', 500, error);
    }
}
async function list(filter = {}, options = {}) {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const query = {};
        if (filter.organizationId)
            query.organizationId = filter.organizationId;
        if (filter.path)
            query.path = filter.path;
        if (filter.ancestorId)
            query['ancestors._id'] = filter.ancestorId;
        query.deletedAt = { $exists: false };
        const [projects, total] = await Promise.all([
            Project_model_1.default.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
            Project_model_1.default.countDocuments(query),
        ]);
        return { projects: projects, total };
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'List projects failed', 500, error);
    }
}
async function updateById(id, patch) {
    try {
        const $set = {};
        if (patch.name !== undefined) {
            $set.name = patch.name;
            $set.nameLower = String(patch.name).trim().toLowerCase();
        }
        if (patch.path !== undefined) {
            $set.path = patch.path;
            $set.parentPath = (0, project_utils_1.default)(String(patch.path).trim());
        }
        if (patch.ancestors !== undefined)
            $set.ancestors = patch.ancestors;
        if (patch.deletedAt !== undefined)
            $set.deletedAt = patch.deletedAt;
        if (Object.keys($set).length === 0)
            return await Project_model_1.default.findById(id);
        await Project_model_1.default.updateOne({ _id: id }, { $set });
        return await Project_model_1.default.findById(id);
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Update project failed', 500, error);
    }
}
async function softDeleteById(id) {
    try {
        await Project_model_1.default.updateOne({ _id: id }, { $set: { deletedAt: new Date() } });
    }
    catch (error) {
        throw (0, db_error_1.default)('DATABASE_ERROR', 'Soft delete project failed', 500, error);
    }
}
exports.default = {
    createProject,
    findById,
    findByPath,
    list,
    updateById,
    softDeleteById,
    findUniqueSiblingName,
};
