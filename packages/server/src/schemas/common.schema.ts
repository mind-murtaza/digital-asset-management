import { z } from 'zod';
import { ObjectId } from 'mongodb';

const objectIdSchema = z
    .union([
        z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
        z.instanceof(ObjectId),
    ])
    .transform((val) => (typeof val === 'string' ? val : val.toString()))
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid ObjectId format')
    .describe('MongoDB ObjectId');

const emailSchema = z
    .string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email cannot exceed 254 characters')
    .toLowerCase()
    .describe('User email address');

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain: lowercase, uppercase, number, and special character',
    )
    .describe('User password');

const nameSchema = z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z]+$/, 'Name can only contain letters')
    .trim();

const jwtTokenSchema = z
    .string()
    .regex(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, 'Invalid JWT token format')
    .describe('JWT authentication token');

export { objectIdSchema, emailSchema, passwordSchema, nameSchema, jwtTokenSchema };
