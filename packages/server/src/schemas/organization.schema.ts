import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const organizationStatusSchema = z.enum(['active', 'suspended', 'archived']);

const organizationNameSchema = z
    .string()
    .trim()
    .min(1, 'Organization Name is required')
    .max(120, 'Organization Name cannot exceed 120 characters')
    .regex(
        /^[a-zA-Z](?:[ .0-9]*[a-zA-Z])*$/,
        'Name must start and end with a letter. Only letters, spaces, dots, and numbers are allowed in between.',
    );

export const createOrganizationSchema = z
    .object({
        name: organizationNameSchema,
        ownerId: objectIdSchema,
        status: organizationStatusSchema.optional(),
        settings: z
            .object({
                storageQuotaBytes: z.number().int().positive().optional(),
                featureFlags: z
                    .object({
                        enablePublicSharing: z.boolean().optional(),
                        enableApiAccess: z.boolean().optional(),
                    })
                    .optional(),
            })
            .partial()
            .optional(),
    })
    .strict();

export const updateOrganizationSchema = z
    .object({
        name: z.string().min(1).max(120).trim().optional(),
        status: organizationStatusSchema.optional(),
        settings: z
            .object({
                storageQuotaBytes: z.number().int().positive().optional(),
                featureFlags: z
                    .object({
                        enablePublicSharing: z.boolean().optional(),
                        enableApiAccess: z.boolean().optional(),
                    })
                    .optional(),
            })
            .partial()
            .optional(),
    })
    .strict();

export const organizationIdParamSchema = z.object({ id: objectIdSchema }).strict();

export const listOrganizationsQuerySchema = z
    .object({
        status: organizationStatusSchema.optional(),
        page: z.coerce.number().int().positive().max(100000).optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict();
