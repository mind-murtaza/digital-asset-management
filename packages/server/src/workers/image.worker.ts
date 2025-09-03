/**
 * @fileoverview Image Processing Worker - Sharp Integration
 * Handles thumbnail generation, image optimization, and format conversion
 * for uploaded image assets using Sharp library for high-performance processing.
 */
import { Worker, Job, KeepJobs } from 'bullmq';
import sharp from 'sharp';
import { getRedisClient } from '../config/redis';
import { getStorageService } from '../config/storage';
import assetDao from '../dao/asset.dao';
import { QUEUE_NAMES, JOB_TYPES, GenerateThumbnailsJobData } from '../queues';

/**
 * Image processing configuration
 */
const IMAGE_CONFIG = {
    thumbnails: {
        small: { width: 256, height: 256, quality: 85 },
        large: { width: 640, height: 640, quality: 90 }
    },
    optimization: {
        jpeg: { quality: 85, progressive: true },
        png: { compressionLevel: 6, progressive: true },
        webp: { quality: 85, effort: 4 }
    },
    maxDimensions: { width: 4096, height: 4096 }
};

/**
 * Image processing worker class
 */
export class ImageWorker {
    private worker: Worker;
    private storage = getStorageService();

    constructor() {
        this.worker = new Worker(
            QUEUE_NAMES.IMAGE_PROCESSING,
            this.processJob.bind(this),
            {
                connection: getRedisClient(),
                concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
                removeOnComplete: 50 as KeepJobs,
                removeOnFail: 20 as KeepJobs
            }
        );

        this.setupEventHandlers();
    }

    /**
     * Setup worker event handlers for monitoring
     */
    private setupEventHandlers(): void {
        this.worker.on('ready', () => {
            console.log('🎨 Image processing worker ready');
        });

        this.worker.on('active', (job: Job) => {
            console.log(`🔄 Processing image job ${job.id}: ${job.name}`);
        });

        this.worker.on('completed', (job: Job, result: any) => {
            console.log(`✅ Image job ${job.id} completed:`, result);
        });

        this.worker.on('failed', (job: Job | undefined, error: Error) => {
            console.error(`❌ Image job ${job?.id} failed:`, error.message);
        });

        this.worker.on('error', (error: Error) => {
            console.error('🚨 Image worker error:', error);
        });
    }

    /**
     * Main job processing method
     * @param job - BullMQ job instance
     * @returns Processing result
     */
    private async processJob(job: Job): Promise<any> {
        const { name, data } = job;

        try {
            switch (name) {
                case JOB_TYPES.GENERATE_THUMBNAILS:
                    return await this.generateThumbnails(data as GenerateThumbnailsJobData, job);
                
                case JOB_TYPES.OPTIMIZE_IMAGE:
                    return await this.optimizeImage(data, job);
                
                default:
                    throw new Error(`Unknown image job type: ${name}`);
            }
        } catch (error: any) {
            console.error(`Image processing error for job ${job.id}:`, error);
            
            // Update asset with processing error
            if (data.assetId) {
                await assetDao.updateById(data.assetId, {
                    status: 'failed' as any,
                    processingError: `Image processing failed: ${error.message}`
                });
            }
            
            throw error;
        }
    }

