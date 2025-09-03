"use strict";
/**
 * @fileoverview Express Application Configuration - Pure API Backend (TypeScript)
 * Configures a secure, production-ready Express application exclusively for API endpoints
 * with comprehensive security middleware, following Agent.md standards.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const routes_1 = __importDefault(require("./api/routes"));
const errorHandler_1 = __importDefault(require("./api/middlewares/errorHandler"));
const db_1 = require("./config/db");
const app = (0, express_1.default)();
app.disable('x-powered-by');
// =================================================================
//                    SECURITY MIDDLEWARE STACK
// =================================================================
app.use((0, helmet_1.default)({
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
}));
// CORS configuration for API-only communication
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
            : ['http://localhost:3000', 'http://localhost:5173'];
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400,
};
app.use((0, cors_1.default)(corsOptions));
// =================================================================
//                    REQUEST PARSING MIDDLEWARE
// =================================================================
app.use(express_1.default.json({
    limit: '1mb',
    strict: true,
    type: ['application/json', 'application/*+json'],
}));
app.use(express_1.default.urlencoded({
    extended: false,
    limit: '1mb',
}));
// =================================================================
//                    API-ONLY ROUTE REJECTION
// =================================================================
app.use((req, res, next) => {
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
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: `🚀 ${process.env.APP_NAME} API`,
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            organizations: '/api/v1/organizations',
            projects: '/api/v1/projects',
            roles: '/api/v1/roles',
            documentation: '/api/v1/docs',
            health: '/health',
        },
    });
});
app.get('/health', (req, res) => {
    const dbConnected = (0, db_1.isConnected)();
    const databasePayload = (() => {
        if (dbConnected) {
            const info = (0, db_1.getConnectionInfo)();
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
app.use('/api/v1', routes_1.default);
// =================================================================
//                    ERROR HANDLING MIDDLEWARE
// =================================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        message: `Route ${req.method} ${req.path} does not exist`,
        availableRoutes: [
            '/api/v1/auth',
            '/api/v1/users',
            '/api/v1/organizations',
            '/api/v1/projects',
            '/api/v1/roles',
            '/api/v1/docs',
            '/health',
        ],
    });
});
app.use(errorHandler_1.default);
exports.default = app;
