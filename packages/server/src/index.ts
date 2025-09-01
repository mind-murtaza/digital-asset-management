/**
 * @fileoverview Server Bootstrap - Enterprise-Grade Application Entry Point (TypeScript)
 * Initializes the Express server, establishes database connections,
 * and configures production-ready server infrastructure for API-only communication.
 */

import 'dotenv/config';
import type { Server } from 'http';
import app from './app';
import { connectDB, disconnect } from './config/db';

const PORT: number = Number.parseInt(process.env.PORT || '4000', 10);
const NODE_ENV: string = process.env.NODE_ENV || 'development';

let serverInstance: Server | null = null;

function validateEnvironment(): void {
    const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error('❌ FATAL: Missing required environment variables:');
        missingVars.forEach((v) => console.error(`   - ${v}`));
        console.error('📋 Create a .env file with the required variables');
        process.exit(1);
    }

    if (!['development', 'test', 'production'].includes(NODE_ENV)) {
        console.error('❌ FATAL: NODE_ENV must be development|test|production');
        process.exit(1);
    }

    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
        console.error('❌ FATAL: PORT must be an integer between 1 and 65535');
        process.exit(1);
    }

    if (NODE_ENV === 'production' && (process.env.JWT_SECRET || '').length < 32) {
        console.error('❌ FATAL: JWT_SECRET must be at least 32 characters in production');
        process.exit(1);
    }

    console.log('✅ Environment validation passed');
}

async function startServer(): Promise<void> {
    try {
        console.log(`🚀 Starting ${process.env.APP_NAME} API Server...`);
        console.log(`📊 Environment: ${NODE_ENV}`);
        console.log(`🔧 Node.js Version: ${process.version}`);
        console.log(`💾 Platform: ${process.platform} ${process.arch}`);

        validateEnvironment();

        console.log('🔌 Connecting to MongoDB...');
        await connectDB();
        console.log('✅ Database connection established');

        console.log(`🌐 Starting HTTP server on port ${PORT}...`);
        serverInstance = app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('🎉 ================================');
            console.log('🚀 SERVER SUCCESSFULLY STARTED');
            console.log('🎉 ================================');
            console.log(`📍 API Base URL: http://localhost:${PORT}`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
            console.log('🎉 ================================');
            console.log('');
        });

        if (NODE_ENV === 'production' && serverInstance) {
            // @ts-ignore - Node's Server has these props at runtime
            serverInstance.timeout = 30000;
            // @ts-ignore
            serverInstance.keepAliveTimeout = 65000;
            // @ts-ignore
            serverInstance.headersTimeout = 66000;
        }
    } catch (error: any) {
        console.error('');
        console.error('💥 ================================');
        console.error('❌ SERVER STARTUP FAILED');
        console.error('💥 ================================');
        console.error('🔍 Error Details:');
        console.error(`   Message: ${error?.message}`);
        console.error(`   Stack: ${error?.stack}`);
        console.error('💥 ================================');
        console.error('');
        await gracefulShutdown('STARTUP_ERROR');
    }
}

async function gracefulShutdown(signal: string): Promise<void> {
    console.log('');
    console.log('🛑 ================================');
    console.log('🛑 GRACEFUL SHUTDOWN INITIATED');
    console.log(`📡 Signal: ${signal}`);
    console.log('🛑 ================================');

    if (serverInstance) {
        console.log('🔌 Closing HTTP server...');
        await new Promise<void>((resolve) => {
            serverInstance?.close(() => {
                console.log('✅ HTTP server closed');
                resolve();
            });
        });
    }

    try {
        console.log('🗄️  Closing database connections...');
        await disconnect();
        console.log('✅ Database connections closed');
    } catch (error: any) {
        console.error('❌ Error closing database:', error?.message);
    }

    console.log('✅ Graceful shutdown completed');
    console.log('🛑 ================================');
    console.log('');
    process.exit(signal === 'STARTUP_ERROR' ? 1 : 0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: any) => {
    console.error('💥 UNCAUGHT EXCEPTION:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason: any, promise: any) => {
    console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

if (process.env.NODE_ENV !== 'test') {
    startServer().catch((error) => {
        console.error('💥 Fatal server startup error:', error);
        process.exit(1);
    });
}

export default app;