    /**
     * Generate thumbnails for image assets
     * @param data - Job data containing asset information
     * @param job - BullMQ job for progress tracking
     * @returns Processing result with generated renditions
     */
    private async generateThumbnails(
        data: GenerateThumbnailsJobData, 
        job: Job
    ): Promise<{ renditions: any; metadata: any }> {
        const { assetId, organizationId, storageKey, mimeType } = data;
        
        await job.updateProgress(10);

        // Download original image from storage
        const originalBuffer = await this.downloadImageFromStorage(storageKey);
        await job.updateProgress(30);

        // Get image metadata
        const imageInfo = await sharp(originalBuffer).metadata();
        const metadata = {
            width: imageInfo.width,
            height: imageInfo.height,
            format: imageInfo.format,
            colorSpace: imageInfo.space,
            hasAlpha: imageInfo.hasAlpha,
            density: imageInfo.density
        };

        console.log(`📐 Image metadata for ${assetId}:`, metadata);
        await job.updateProgress(40);

        // Generate thumbnails
        const renditions: any = {};
        
        // Small thumbnail
        const smallThumbnail = await this.createThumbnail(
            originalBuffer, 
            IMAGE_CONFIG.thumbnails.small,
            'small'
        );
        
        const smallKey = this.generateRenditionKey(organizationId, assetId, 'thumbnail_small');
        await this.uploadRendition(smallThumbnail.buffer, smallKey, 'image/jpeg');
        
        renditions.thumbnail_small = {
            storageKey: smallKey,
            width: smallThumbnail.width,
            height: smallThumbnail.height
        };
        
        await job.updateProgress(60);

        // Large thumbnail
        const largeThumbnail = await this.createThumbnail(
            originalBuffer, 
            IMAGE_CONFIG.thumbnails.large,
            'large'
        );
        
        const largeKey = this.generateRenditionKey(organizationId, assetId, 'thumbnail_large');
        await this.uploadRendition(largeThumbnail.buffer, largeKey, 'image/jpeg');
        
        renditions.thumbnail_large = {
            storageKey: largeKey,
            width: largeThumbnail.width,
            height: largeThumbnail.height
        };
        
        await job.updateProgress(80);

        // Update asset with renditions and metadata
        await assetDao.updateById(assetId, {
            status: 'completed' as any,
            metadata,
            renditions
        });

        await job.updateProgress(100);

        return { renditions, metadata };
    }

    /**
     * Optimize image for better compression and performance
     * @param data - Job data
     * @param job - BullMQ job
     * @returns Optimization result
     */
    private async optimizeImage(data: any, job: Job): Promise<any> {
        const { assetId, storageKey, targetFormat } = data;
        
        await job.updateProgress(10);

        // Download original image
        const originalBuffer = await this.downloadImageFromStorage(storageKey);
        await job.updateProgress(30);

        // Optimize based on format
        let optimizedBuffer: Buffer;
        let outputFormat = targetFormat || 'jpeg';
        
        const sharpInstance = sharp(originalBuffer);
        
        switch (outputFormat.toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                optimizedBuffer = await sharpInstance
                    .jpeg(IMAGE_CONFIG.optimization.jpeg)
                    .toBuffer();
                break;
                
            case 'png':
                optimizedBuffer = await sharpInstance
                    .png(IMAGE_CONFIG.optimization.png)
                    .toBuffer();
                break;
                
            case 'webp':
                optimizedBuffer = await sharpInstance
                    .webp(IMAGE_CONFIG.optimization.webp)
                    .toBuffer();
                break;
                
            default:
                throw new Error(`Unsupported optimization format: ${outputFormat}`);
        }
        
        await job.updateProgress(70);

        // Upload optimized version
        const optimizedKey = storageKey.replace(/\.[^.]+$/, `_optimized.${outputFormat}`);
        await this.uploadRendition(optimizedBuffer, optimizedKey, `image/${outputFormat}`);
        
        await job.updateProgress(100);

        return {
            optimizedKey,
            originalSize: originalBuffer.length,
            optimizedSize: optimizedBuffer.length,
            compressionRatio: Math.round((1 - optimizedBuffer.length / originalBuffer.length) * 100)
        };
    }

