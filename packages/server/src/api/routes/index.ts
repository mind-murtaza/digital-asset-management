import { Router } from 'express';

const router = Router();

const appName = process.env.APP_NAME || 'Digital Asset Management';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import organizationRoutes from './organization.routes';

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
                organizationRoutes: {},
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
