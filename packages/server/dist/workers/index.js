"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @fileoverview Worker Manager - Background Processing Orchestrator
 * Manages all BullMQ workers for the Digital Asset Management system
 * Provides graceful startup, shutdown, and monitoring of processing workers.
 */
const db_1 = require("../config/db");
const redis_1 = require("../config/redis");
const image_worker_1 = __importDefault(require("./image.worker"));
const video_worker_1 = __importDefault(require("./video.worker"));
const metadata_worker_1 = __importDefault(require("./metadata.worker"));
/**
 * Worker manager class for orchestrating background processing
 */
class WorkerManager {
    imageWorker;
    videoWorker;
    metadataWorker;
    isShuttingDown = false;
    /**
     * Initialize and start all workers
     */
    async start() {
        console.log('🚀 Starting Digital Asset Management Workers...');
        try {
            // Connect to database and Redis
            await this.connectServices();
            // Initialize workers
            await this.initializeWorkers();
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            console.log('✅ All workers started successfully');
            console.log('📊 Worker Status:');
            console.log('   🎨 Image Processing: Active');
            console.log('   🎬 Video Processing: Active');
            console.log('   🔍 Metadata Extraction: Active');
        }
        catch (error) {
            console.error('❌ Failed to start workers:', error);
            process.exit(1);
        }
    }
    /**
     * Connect to required services
     */
    async connectServices() {
        console.log('🔌 Connecting to services...');
        // Connect to MongoDB
        try {
            await (0, db_1.connectDB)();
            console.log('✅ MongoDB connected');
        }
        catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
        // Connect to Redis
        try {
            const redisService = (0, redis_1.getRedisService)();
            const isConnected = await redisService.ping();
            if (!isConnected) {
                throw new Error('Redis ping failed');
            }
            console.log('✅ Redis connected');
        }
        catch (error) {
            console.error('❌ Redis connection failed:', error);
            throw error;
        }
    }
    /**
     * Initialize all worker instances
     */
    async initializeWorkers() {
        console.log('⚙️ Initializing workers...');
        // Initialize Image Processing Worker
        try {
            this.imageWorker = new image_worker_1.default();
            console.log('✅ Image worker initialized');
        }
        catch (error) {
            console.error('❌ Image worker initialization failed:', error);
            throw error;
        }
        // Initialize Video Processing Worker
        try {
            this.videoWorker = new video_worker_1.default();
            console.log('✅ Video worker initialized');
        }
        catch (error) {
            console.error('❌ Video worker initialization failed:', error);
            throw error;
        }
        // Initialize Metadata Extraction Worker
        try {
            this.metadataWorker = new metadata_worker_1.default();
            console.log('✅ Metadata worker initialized');
        }
        catch (error) {
            console.error('❌ Metadata worker initialization failed:', error);
            throw error;
        }
        // Wait a moment for workers to fully initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        shutdownSignals.forEach(signal => {
            process.on(signal, async () => {
                if (this.isShuttingDown) {
                    console.log('⚠️ Force shutdown initiated');
                    process.exit(1);
                }
                console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
                this.isShuttingDown = true;
                await this.shutdown();
                process.exit(0);
            });
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught Exception:', error);
            await this.shutdown();
            process.exit(1);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            await this.shutdown();
            process.exit(1);
        });
    }
    /**
     * Gracefully shutdown all workers
     */
    async shutdown() {
        console.log('🛑 Shutting down workers...');
        const shutdownPromises = [];
        // Shutdown Image Worker
        if (this.imageWorker) {
            shutdownPromises.push(this.imageWorker.close().catch(error => {
                console.error('❌ Image worker shutdown error:', error);
            }));
        }
        // Shutdown Video Worker
        if (this.videoWorker) {
            shutdownPromises.push(this.videoWorker.close().catch(error => {
                console.error('❌ Video worker shutdown error:', error);
            }));
        }
        // Shutdown Metadata Worker
        if (this.metadataWorker) {
            shutdownPromises.push(this.metadataWorker.close().catch(error => {
                console.error('❌ Metadata worker shutdown error:', error);
            }));
        }
        // Wait for all workers to shutdown or timeout after 30 seconds
        try {
            await Promise.race([
                Promise.all(shutdownPromises),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 30000))
            ]);
            console.log('✅ All workers shutdown gracefully');
        }
        catch (error) {
            console.error('⚠️ Worker shutdown timeout or error:', error);
        }
        // Disconnect from Redis
        try {
            const redisService = (0, redis_1.getRedisService)();
            await redisService.disconnect();
            console.log('✅ Redis disconnected');
        }
        catch (error) {
            console.error('❌ Redis disconnect error:', error);
        }
    }
    /**
     * Get worker health status
     */
    getHealthStatus() {
        return {
            imageWorker: this.imageWorker ? 'active' : 'inactive',
            videoWorker: this.videoWorker ? 'active' : 'inactive',
            metadataWorker: this.metadataWorker ? 'active' : 'inactive',
            status: this.isShuttingDown ? 'shutting-down' : 'running'
        };
    }
}
/**
 * Main worker entry point
 */
async function main() {
    const workerManager = new WorkerManager();
    // Add health check endpoint for Docker
    if (process.env.ENABLE_HEALTH_CHECK === 'true') {
        const express = require('express');
        const app = express();
        app.get('/health', (req, res) => {
            res.json(workerManager.getHealthStatus());
        });
        const healthPort = process.env.HEALTH_CHECK_PORT || 3002;
        app.listen(healthPort, () => {
            console.log(`🏥 Worker health check available on port ${healthPort}`);
        });
    }
    await workerManager.start();
    // Keep the process running
    console.log('🔄 Workers are running. Press Ctrl+C to shutdown gracefully.');
    // Optional: Log periodic status
    if (process.env.LOG_WORKER_STATUS === 'true') {
        setInterval(() => {
            const status = workerManager.getHealthStatus();
            console.log('📊 Worker Status:', status);
        }, 60000); // Every minute
    }
}
// Start the worker manager if this file is run directly
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Worker startup failed:', error);
        process.exit(1);
    });
}
exports.default = WorkerManager;
