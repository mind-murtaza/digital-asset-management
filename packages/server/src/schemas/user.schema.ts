import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { emailSchema, passwordSchema, nameSchema } from './common.schema';

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

const userProfileSchema = z
    .object({
        firstName: nameSchema,
        lastName: nameSchema,
    })
    .strict();

const userStatusSchema = z
    .enum(['active', 'suspended', 'pending_verification', 'deleted'], 
        'Status must be: active, suspended, pending_verification, or deleted',
    )
    .default('active');

const createUserSchema = z
    .object({
        email: emailSchema,
        password: passwordSchema,
        profile: userProfileSchema,
        status: userStatusSchema.optional(),
        emailVerified: z.boolean().default(false).optional(),
    })
    .strict()
    .openapi({
        description: 'User registration schema',
        example: {
            email: 'john.doe@example.com',
            password: 'SecurePassword123!',
            profile: {
                firstName: 'John',
                lastName: 'Doe'
            }
        }
    });

const updateUserSchema = z
    .object({
        profile: userProfileSchema.partial().optional(),
    })
    .strict()
    .openapi({
        description: 'User update schema',
        example: {
            profile: {
                firstName: 'Jane',
                lastName: 'Smith'
            }
        }
    });

const loginSchema = z
    .object({
        email: emailSchema,
        password: passwordSchema,
    })
    .strict()
    .openapi({
        description: 'User login credentials',
        example: {
            email: 'john.doe@example.com',
            password: 'SecurePassword123!'
        }
    });

const changePasswordSchema = z
    .object({
        currentPassword: passwordSchema,
        newPassword: passwordSchema,
    })
    .strict()
    .openapi({
        description: 'Change password payload',
        example: {
            currentPassword: 'OldPassword123!',
            newPassword: 'NewSecurePassword456!'
        }
    });

const profileUpdateSchema = userProfileSchema
    .partial()
    .refine((data: any) => Object.keys(data).length > 0, 'At least one field is required')
    .openapi({
        description: 'User profile update payload',
        example: {
            firstName: 'Jane',
            lastName: 'Smith'
        }
    });

export {
    userProfileSchema,
    userStatusSchema,
    createUserSchema,
    updateUserSchema,
    loginSchema,
    changePasswordSchema,
    profileUpdateSchema,
};