    /**
     * Create thumbnail with specified dimensions
     * @param buffer - Original image buffer
     * @param config - Thumbnail configuration
     * @param size - Size identifier
     * @returns Thumbnail buffer and dimensions
     */
    private async createThumbnail(
        buffer: Buffer, 
        config: { width: number; height: number; quality: number },
        size: string
    ): Promise<{ buffer: Buffer; width: number; height: number }> {
        const { width, height, quality } = config;
        
        console.log(`🖼️ Creating ${size} thumbnail: ${width}x${height} @ ${quality}% quality`);
        
        const result = await sharp(buffer)
            .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality, progressive: true })
            .toBuffer({ resolveWithObject: true });

        return {
            buffer: result.data,
            width: result.info.width,
            height: result.info.height
        };
    }

    /**
     * Download image from storage
     * @param storageKey - Storage key for the image
     * @returns Image buffer
     */
    private async downloadImageFromStorage(storageKey: string): Promise<Buffer> {
        try {
            // Get presigned download URL
            const { url } = await this.storage.getPresignedDownloadUrl(storageKey, {
                expiresIn: 300 // 5 minutes
            });

            // Download the image
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download image: ${response.statusText}`);
            }

            return Buffer.from(await response.arrayBuffer());
        } catch (error: any) {
            console.error(`Failed to download image from storage: ${storageKey}`, error);
            throw new Error(`Image download failed: ${error.message}`);
        }
    }

    /**
     * Upload rendition to storage
     * @param buffer - Rendition buffer
     * @param storageKey - Storage key for the rendition
     * @param contentType - MIME type
     */
    private async uploadRendition(
        buffer: Buffer, 
        storageKey: string, 
        contentType: string
    ): Promise<void> {
        try {
            // Get presigned upload URL
            const { url } = await this.storage.getPresignedUploadUrl(storageKey, {
                contentType,
                contentLength: buffer.length,
                expiresIn: 300
            });

            // Upload the rendition
            const response = await fetch(url, {
                method: 'PUT',
                body: new Uint8Array(buffer),
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': buffer.length.toString()
                }
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            console.log(`📤 Uploaded rendition: ${storageKey} (${buffer.length} bytes)`);
        } catch (error: any) {
            console.error(`Failed to upload rendition: ${storageKey}`, error);
            throw new Error(`Rendition upload failed: ${error.message}`);
        }
    }

    /**
     * Generate storage key for rendition
     * @param organizationId - Organization ID
     * @param assetId - Asset ID
     * @param renditionType - Type of rendition
     * @returns Storage key
     */
    private generateRenditionKey(
        organizationId: string, 
        assetId: string, 
        renditionType: string
    ): string {
        const timestamp = Date.now();
        const filename = `${renditionType}_${timestamp}.jpg`;
        return `org/${organizationId}/assets/${assetId}/renditions/${filename}`;
    }

    /**
     * Validate image format and dimensions
     * @param buffer - Image buffer
     * @returns Validation result
     */
    private async validateImage(buffer: Buffer): Promise<{
        isValid: boolean;
        error?: string;
        metadata?: any;
    }> {
        try {
            const metadata = await sharp(buffer).metadata();
            
            // Check if it's a supported format
            const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff'];
            if (!metadata.format || !supportedFormats.includes(metadata.format)) {
                return {
                    isValid: false,
                    error: `Unsupported image format: ${metadata.format}`
                };
            }

            // Check dimensions
            if (!metadata.width || !metadata.height) {
                return {
                    isValid: false,
                    error: 'Invalid image dimensions'
                };
            }

            // Check maximum dimensions
            if (metadata.width > IMAGE_CONFIG.maxDimensions.width || 
                metadata.height > IMAGE_CONFIG.maxDimensions.height) {
                return {
                    isValid: false,
                    error: `Image dimensions exceed maximum allowed: ${IMAGE_CONFIG.maxDimensions.width}x${IMAGE_CONFIG.maxDimensions.height}`
                };
            }

            return { isValid: true, metadata };
        } catch (error: any) {
            return {
                isValid: false,
                error: `Image validation failed: ${error.message}`
            };
        }
    }

    /**
     * Gracefully close the worker
     */
    async close(): Promise<void> {
        console.log('🛑 Shutting down image processing worker...');
        await this.worker.close();
        console.log('✅ Image processing worker closed');
    }
}

export default ImageWorker;
