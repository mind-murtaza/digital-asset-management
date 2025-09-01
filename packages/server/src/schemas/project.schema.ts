import { z } from 'zod';
import { objectIdSchema } from './common.schema';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

const projectNameSchema = z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(200, 'Project name cannot exceed 200 characters')
    .regex(
        /^(?! )[a-zA-Z0-9 ]*(?<! )$/,
        'Project name may contain only letters, numbers, and spaces; no leading or trailing spaces allowed.',
    )
    .describe('Project name');

// Path must start with '/', no trailing '/', no spaces, segments are a-z0-9-_+
const projectPathSchema = z
    .string()
    .trim()
    .regex(/^\/[A-Za-z0-9\-\_+]+(?:\/[A-Za-z0-9\-\_+]+)*$/, 'Invalid project path')
    .max(1024, 'Project path too long');

const projectAncestorSchema = z.object({
    _id: objectIdSchema,
    name: projectNameSchema,
});

const createProjectSchema = z
    .object({
        organizationId: objectIdSchema,
        name: projectNameSchema,
        path: projectPathSchema,
        ancestors: z.array(projectAncestorSchema).default([]).optional(),
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

const updateProjectSchema = z
    .object({
        name: projectNameSchema.optional(),
        path: projectPathSchema.optional(),
        ancestors: z.array(projectAncestorSchema).optional(),
        deletedAt: z.coerce.date().nullable().optional(),
    })
    .strict()
    .openapi({
        description: 'Update Project payload',
    });

const projectIdParamSchema = z.object({ id: objectIdSchema }).strict();

const listProjectsQuerySchema = z
    .object({
        organizationId: objectIdSchema.optional(),
        path: projectPathSchema.optional(),
        ancestorId: objectIdSchema.optional(),
        page: z.coerce.number().int().positive().max(100000).optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict();

const resolveByPathQuerySchema = z
    .object({
        organizationId: objectIdSchema,
        path: projectPathSchema,
    })
    .strict();

export {
    createProjectSchema,
    updateProjectSchema,
    projectIdParamSchema,
    listProjectsQuerySchema,
    resolveByPathQuerySchema,
};