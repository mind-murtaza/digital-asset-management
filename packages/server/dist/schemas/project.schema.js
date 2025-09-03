"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveByPathQuerySchema = exports.listProjectsQuerySchema = exports.projectIdParamSchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
const common_schema_1 = require("./common.schema");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
const projectNameSchema = zod_1.z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(200, 'Project name cannot exceed 200 characters')
    .regex(/^(?! )[a-zA-Z0-9 ]*(?<! )$/, 'Project name may contain only letters, numbers, and spaces; no leading or trailing spaces allowed.')
    .describe('Project name');
// Path must start with '/', no trailing '/', no spaces, segments are a-z0-9-_+
const projectPathSchema = zod_1.z
    .string()
    .trim()
    .regex(/^\/[A-Za-z0-9\-\_+]+(?:\/[A-Za-z0-9\-\_+]+)*$/, 'Invalid project path')
    .max(1024, 'Project path too long');
const projectAncestorSchema = zod_1.z.object({
    _id: common_schema_1.objectIdOpenApi,
    name: projectNameSchema,
});
const createProjectSchema = zod_1.z
    .object({
    organizationId: common_schema_1.objectIdOpenApi,
    name: projectNameSchema,
    path: projectPathSchema,
    ancestors: zod_1.z.array(projectAncestorSchema).default([]).optional(),
})
    .strict()
    .openapi({
    description: 'Create Project payload',
    example: {
        organizationId: '64b0c7f4a2c8a2b3c4d5e6f7',
        name: 'Campaign A',
        path: '/brand/2025/campaign-a',
        ancestors: [
            { _id: '64b0c7f4a2c8a2b3c4d5e6f7', name: 'brand' },
            { _id: '64b0c7f4a2c8a2b3c4d5e6f8', name: '2025' },
        ],
    },
});
exports.createProjectSchema = createProjectSchema;
const updateProjectSchema = zod_1.z
    .object({
    name: projectNameSchema.optional(),
    path: projectPathSchema.optional(),
    ancestors: zod_1.z.array(projectAncestorSchema).optional(),
    deletedAt: zod_1.z.coerce.date().nullable().optional(),
})
    .strict()
    .openapi({
    description: 'Update Project payload',
});
exports.updateProjectSchema = updateProjectSchema;
const projectIdParamSchema = zod_1.z.object({ id: common_schema_1.objectIdOpenApi }).strict();
exports.projectIdParamSchema = projectIdParamSchema;
const listProjectsQuerySchema = zod_1.z
    .object({
    organizationId: common_schema_1.objectIdOpenApi.optional(),
    path: projectPathSchema.optional(),
    ancestorId: common_schema_1.objectIdOpenApi.optional(),
    page: zod_1.z.coerce.number().int().positive().max(100000).optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
})
    .strict();
exports.listProjectsQuerySchema = listProjectsQuerySchema;
const resolveByPathQuerySchema = zod_1.z
    .object({
    organizationId: common_schema_1.objectIdOpenApi,
    path: projectPathSchema,
})
    .strict();
exports.resolveByPathQuerySchema = resolveByPathQuerySchema;
