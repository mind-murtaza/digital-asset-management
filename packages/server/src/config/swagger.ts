/**
 * @fileoverview OpenAPI/Swagger Configuration
 * Professional API documentation setup leveraging existing Zod schemas
 */

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { Request, Response, NextFunction } from 'express';

// Import schemas
import { createUserSchema, loginSchema, changePasswordSchema, profileUpdateSchema } from '../schemas/user.schema';
import { createOrganizationSchema, updateOrganizationSchema } from '../schemas/organization.schema';

class SwaggerConfig {
    private registry: OpenAPIRegistry;

    constructor() {
        this.registry = new OpenAPIRegistry();
        this.initializeComponents();
        this.registerSchemas();
    }

    private initializeComponents() {
        // Register JWT Bearer authentication
        this.registry.registerComponent('securitySchemes', 'bearerAuth', {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token authentication'
        });

        // Common error responses
        this.registry.registerComponent('responses', 'ValidationError', {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: false },
                            error: { type: 'string', example: 'Validation failed' },
                            details: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        field: { type: 'string' },
                                        message: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        this.registry.registerComponent('responses', 'UnauthorizedError', {
            description: 'Authentication required',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: false },
                            error: { type: 'string', example: 'Authentication required' },
                            message: { type: 'string', example: 'Please provide valid credentials' }
                        }
                    }
                }
            }
        });

        this.registry.registerComponent('responses', 'NotFoundError', {
            description: 'Resource not found',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: false },
                            error: { type: 'string', example: 'Not found' },
                            message: { type: 'string', example: 'The requested resource was not found' }
                        }
                    }
                }
            }
        });
    }

    private registerSchemas() {
        this.registry.register('CreateUser', createUserSchema.openapi({
            description: 'User registration payload',
            example: {
                email: 'user@example.com',
                password: 'SecurePassword123!',
                profile: {
                    firstName: 'John',
                    lastName: 'Doe'
                }
            }
        }));

        this.registry.register('LoginCredentials', loginSchema.openapi({
            description: 'User login credentials',
            example: {
                email: 'user@example.com',
                password: 'SecurePassword123!'
            }
        }));

        this.registry.register('ChangePassword', changePasswordSchema.openapi({
            description: 'Change password payload',
            example: {
                currentPassword: 'OldPassword123!',
                newPassword: 'NewSecurePassword456!'
            }
        }));

        this.registry.register('ProfileUpdate', profileUpdateSchema.openapi({
            description: 'Profile update payload',
            example: {
                firstName: 'Jane',
                lastName: 'Smith'
            }
        }));

        this.registry.register('CreateOrganization', createOrganizationSchema.openapi({
            description: 'Create Organization payload',
            example: {
                name: 'New Organization Name',
                status: 'active'
            }
        }));

        this.registry.register('UpdateOrganization', updateOrganizationSchema.openapi({

            description: 'Update Organization payload',
            example: {
                name: 'New Organization Name',
                status: 'archived'
            }
        }));


        // Success response schemas
        this.registry.registerComponent('schemas', 'AuthResponse', {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                                email: { type: 'string', example: 'user@example.com' },
                                profile: {
                                    type: 'object',
                                    properties: {
                                        firstName: { type: 'string', example: 'John' },
                                        lastName: { type: 'string', example: 'Doe' }
                                    }
                                },
                                status: { type: 'string', enum: ['active', 'suspended', 'pending_verification', 'deleted'] },
                                emailVerified: { type: 'boolean', example: true },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' }
                            }
                        },
                        tokens: {
                            type: 'object',
                            properties: {
                                access: { type: 'string', description: 'JWT access token' },
                                refresh: { type: 'string', description: 'JWT refresh token' }
                            }
                        }
                    }
                }
            }
        });
    }

    public generateSpec() {
        const generator = new OpenApiGeneratorV3(this.registry.definitions);
        
        return generator.generateDocument({
            openapi: '3.0.3',
            info: {
                title: 'Digital Asset Management API',
                version: '1.0.0',
                description: `
**Professional API for Digital Asset Management System**

This API provides comprehensive endpoints for:
- 🔐 **Authentication & Authorization** - JWT-based secure auth
- 👥 **User Management** - Profile, preferences, account management  
- 🏢 **Organization Management** - Multi-tenant organization structure
- 🛡️ **Role Management** - Granular permissions and access control

## Security
All protected endpoints require a valid JWT token in the Authorization header:
\`Authorization: Bearer <your-jwt-token>\`

## Response Format
All responses follow a consistent structure:
\`\`\`json
{
  "success": true|false,
  "data": {...},        // On success
  "error": "string",    // On error
  "message": "string"   // Additional context
}
\`\`\`

## Rate Limiting
API requests are rate-limited per IP address. Contact support if you need higher limits.
                `,
                contact: {
                    name: 'API Support',
                    email: 'support@digitalassets.com'
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                }
            },
            servers: [
                {
                    url: 'http://localhost:4000/api/v1',
                    description: 'Development server'
                }
            ],
            security: [
                {
                    bearerAuth: []
                }
            ],
            tags: [
                {
                    name: 'Authentication',
                    description: 'User authentication and token management'
                },
                {
                    name: 'Users', 
                    description: 'User profile and account management'
                },
                {
                    name: 'Organizations',
                    description: 'Organization and team management'
                },
                {
                    name: 'Roles',
                    description: 'Role-based access control'
                }
            ]
        });
    }

    public getRegistry(): OpenAPIRegistry {
        return this.registry;
    }
}

// Singleton instance
const swaggerConfig = new SwaggerConfig();

export default swaggerConfig;
export const openApiRegistry = swaggerConfig.getRegistry();
