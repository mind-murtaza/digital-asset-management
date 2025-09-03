import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const objectIdSchema = z
    .union([
        z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
        z.instanceof(ObjectId),
    ])
    .transform((val) => (typeof val === 'string' ? val : val.toString()))
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid ObjectId format')
    .describe('MongoDB ObjectId');

// OpenAPI-friendly ObjectId schema (no transforms/effects)
const objectIdOpenApi = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
    .openapi({
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$',
        description: 'MongoDB ObjectId (24-character hexadecimal string)',
        example: '64b123456789abcdef000001',
    });

const emailSchema = z
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

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain: lowercase, uppercase, number, and special character',
    )
    .openapi({
        type: 'string',
        format: 'password',
        minLength: 8,
        maxLength: 128,
        description: 'User password (must contain uppercase, lowercase, number, and special character)',
        example: 'SecurePassword123!'
    });

const nameSchema = z
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

const jwtTokenSchema = z
    .string()
    .regex(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, 'Invalid JWT token format')
    .openapi({
        type: 'string',
        pattern: '^[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+$',
        description: 'JWT authentication token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    });

export { objectIdSchema, objectIdOpenApi, emailSchema, passwordSchema, nameSchema, jwtTokenSchema };
