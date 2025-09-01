import { Router } from 'express';

const router = Router();

const appName = process.env.APP_NAME || 'Digital Asset Management';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import organizationRoutes from './organization.routes';
import docsRoutes from './docs.routes';
import projectRoutes from './project.routes';

// API version headers
router.use((req, res, next) => {
    res.set('X-API-Version', '1.0.0');
    res.set('X-Service', appName);
    next();
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/organizations', organizationRoutes);
router.use('/projects', projectRoutes);
router.use('/docs', docsRoutes);

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
            ],
            status: 'Production Ready',
        },
    });
});

export default router;
