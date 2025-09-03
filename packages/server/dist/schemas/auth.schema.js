"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHeaderSchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
// Extend Zod with OpenAPI support
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
const authHeaderSchema = zod_1.z
    .string()
    .regex(/^Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, {
    message: 'Invalid authorization header format. Expected: Bearer <jwt-token>',
})
    .describe('Authorization header with Bearer token')
    .openapi({
    description: 'JWT Bearer token in Authorization header',
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    format: 'Bearer <jwt-token>',
});
exports.authHeaderSchema = authHeaderSchema;
