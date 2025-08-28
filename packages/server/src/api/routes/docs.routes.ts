/**
 * @fileoverview Swagger API Documentation Routes
 * Serves OpenAPI spec and Swagger UI for API documentation
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerConfig from '../../config/swagger';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Generate OpenAPI specification
const openApiSpec = swaggerConfig.generateSpec();

// Custom CSS for Swagger UI
const customCss = `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .info .title { color: #3b82f6 }
    .swagger-ui .scheme-container { 
        background: #f8fafc; 
        border: 1px solid #e2e8f0; 
        padding: 10px;
        border-radius: 6px;
    }
`;

const swaggerOptions = {
    customCss,
    customSiteTitle: 'Digital Asset Management API',
    swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        syntaxHighlight: {
            activate: true,
            theme: 'agate',
        },
        tryItOutEnabled: true,
        requestInterceptor: (req: any) => {
            // Add API version header to all requests
            req.headers['X-API-Version'] = '1.0.0';
            return req;
        },
    },
};

// Serve OpenAPI JSON spec
router.get('/openapi.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
});

// Serve Swagger UI
router.use('/', ...swaggerUi.serve as any);
router.get('/', swaggerUi.setup(openApiSpec, swaggerOptions) as any);

// API documentation landing page
router.get('/info', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Digital Asset Management API Documentation',
        version: '1.0.0',
        documentation: {
            swagger_ui: '/api/v1/docs',
            openapi_spec: '/api/v1/docs/openapi.json',
            postman_collection: '/api/v1/docs/postman', // Future enhancement
        },
        features: [
            '🔐 JWT-based Authentication',
            '👥 User Management',
            '🏢 Organization Management',
            '🛡️ Role-based Access Control',
            '📊 Comprehensive API Documentation',
            '🧪 Interactive API Testing',
        ],
        support: {
            contact: process.env.CONTACT_EMAIL,
            repository: process.env.GITHUB_REPO_URL,
            issues: `${process.env.GITHUB_REPO_URL}/issues`,
        },
    });
});

export default router;
