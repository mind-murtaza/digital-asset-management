"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleListQuerySchema = exports.roleIdParamSchema = exports.roleUpdateSchema = exports.roleCreateSchema = void 0;
const zod_1 = require("zod");
const common_schema_1 = require("./common.schema");
exports.roleCreateSchema = zod_1.z
    .object({
    organizationId: common_schema_1.objectIdSchema,
    name: zod_1.z.string().min(1).max(120).trim(),
    description: zod_1.z.string().max(500).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).default([]).optional(),
    isSystemRole: zod_1.z.boolean().optional(),
    isDefault: zod_1.z.boolean().optional(),
})
    .strict();
exports.roleUpdateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120).trim().optional(),
    description: zod_1.z.string().max(500).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
    isSystemRole: zod_1.z.boolean().optional(),
    isDefault: zod_1.z.boolean().optional(),
})
    .strict();
exports.roleIdParamSchema = zod_1.z.object({ id: common_schema_1.objectIdSchema }).strict();
exports.roleListQuerySchema = zod_1.z
    .object({
    organizationId: common_schema_1.objectIdSchema.optional(),
    page: zod_1.z.coerce.number().int().positive().max(100000).optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
})
    .strict();
