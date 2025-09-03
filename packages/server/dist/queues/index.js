"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobUtils = exports.QueueManager = exports.getCleanupQueue = exports.getMetadataExtractionQueue = exports.getVideoProcessingQueue = exports.getImageProcessingQueue = exports.getAssetProcessingQueue = exports.createQueue = exports.JOB_TYPES = exports.QUEUE_NAMES = void 0;
/**
 * @fileoverview BullMQ Queue Configuration and Management
 * Centralized queue factory for asset processing jobs with proper retry policies
 * and job type definitions for the digital asset management pipeline.
 */
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
/**
 * Queue names as constants for type safety
 */
exports.QUEUE_NAMES = {
    ASSET_PROCESSING: 'asset-processing',
    IMAGE_PROCESSING: 'image-processing',
    VIDEO_PROCESSING: 'video-processing',
    METADATA_EXTRACTION: 'metadata-extraction',
    CLEANUP: 'cleanup'
};
/**
 * Job type definitions for each queue
 */
exports.JOB_TYPES = {
    // Asset processing jobs
    PROCESS_ASSET: 'process-asset',
    FINALIZE_ASSET: 'finalize-asset',
    // Image processing jobs
    GENERATE_THUMBNAILS: 'generate-thumbnails',
    OPTIMIZE_IMAGE: 'optimize-image',
    // Video processing jobs  
    TRANSCODE_VIDEO: 'transcode-video',
    EXTRACT_POSTER: 'extract-poster',
    GENERATE_PREVIEWS: 'generate-previews',
    // Metadata extraction jobs
    EXTRACT_METADATA: 'extract-metadata',
    ANALYZE_CONTENT: 'analyze-content',
    // Cleanup jobs
    DELETE_STORAGE: 'delete-storage',
    CLEANUP_TEMP: 'cleanup-temp'
};
/**
 * Default queue options with retry policies and job settings
 */
const getDefaultQueueOptions = () => ({
    connection: (0, redis_1.getRedisClient)(),
    defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3, // Default retry attempts
        backoff: {
            type: 'exponential',
            delay: 2000 // Start with 2 second delay
        }
    }
});
/**
 * Queue-specific options for different job types
 */
const QUEUE_OPTIONS = {
    [exports.QUEUE_NAMES.ASSET_PROCESSING]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 5,
            priority: 10
        }
    },
    [exports.QUEUE_NAMES.IMAGE_PROCESSING]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 3,
            priority: 5
        }
    },
    [exports.QUEUE_NAMES.VIDEO_PROCESSING]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 2, // Video processing is expensive, fewer retries
            priority: 3,
            delay: 1000 // Slight delay to batch video jobs
        }
    },
    [exports.QUEUE_NAMES.METADATA_EXTRACTION]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 3,
            priority: 8
        }
    },
    [exports.QUEUE_NAMES.CLEANUP]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 5,
            priority: 1, // Low priority for cleanup
            delay: 30000 // 30 second delay for cleanup jobs
        }
    }
};
/**
 * Queue instances map
 */
const queueInstances = new Map();
/**
 * Create or get existing queue instance
 * @param queueName - Name of the queue to create/get
 * @returns Queue instance
 */
const createQueue = (queueName) => {
    if (queueInstances.has(queueName)) {
        return queueInstances.get(queueName);
    }
    const options = QUEUE_OPTIONS[queueName] || getDefaultQueueOptions();
    const queue = new bullmq_1.Queue(queueName, options);
    // Add global error handler
    queue.on('error', (error) => {
        console.error(`Queue ${queueName} error:`, error);
    });
    queue.on('waiting', (jobId) => {
        console.log(`Job ${jobId} waiting in queue ${queueName}`);
    });
    queue.on('active', (job) => {
        console.log(`Job ${job.id} started processing in queue ${queueName}`);
    });
    queue.on('completed', (job, result) => {
        console.log(`Job ${job.id} completed in queue ${queueName}`);
    });
    queue.on('failed', (job, error) => {
        console.error(`Job ${job?.id} failed in queue ${queueName}:`, error.message);
    });
    queueInstances.set(queueName, queue);
    return queue;
};
exports.createQueue = createQueue;
/**
 * Get specific queue instances (convenience functions)
 */
