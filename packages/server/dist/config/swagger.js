"use strict";
/**
 * @fileoverview OpenAPI/Swagger Configuration
 * Professional API documentation setup leveraging existing Zod schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiRegistry = void 0;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
// Import schemas
const user_schema_1 = require("../schemas/user.schema");
const organization_schema_1 = require("../schemas/organization.schema");
const project_schema_1 = require("../schemas/project.schema");
const asset_schema_1 = require("../schemas/asset.schema");
class SwaggerConfig {
    registry;
    constructor() {
        this.registry = new zod_to_openapi_1.OpenAPIRegistry();
        this.initializeComponents();
        this.registerSchemas();
    }
    initializeComponents() {
        // Register JWT Bearer authentication
        this.registry.registerComponent('securitySchemes', 'bearerAuth', {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token authentication',
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
                                        message: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
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
                            message: {
                                type: 'string',
                                example: 'Please provide valid credentials',
                            },
                        },
                    },
                },
            },
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
                            message: {
                                type: 'string',
                                example: 'The requested resource was not found',
                            },
                        },
                    },
                },
            },
        });
    }
    registerSchemas() {
        try {
            console.log('🔍 Registering CreateUser schema...');
            this.registry.register('CreateUser', user_schema_1.createUserSchema.openapi({
                description: 'User registration payload',
                example: {
                    email: 'user@example.com',
                    password: 'SecurePassword123!',
                    profile: {
                        firstName: 'John',
                        lastName: 'Doe',
                    },
                },
            }));
            console.log('✅ CreateUser schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering CreateUser schema:', error);
            throw error;
        }
        this.registry.register('LoginCredentials', user_schema_1.loginSchema.openapi({
            description: 'User login credentials',
            example: {
                email: 'user@example.com',
                password: 'SecurePassword123!',
            },
        }));
        this.registry.register('ChangePassword', user_schema_1.changePasswordSchema.openapi({
            description: 'Change password payload',
            example: {
                currentPassword: 'OldPassword123!',
                newPassword: 'NewSecurePassword456!',
            },
        }));
        this.registry.register('ProfileUpdate', user_schema_1.profileUpdateSchema.openapi({
            description: 'Profile update payload',
            example: {
                firstName: 'Jane',
                lastName: 'Smith',
            },
        }));
        this.registry.register('CreateOrganization', organization_schema_1.createOrganizationSchema.openapi({
            description: 'Create Organization payload',
            example: {
                name: 'New Organization Name',
                status: 'active',
            },
        }));
        this.registry.register('UpdateOrganization', organization_schema_1.updateOrganizationSchema.openapi({
            description: 'Update Organization payload',
            example: {
                name: 'New Organization Name',
                status: 'archived',
            },
        }));
        // Project schemas
        this.registry.register('CreateProject', project_schema_1.createProjectSchema.openapi({
            description: 'Create Project payload',
            example: {
                organizationId: '64b0c7f4a2c8a2b3c4d5e6f7',
                name: 'Campaign A',
                path: '/brand/2025/campaign-a',
            },
        }));
        this.registry.register('UpdateProject', project_schema_1.updateProjectSchema.openapi({
            description: 'Update Project payload',
        }));
        // Asset schemas
        try {
            console.log('🔍 Registering CreateAsset schema...');
            this.registry.register('CreateAsset', asset_schema_1.createAssetSchema.openapi({
                description: 'Asset creation payload for upload initiation',
                example: {
                    organizationId: '64b0c7f4a2c8a2b3c4d5e6f7',
                    projectId: '64b0c7f4a2c8a2b3c4d5e6f8',
                    originalFilename: 'hero-image.jpg',
                    mimeType: 'image/jpeg',
                    fileSizeBytes: 2817345,
                    checksum: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c',
                    tags: ['homepage', 'brand', 'hero'],
                    access: 'organization',
                    customMetadata: {
                        license: 'royalty-free',
                        photographer: 'John Doe'
                    }
                },
            }));
            console.log('✅ CreateAsset schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering CreateAsset schema:', error);
            throw error;
        }
        try {
            console.log('🔍 Registering FinalizeAsset schema...');
            this.registry.register('FinalizeAsset', asset_schema_1.finalizeAssetSchema.openapi({
                description: 'Asset finalization payload after successful upload',
                example: {
                    assetId: '64b0c7f4a2c8a2b3c4d5e6f9',
                    actualChecksum: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c',
                    actualFileSizeBytes: 2817345
                },
            }));
            console.log('✅ FinalizeAsset schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering FinalizeAsset schema:', error);
            throw error;
        }
        try {
            console.log('🔍 Registering UpdateAsset schema...');
            this.registry.register('UpdateAsset', asset_schema_1.updateAssetSchema.openapi({
                description: 'Asset update payload for modifying tags, access, or metadata',
                example: {
                    tags: ['updated', 'brand', 'campaign'],
                    access: 'public',
                    customMetadata: {
                        campaign: '2025-spring',
                        status: 'approved'
                    }
                },
            }));
            console.log('✅ UpdateAsset schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering UpdateAsset schema:', error);
            throw error;
        }
        // Asset response schemas
        try {
            console.log('🔍 Registering AssetResponse schema...');
            this.registry.register('AssetResponse', asset_schema_1.assetResponseSchema.openapi({
                description: 'Complete asset information'
            }));
            console.log('✅ AssetResponse schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering AssetResponse schema:', error);
            throw error;
        }
        try {
            console.log('🔍 Registering AssetListResponse schema...');
            this.registry.register('AssetListResponse', asset_schema_1.assetListResponseSchema.openapi({
                description: 'Asset list response with pagination'
            }));
            console.log('✅ AssetListResponse schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering AssetListResponse schema:', error);
            throw error;
        }
        try {
            console.log('🔍 Registering UploadUrlResponse schema...');
            this.registry.register('UploadUrlResponse', asset_schema_1.uploadUrlResponseSchema.openapi({
                description: 'Presigned upload URL response'
            }));
            console.log('✅ UploadUrlResponse schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering UploadUrlResponse schema:', error);
            throw error;
        }
        try {
            console.log('🔍 Registering DownloadUrlResponse schema...');
            this.registry.register('DownloadUrlResponse', asset_schema_1.downloadUrlResponseSchema.openapi({
                description: 'Presigned download URL response'
            }));
            console.log('✅ DownloadUrlResponse schema registered successfully');
        }
        catch (error) {
            console.error('❌ Error registering DownloadUrlResponse schema:', error);
            throw error;
        }
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
                                        lastName: { type: 'string', example: 'Doe' },
                                    },
                                },
                                status: {
                                    type: 'string',
                                    enum: [
                                        'active',
                                        'suspended',
                                        'pending_verification',
                                        'deleted',
                                    ],
                                },
                                emailVerified: { type: 'boolean', example: true },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' },
                            },
                        },
                        tokens: {
                            type: 'object',
                            properties: {
                                access: { type: 'string', description: 'JWT access token' },
                                refresh: { type: 'string', description: 'JWT refresh token' },
                            },
                        },
                    },
                },
            },
        });
    }
    generateSpec() {
        try {
            console.log('🔍 Creating OpenAPI generator...');
            const generator = new zod_to_openapi_1.OpenApiGeneratorV3(this.registry.definitions);
            console.log('🔍 Generating OpenAPI document...');
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
- 📁 **Project Management** - Scoped hierarchies for organizing assets
- 🎯 **Asset Management** - Upload, processing, versioning, and delivery
- ☁️ **Storage Integration** - MinIO/S3 with presigned URLs
- ⚡ **Background Processing** - Image/video renditions and metadata extraction

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
                        email: 'support@digitalassets.com',
                    },
                    license: {
                        name: 'MIT',
                        url: 'https://opensource.org/licenses/MIT',
                    },
                },
                servers: [
                    {
                        url: 'http://localhost:4000/api/v1',
                        description: 'Development server',
                    },
                ],
                security: [
                    {
                        bearerAuth: [],
                    },
                ],
                tags: [
                    {
                        name: 'Authentication',
                        description: 'User authentication and token management',
                    },
                    {
                        name: 'Users',
                        description: 'User profile and account management',
                    },
                    {
                        name: 'Organizations',
                        description: 'Organization and team management',
                    },
                    {
                        name: 'Projects',
                        description: 'Project hierarchy and organization for assets',
                    },
                    {
                        name: 'Assets',
                        description: 'Digital asset upload, processing, and management',
                    },
                    {
                        name: 'Roles',
                        description: 'Role-based access control',
                    },
                ],
            });
        }
        catch (error) {
            console.error('❌ Error generating OpenAPI document:', error);
            throw error;
        }
    }
    getRegistry() {
        return this.registry;
    }
}
// Singleton instance
const swaggerConfig = new SwaggerConfig();
exports.default = swaggerConfig;
exports.openApiRegistry = swaggerConfig.getRegistry();
