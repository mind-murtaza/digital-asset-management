/**
 * @fileoverview BullMQ Queue Configuration and Management
 * Centralized queue factory for asset processing jobs with proper retry policies
 * and job type definitions for the digital asset management pipeline.
 */
import { Queue, QueueOptions, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';

/**
 * Queue names as constants for type safety
 */
export const QUEUE_NAMES = {
    ASSET_PROCESSING: 'asset-processing',
    IMAGE_PROCESSING: 'image-processing', 
    VIDEO_PROCESSING: 'video-processing',
    METADATA_EXTRACTION: 'metadata-extraction',
    CLEANUP: 'cleanup'
} as const;

/**
 * Job type definitions for each queue
 */
export const JOB_TYPES = {
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
} as const;

/**
 * Job data interfaces for type safety
 */
export interface ProcessAssetJobData {
    assetId: string;
    organizationId: string;
    uploadedBy: string;
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
}

export interface GenerateThumbnailsJobData {
    assetId: string;
    organizationId: string;
    storageKey: string;
    mimeType: string;
    width?: number;
    height?: number;
}

export interface TranscodeVideoJobData {
    assetId: string;
    organizationId: string;
    storageKey: string;
    targetResolutions: Array<'720p' | '1080p'>;
    extractPoster?: boolean;
}

export interface ExtractMetadataJobData {
    assetId: string;
    organizationId: string;
    storageKey: string;
    mimeType: string;
    originalFilename: string;
}

export interface CleanupJobData {
    storageKeys: string[];
    assetId?: string;
    reason: 'asset-deleted' | 'processing-failed' | 'temp-cleanup';
}

/**
 * Default queue options with retry policies and job settings
 */
const getDefaultQueueOptions = (): QueueOptions => ({
    connection: getRedisClient(),
    defaultJobOptions: {
        removeOnComplete: 100,  // Keep last 100 completed jobs
        removeOnFail: 50,       // Keep last 50 failed jobs
        attempts: 3,            // Default retry attempts
        backoff: {
            type: 'exponential',
            delay: 2000         // Start with 2 second delay
        }
    }
});

/**
 * Queue-specific options for different job types
 */
const QUEUE_OPTIONS: Record<string, Partial<QueueOptions>> = {
    [QUEUE_NAMES.ASSET_PROCESSING]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 5,
            priority: 10
        }
    },
    [QUEUE_NAMES.IMAGE_PROCESSING]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 3,
            priority: 5
        }
    },
    [QUEUE_NAMES.VIDEO_PROCESSING]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 2,        // Video processing is expensive, fewer retries
            priority: 3,
            delay: 1000        // Slight delay to batch video jobs
        }
    },
    [QUEUE_NAMES.METADATA_EXTRACTION]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 3,
            priority: 8
        }
    },
    [QUEUE_NAMES.CLEANUP]: {
        ...getDefaultQueueOptions(),
        defaultJobOptions: {
            ...getDefaultQueueOptions().defaultJobOptions,
            attempts: 5,
            priority: 1,        // Low priority for cleanup
            delay: 30000       // 30 second delay for cleanup jobs
        }
    }
};

/**
 * Queue instances map
 */
const queueInstances: Map<string, Queue> = new Map();

/**
 * Create or get existing queue instance
 * @param queueName - Name of the queue to create/get
 * @returns Queue instance
 */
export const createQueue = (queueName: string): Queue => {
    if (queueInstances.has(queueName)) {
        return queueInstances.get(queueName)!;
    }

    const options = QUEUE_OPTIONS[queueName] || getDefaultQueueOptions();
    const queue = new Queue(queueName, options as QueueOptions);
    
    // Add global error handler
    queue.on('error', (error: Error) => {
        console.error(`Queue ${queueName} error:`, error);
    });

    queue.on('waiting', (jobId: string) => {
        console.log(`Job ${jobId} waiting in queue ${queueName}`);
    });

    queue.on('active' as any, (job: Job) => {
        console.log(`Job ${job.id} started processing in queue ${queueName}`);
    });

    queue.on('completed' as any, (job: Job, result: any) => {
        console.log(`Job ${job.id} completed in queue ${queueName}`);
    });

    queue.on('failed' as any, (job: Job | undefined, error: Error) => {
        console.error(`Job ${job?.id} failed in queue ${queueName}:`, error.message);
    });

    queueInstances.set(queueName, queue);
    return queue;
};

/**
 * Get specific queue instances (convenience functions)
 */
