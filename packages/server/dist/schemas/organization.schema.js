"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrganizationsQuerySchema = exports.organizationIdParamSchema = exports.updateOrganizationSchema = exports.createOrganizationSchema = exports.organizationStatusSchema = void 0;
const zod_1 = require("zod");
const common_schema_1 = require("./common.schema");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.organizationStatusSchema = zod_1.z.enum(['active', 'suspended', 'archived']);
const organizationNameSchema = zod_1.z
    .string()
    .trim()
    .min(1, 'Organization Name is required')
    .max(120, 'Organization Name cannot exceed 120 characters')
    .regex(/^[a-zA-Z](?:[ .0-9]*[a-zA-Z])*$/, 'Name must start and end with a letter. Only letters, spaces, dots, and numbers are allowed in between.');
exports.createOrganizationSchema = zod_1.z
    .object({
    name: organizationNameSchema,
    status: exports.organizationStatusSchema.optional(),
    settings: zod_1.z
        .object({
        storageQuotaBytes: zod_1.z.number().int().positive().optional(),
        featureFlags: zod_1.z
            .object({
            enablePublicSharing: zod_1.z.boolean().optional(),
            enableApiAccess: zod_1.z.boolean().optional(),
        })
            .optional(),
    })
        .partial()
        .optional(),
})
    .strict()
    .openapi({
    description: 'Create Organization payload',
    example: {
        name: 'New Organization Name',
        status: 'active',
        settings: {
            storageQuotaBytes: 1000000000,
            featureFlags: {
                enablePublicSharing: true,
                enableApiAccess: false,
            },
        },
    },
});
exports.updateOrganizationSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120).trim().optional(),
    status: exports.organizationStatusSchema.optional(),
    settings: zod_1.z
        .object({
        storageQuotaBytes: zod_1.z.number().int().positive().optional(),
        featureFlags: zod_1.z
            .object({
            enablePublicSharing: zod_1.z.boolean().optional(),
            enableApiAccess: zod_1.z.boolean().optional(),
        })
            .optional(),
    })
        .partial()
        .optional(),
})
    .strict()
    .openapi({
    description: 'Update Organization payload',
    example: {
        name: 'New Organization Name',
        status: 'archived',
        settings: {
            storageQuotaBytes: 1000000000,
            featureFlags: {
                enablePublicSharing: true,
                enableApiAccess: false,
            },
        },
    },
});
exports.organizationIdParamSchema = zod_1.z.object({ id: common_schema_1.objectIdSchema }).strict();
exports.listOrganizationsQuerySchema = zod_1.z
    .object({
    status: exports.organizationStatusSchema.optional(),
    page: zod_1.z.coerce.number().int().positive().max(100000).optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
})
    .strict();
