import { z } from 'zod';

const authHeaderSchema = z
    .string()
    .regex(/^Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, {
        message: 'Invalid authorization header format. Expected: Bearer <jwt-token>',
    })
    .describe('Authorization header with Bearer token');

export { authHeaderSchema };
