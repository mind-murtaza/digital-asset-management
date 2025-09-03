"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const appName = process.env.APP_NAME || 'Digital Asset Management';
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const role_routes_1 = __importDefault(require("./role.routes"));
const organization_routes_1 = __importDefault(require("./organization.routes"));
const docs_routes_1 = __importDefault(require("./docs.routes"));
const project_routes_1 = __importDefault(require("./project.routes"));
const asset_routes_1 = __importDefault(require("./asset.routes"));
// API version headers
router.use((req, res, next) => {
    res.set('X-API-Version', '1.0.0');
    res.set('X-Service', appName);
    next();
});
// Mount routes
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/roles', role_routes_1.default);
router.use('/organizations', organization_routes_1.default);
router.use('/projects', project_routes_1.default);
router.use('/assets', asset_routes_1.default);
router.use('/docs', docs_routes_1.default);
// API docs overview
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: `${appName} API v1.0.0`,
        version: '1.0.0',
        documentation: {
            endpoints: {
                auth: {
                    base: '/api/v1/auth',
                    routes: {
                        'POST /register': 'User registration',
                        'POST /login': 'User authentication with email/password',
                        'POST /refresh': 'Token refresh (requires valid token)',
                    },
                },
                users: {
                    base: '/api/v1/users',
                    routes: {
                        'GET /me': 'Get current user profile',
                        'PATCH /me/profile': 'Update user profile',
                        'POST /me/change-password': 'Change user password',
                        'DELETE /me': 'Delete user account',
                    },
                },
                organizations: {
                    base: '/api/v1/organizations',
                    routes: {
                        'GET /': 'List organizations',
                        'POST /': 'Create organization',
                        'GET /:id': 'Get organization details',
                        'PATCH /:id': 'Update organization',
                        'DELETE /:id': 'Delete organization',
                    },
                },
                projects: {
                    base: '/api/v1/projects',
                    routes: {
                        'GET /': 'List projects',
                        'GET /resolve?organizationId&path': 'Resolve project by path',
                        'POST /': 'Create project',
                        'GET /:id': 'Get project details',
                        'PATCH /:id': 'Update project',
                        'DELETE /:id': 'Soft delete project',
                    },
                },
                assets: {
                    base: '/api/v1/assets',
                    routes: {
                        'POST /uploads': 'Generate presigned upload URL',
                        'POST /:id/finalize': 'Finalize asset upload and trigger processing',
                        'GET /': 'List assets with filtering and pagination',
                        'GET /analytics': 'Get asset analytics summary',
                        'GET /search?q': 'Search assets by text',
                        'GET /recent': 'Get recently uploaded assets',
                        'GET /by-project/:projectId': 'Get assets by project',
                        'GET /by-tag/:tag': 'Get assets by tag',
                        'GET /:id': 'Get asset details',
                        'GET /:id/download': 'Generate presigned download URL',
                        'PATCH /:id': 'Update asset metadata',
                        'POST /:id/tags': 'Add tags to asset',
                        'PUT /:id/tags': 'Replace asset tags',
                        'POST /:id/retry': 'Retry failed asset processing',
                        'DELETE /:id': 'Soft delete asset and queue cleanup',
                    },
                },
                roles: {
                    base: '/api/v1/roles',
                    routes: {
                        'GET /': 'List roles',
                        'POST /': 'Create role',
                        'GET /:id': 'Get role details',
                        'PATCH /:id': 'Update role',
                        'DELETE /:id': 'Delete role',
                    },
                },
                documentation: {
                    base: '/api/v1/docs',
                    routes: {
                        'GET /': 'Interactive Swagger UI',
                        'GET /openapi.json': 'OpenAPI 3.0 specification',
                        'GET /info': 'API documentation info',
                    },
                },
            },
            authentication: {
                type: 'Bearer JWT token required for protected routes',
                flows: ['Email/Password login'],
            },
            contentType: 'application/json',
            features: [
                'JWT-based authentication',
                'Comprehensive input validation',
                'User profile and settings management',
                'Multi-tenant asset management',
                'Presigned URL uploads/downloads',
                'Background asset processing',
                'Image and video renditions',
                'Asset analytics and search',
            ],
            status: 'Production Ready',
        },
    });
});
exports.default = router;
