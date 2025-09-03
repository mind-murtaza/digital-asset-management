"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileUpdateSchema = exports.changePasswordSchema = exports.loginSchema = exports.updateUserSchema = exports.createUserSchema = exports.userStatusSchema = exports.userProfileSchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const common_schema_1 = require("./common.schema");
// Extend Zod with OpenAPI support
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
const userProfileSchema = zod_1.z
    .object({
    firstName: common_schema_1.nameSchema,
    lastName: common_schema_1.nameSchema,
})
    .strict();
exports.userProfileSchema = userProfileSchema;
const userStatusSchema = zod_1.z
    .enum(['active', 'suspended', 'pending_verification', 'deleted'], 'Status must be: active, suspended, pending_verification, or deleted')
    .default('active');
exports.userStatusSchema = userStatusSchema;
const createUserSchema = zod_1.z
    .object({
    email: common_schema_1.emailSchema,
    password: common_schema_1.passwordSchema,
    profile: userProfileSchema,
    status: userStatusSchema.optional(),
    emailVerified: zod_1.z.boolean().default(false).optional(),
})
    .strict()
    .openapi({
    description: 'User registration schema',
    example: {
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        profile: {
            firstName: 'John',
            lastName: 'Doe',
        },
    },
});
exports.createUserSchema = createUserSchema;
const updateUserSchema = zod_1.z
    .object({
    profile: userProfileSchema.partial().optional(),
})
    .strict()
    .openapi({
    description: 'User update schema',
    example: {
        profile: {
            firstName: 'Jane',
            lastName: 'Smith',
        },
    },
});
exports.updateUserSchema = updateUserSchema;
const loginSchema = zod_1.z
    .object({
    email: common_schema_1.emailSchema,
    password: common_schema_1.passwordSchema,
})
    .strict()
    .openapi({
    description: 'User login credentials',
    example: {
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
    },
});
exports.loginSchema = loginSchema;
const changePasswordSchema = zod_1.z
    .object({
    currentPassword: common_schema_1.passwordSchema,
    newPassword: common_schema_1.passwordSchema,
})
    .strict()
    .openapi({
    description: 'Change password payload',
    example: {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewSecurePassword456!',
    },
});
exports.changePasswordSchema = changePasswordSchema;
const profileUpdateSchema = userProfileSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, 'At least one field is required')
    .openapi({
    type: 'object',
    description: 'User profile update payload',
    example: {
        firstName: 'Jane',
        lastName: 'Smith',
    },
});
exports.profileUpdateSchema = profileUpdateSchema;
