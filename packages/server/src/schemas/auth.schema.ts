import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

const authHeaderSchema = z
    .string()
    .regex(/^Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, {
        message: 'Invalid authorization header format. Expected: Bearer <jwt-token>',
    })
    .describe('Authorization header with Bearer token')
    .openapi({
        description: 'JWT Bearer token in Authorization header',
        example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        format: 'Bearer <jwt-token>'
    });

export { authHeaderSchema };
