"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtTokenSchema = exports.nameSchema = exports.passwordSchema = exports.emailSchema = exports.objectIdOpenApi = exports.objectIdSchema = void 0;
const zod_1 = require("zod");
const mongodb_1 = require("mongodb");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
const objectIdSchema = zod_1.z
    .union([
    zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    zod_1.z.instanceof(mongodb_1.ObjectId),
])
    .transform((val) => (typeof val === 'string' ? val : val.toString()))
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid ObjectId format')
    .describe('MongoDB ObjectId');
exports.objectIdSchema = objectIdSchema;
// OpenAPI-friendly ObjectId schema (no transforms/effects)
const objectIdOpenApi = zod_1.z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
    .openapi({
    type: 'string',
    pattern: '^[0-9a-fA-F]{24}$',
    description: 'MongoDB ObjectId (24-character hexadecimal string)',
    example: '64b123456789abcdef000001',
});
exports.objectIdOpenApi = objectIdOpenApi;
const emailSchema = zod_1.z
    .string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email cannot exceed 254 characters')
    .toLowerCase()
    .openapi({
    type: 'string',
    format: 'email',
    description: 'User email address',
    example: 'user@example.com'
});
exports.emailSchema = emailSchema;
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain: lowercase, uppercase, number, and special character')
    .openapi({
    type: 'string',
    format: 'password',
    minLength: 8,
    maxLength: 128,
    description: 'User password (must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePassword123!'
});
exports.passwordSchema = passwordSchema;
const nameSchema = zod_1.z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z]+$/, 'Name can only contain letters')
    .trim()
    .openapi({
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: '^[a-zA-Z]+$',
    description: 'Person name (letters only)',
    example: 'John'
});
exports.nameSchema = nameSchema;
const jwtTokenSchema = zod_1.z
    .string()
    .regex(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, 'Invalid JWT token format')
    .openapi({
    type: 'string',
    pattern: '^[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+$',
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
});
exports.jwtTokenSchema = jwtTokenSchema;