export const getAssetProcessingQueue = (): Queue => createQueue(QUEUE_NAMES.ASSET_PROCESSING);
export const getImageProcessingQueue = (): Queue => createQueue(QUEUE_NAMES.IMAGE_PROCESSING);
export const getVideoProcessingQueue = (): Queue => createQueue(QUEUE_NAMES.VIDEO_PROCESSING);
export const getMetadataExtractionQueue = (): Queue => createQueue(QUEUE_NAMES.METADATA_EXTRACTION);
export const getCleanupQueue = (): Queue => createQueue(QUEUE_NAMES.CLEANUP);

/**
 * Queue management utilities
 */
export const QueueManager = {
    /**
     * Get all queue instances
     * @returns Map of all queue instances
     */
    getAllQueues: (): Map<string, Queue> => queueInstances,

    /**
     * Get queue statistics
     * @param queueName - Name of the queue
     * @returns Queue statistics
     */
    getQueueStats: async (queueName: string): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    } | null> => {
        const queue = queueInstances.get(queueName);
        if (!queue) return null;

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
    getSystemStats: async (): Promise<Record<string, {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>> => {
        const stats: any = {};
        
        for (const [queueName, queue] of queueInstances) {
            stats[queueName] = await QueueManager.getQueueStats(queueName);
        }
        
        return stats;
    },

    /**
     * Pause all queues
     */
    pauseAll: async (): Promise<void> => {
        console.log('Pausing all queues...');
        await Promise.all(
            Array.from(queueInstances.values()).map(queue => queue.pause())
        );
        console.log('All queues paused');
    },

    /**
     * Resume all queues
     */
    resumeAll: async (): Promise<void> => {
        console.log('Resuming all queues...');
        await Promise.all(
            Array.from(queueInstances.values()).map(queue => queue.resume())
        );
        console.log('All queues resumed');
    },

    /**
     * Clean completed and failed jobs from all queues
     * @param maxAge - Maximum age in milliseconds for jobs to keep
     */
    cleanAllQueues: async (maxAge: number = 24 * 60 * 60 * 1000): Promise<void> => {
        console.log('Cleaning all queues...');
        
        for (const [queueName, queue] of queueInstances) {
            try {
                await queue.clean(maxAge, 100, 'completed');
                await queue.clean(maxAge, 50, 'failed'); 
                console.log(`Queue ${queueName} cleaned`);
            } catch (error) {
                console.error(`Failed to clean queue ${queueName}:`, error);
            }
        }
    },

    /**
     * Close all queue connections
     */
    closeAll: async (): Promise<void> => {
        console.log('Closing all queue connections...');
        
        await Promise.all(
            Array.from(queueInstances.values()).map(queue => queue.close())
        );
        
        queueInstances.clear();
        console.log('All queue connections closed');
    }
};

/**
 * Job utilities for adding jobs with proper typing
 */
export const JobUtils = {
    /**
     * Add asset processing job
     * @param data - Job data
     * @param options - Job options
     */
    addProcessAssetJob: async (
        data: ProcessAssetJobData, 
        options?: any
    ): Promise<Job<ProcessAssetJobData>> => {
        const queue = getAssetProcessingQueue();
        return queue.add(JOB_TYPES.PROCESS_ASSET, data, options);
    },

    /**
     * Add thumbnail generation job
     * @param data - Job data
     * @param options - Job options
     */
    addGenerateThumbnailsJob: async (
        data: GenerateThumbnailsJobData,
        options?: any
    ): Promise<Job<GenerateThumbnailsJobData>> => {
        const queue = getImageProcessingQueue();
        return queue.add(JOB_TYPES.GENERATE_THUMBNAILS, data, options);
    },

    /**
     * Add video transcoding job
     * @param data - Job data
     * @param options - Job options
     */
    addTranscodeVideoJob: async (
        data: TranscodeVideoJobData,
        options?: any
    ): Promise<Job<TranscodeVideoJobData>> => {
        const queue = getVideoProcessingQueue();
        return queue.add(JOB_TYPES.TRANSCODE_VIDEO, data, options);
    },

    /**
     * Add metadata extraction job
     * @param data - Job data
     * @param options - Job options
     */
    addExtractMetadataJob: async (
        data: ExtractMetadataJobData,
        options?: any
    ): Promise<Job<ExtractMetadataJobData>> => {
        const queue = getMetadataExtractionQueue();
        return queue.add(JOB_TYPES.EXTRACT_METADATA, data, options);
    },

    /**
     * Add cleanup job
     * @param data - Job data
     * @param options - Job options
     */
    addCleanupJob: async (
        data: CleanupJobData,
        options?: any
    ): Promise<Job<CleanupJobData>> => {
        const queue = getCleanupQueue();
        return queue.add(JOB_TYPES.DELETE_STORAGE, data, options);
    }
};

export default QueueManager;