const getAssetProcessingQueue = () => (0, exports.createQueue)(exports.QUEUE_NAMES.ASSET_PROCESSING);
exports.getAssetProcessingQueue = getAssetProcessingQueue;
const getImageProcessingQueue = () => (0, exports.createQueue)(exports.QUEUE_NAMES.IMAGE_PROCESSING);
exports.getImageProcessingQueue = getImageProcessingQueue;
const getVideoProcessingQueue = () => (0, exports.createQueue)(exports.QUEUE_NAMES.VIDEO_PROCESSING);
exports.getVideoProcessingQueue = getVideoProcessingQueue;
const getMetadataExtractionQueue = () => (0, exports.createQueue)(exports.QUEUE_NAMES.METADATA_EXTRACTION);
exports.getMetadataExtractionQueue = getMetadataExtractionQueue;
const getCleanupQueue = () => (0, exports.createQueue)(exports.QUEUE_NAMES.CLEANUP);
exports.getCleanupQueue = getCleanupQueue;
/**
 * Queue management utilities
 */
exports.QueueManager = {
    /**
     * Get all queue instances
     * @returns Map of all queue instances
     */
    getAllQueues: () => queueInstances,
    /**
     * Get queue statistics
     * @param queueName - Name of the queue
     * @returns Queue statistics
     */
    getQueueStats: async (queueName) => {
        const queue = queueInstances.get(queueName);
        if (!queue)
            return null;
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed()
        ]);
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length
        };
    },
    /**
     * Get overall system queue statistics
     * @returns System-wide queue statistics
     */
    getSystemStats: async () => {
        const stats = {};
        for (const [queueName, queue] of queueInstances) {
            stats[queueName] = await exports.QueueManager.getQueueStats(queueName);
        }
        return stats;
    },
    /**
     * Pause all queues
     */
    pauseAll: async () => {
        console.log('Pausing all queues...');
        await Promise.all(Array.from(queueInstances.values()).map(queue => queue.pause()));
        console.log('All queues paused');
    },
    /**
     * Resume all queues
     */
    resumeAll: async () => {
        console.log('Resuming all queues...');
        await Promise.all(Array.from(queueInstances.values()).map(queue => queue.resume()));
        console.log('All queues resumed');
    },
    /**
     * Clean completed and failed jobs from all queues
     * @param maxAge - Maximum age in milliseconds for jobs to keep
     */
    cleanAllQueues: async (maxAge = 24 * 60 * 60 * 1000) => {
        console.log('Cleaning all queues...');
        for (const [queueName, queue] of queueInstances) {
            try {
                await queue.clean(maxAge, 100, 'completed');
                await queue.clean(maxAge, 50, 'failed');
                console.log(`Queue ${queueName} cleaned`);
            }
            catch (error) {
                console.error(`Failed to clean queue ${queueName}:`, error);
            }
        }
    },
    /**
     * Close all queue connections
     */
    closeAll: async () => {
        console.log('Closing all queue connections...');
        await Promise.all(Array.from(queueInstances.values()).map(queue => queue.close()));
        queueInstances.clear();
        console.log('All queue connections closed');
    }
};
/**
 * Job utilities for adding jobs with proper typing
 */
exports.JobUtils = {
    /**
     * Add asset processing job
     * @param data - Job data
     * @param options - Job options
     */
    addProcessAssetJob: async (data, options) => {
        const queue = (0, exports.getAssetProcessingQueue)();
        return queue.add(exports.JOB_TYPES.PROCESS_ASSET, data, options);
    },
    /**
     * Add thumbnail generation job
     * @param data - Job data
     * @param options - Job options
     */
    addGenerateThumbnailsJob: async (data, options) => {
        const queue = (0, exports.getImageProcessingQueue)();
        return queue.add(exports.JOB_TYPES.GENERATE_THUMBNAILS, data, options);
    },
    /**
     * Add video transcoding job
     * @param data - Job data
     * @param options - Job options
     */
    addTranscodeVideoJob: async (data, options) => {
        const queue = (0, exports.getVideoProcessingQueue)();
        return queue.add(exports.JOB_TYPES.TRANSCODE_VIDEO, data, options);
    },
    /**
     * Add metadata extraction job
     * @param data - Job data
     * @param options - Job options
     */
    addExtractMetadataJob: async (data, options) => {
        const queue = (0, exports.getMetadataExtractionQueue)();
        return queue.add(exports.JOB_TYPES.EXTRACT_METADATA, data, options);
    },
    /**
     * Add cleanup job
     * @param data - Job data
     * @param options - Job options
     */
    addCleanupJob: async (data, options) => {
        const queue = (0, exports.getCleanupQueue)();
        return queue.add(exports.JOB_TYPES.DELETE_STORAGE, data, options);
    }
};
exports.default = exports.QueueManager;
