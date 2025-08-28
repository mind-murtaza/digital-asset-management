/**
 * @fileoverview Express Application Configuration - Pure API Backend (TypeScript)
 * Configures a secure, production-ready Express application exclusively for API endpoints
 * with comprehensive security middleware, following Agent.md standards.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import apiRoutes from './api/routes';

import errorHandler from './api/middlewares/errorHandler';
import { isConnected, getConnectionInfo } from './config/db';

const app = express();


app.disable('x-powered-by');

// =================================================================
//                    SECURITY MIDDLEWARE STACK
// =================================================================

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: { policy: 'same-origin' },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: 'no-referrer' },
    }),
);

// CORS configuration for API-only communication
const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const allowedOrigins = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
            : ['http://localhost:3000', 'http://localhost:5173'];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400,
};

app.use(cors(corsOptions));

// =================================================================
//                    REQUEST PARSING MIDDLEWARE
// =================================================================

app.use(
    express.json({
        limit: '1mb',
        strict: true,
        type: ['application/json', 'application/*+json'],
    }),
);

app.use(
    express.urlencoded({
        extended: false,
        limit: '1mb',
    }),
);

// =================================================================
//                    API-ONLY ROUTE REJECTION
// =================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/' || req.path === '/health' || req.path.startsWith('/api/')) {
        return next();
    }
    return res.status(404).json({
        success: false,
        error: 'API-only backend. Web assets not served.',
        message: 'This server exclusively serves API endpoints. Use /api/v1/* routes.',
    });
});

// =================================================================
//                    HEALTH CHECK ENDPOINTS
// =================================================================

app.get('/', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: '🚀 Personal Finance Tracker API',
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            organizations: '/api/v1/organizations',
            roles: '/api/v1/roles',
            documentation: '/api/v1/docs',
            health: '/health',
        },
    });
});

app.get('/health', (req: Request, res: Response) => {
    const dbConnected = isConnected();
    const databasePayload = (() => {
        if (dbConnected) {
            const info = getConnectionInfo();
            return {
                state: info.state,
                name: info.name,
                collections: info.collections.length,
            };
        }
        return {
            state: 'disconnected',
            error: 'Database connection not available',
        };
    })();

    const healthCheck = {
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        status: dbConnected ? 'healthy' : 'degraded',
        services: {
            api: 'operational',
            database: dbConnected ? 'connected' : 'disconnected',
        },
        database: databasePayload,
        system: {
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
            },
            pid: process.pid,
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
        },
    };

    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(healthCheck);
});

// =================================================================
//                    API ROUTE MOUNTING
// =================================================================

app.use('/api/v1', apiRoutes);

// =================================================================
//                    ERROR HANDLING MIDDLEWARE
// =================================================================

app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        message: `Route ${req.method} ${req.path} does not exist`,
        availableRoutes: ['/api/v1/auth', '/api/v1/users', '/api/v1/organizations', '/api/v1/roles', '/api/v1/docs', '/health'],
    });
});

app.use(errorHandler);

export default app;
