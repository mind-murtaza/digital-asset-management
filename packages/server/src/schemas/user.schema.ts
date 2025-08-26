import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema } from './common.schema';

const userProfileSchema = z
    .object({
        firstName: nameSchema,
        lastName: nameSchema,
    })
    .strict();

const userStatusSchema = z
    .enum(['active', 'suspended', 'pending_verification', 'deleted'], {
        errorMap: () => ({
            message: 'Status must be: active, suspended, pending_verification, or deleted',
        }),
    })
    .default('active');

const createUserSchema = z
    .object({
        email: emailSchema,
        password: passwordSchema,
        profile: userProfileSchema,
        status: userStatusSchema.optional(),
        emailVerified: z.boolean().default(false).optional(),
    })
    .strict();

const updateUserSchema = z
    .object({
        profile: userProfileSchema.partial().optional(),
        status: userStatusSchema.optional(),
        emailVerified: z.boolean().optional(),
        lastLoginAt: z.date().optional(),
    })
    .strict();

const loginSchema = z
    .object({
        email: emailSchema,
        password: passwordSchema,
    })
    .strict();

const changePasswordSchema = z
    .object({
        currentPassword: passwordSchema,
        newPassword: passwordSchema,
    })
    .strict();

const profileUpdateSchema = userProfileSchema
    .partial()
    .refine((data: any) => Object.keys(data).length > 0, 'At least one field is required');

export {
    userProfileSchema,
    userStatusSchema,
    createUserSchema,
    updateUserSchema,
    loginSchema,
    changePasswordSchema,
    profileUpdateSchema,
};
