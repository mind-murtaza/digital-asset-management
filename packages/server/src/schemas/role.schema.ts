import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const roleCreateSchema = z
    .object({
        organizationId: objectIdSchema,
        name: z.string().min(1).max(120).trim(),
        description: z.string().max(500).optional(),
        permissions: z.array(z.string()).default([]).optional(),
        isSystemRole: z.boolean().optional(),
        isDefault: z.boolean().optional(),
    })
    .strict();

export const roleUpdateSchema = z
    .object({
        name: z.string().min(1).max(120).trim().optional(),
        description: z.string().max(500).optional(),
        permissions: z.array(z.string()).optional(),
        isSystemRole: z.boolean().optional(),
        isDefault: z.boolean().optional(),
    })
    .strict();

export const roleIdParamSchema = z.object({ id: objectIdSchema }).strict();

export const roleListQuerySchema = z
    .object({
        organizationId: objectIdSchema.optional(),
        page: z.coerce.number().int().positive().max(100000).optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict();
