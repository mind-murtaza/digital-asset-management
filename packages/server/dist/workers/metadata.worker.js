"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataWorker = void 0;
/**
 * @fileoverview Metadata Extraction Worker
 * Extracts comprehensive metadata from various file types including images, videos,
 * documents, and audio files using multiple libraries and tools.
 */
const bullmq_1 = require("bullmq");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const redis_1 = require("../config/redis");
const storage_1 = require("../config/storage");
const asset_dao_1 = __importDefault(require("../dao/asset.dao"));
const queues_1 = require("../queues");
/**
 * Metadata extraction configuration
 */
const METADATA_CONFIG = {
    tempDir: '/tmp/dam-metadata',
    ffprobe: {
        path: process.env.FFPROBE_PATH || '/usr/bin/ffprobe'
    },
    supportedTypes: {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'],
        video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'],
        document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    }
};
/**
 * Metadata extraction worker class
 */
class MetadataWorker {
    worker;
    storage = (0, storage_1.getStorageService)();
    constructor() {
        this.worker = new bullmq_1.Worker(queues_1.QUEUE_NAMES.METADATA_EXTRACTION, this.processJob.bind(this), {
            connection: (0, redis_1.getRedisClient)(),
            concurrency: parseInt(process.env.WORKER_CONCURRENCY || '4', 10),
            removeOnComplete: 100,
            removeOnFail: 25
        });
        this.setupEventHandlers();
        this.ensureTempDirectory();
    }
    /**
     * Setup worker event handlers
     */
    setupEventHandlers() {
        this.worker.on('ready', () => {
            console.log('🔍 Metadata extraction worker ready');
        });
        this.worker.on('active', (job) => {
            console.log(`🔄 Extracting metadata for job ${job.id}: ${job.name}`);
        });
        this.worker.on('completed', (job, result) => {
            console.log(`✅ Metadata job ${job.id} completed:`, result.summary);
        });
        this.worker.on('failed', (job, error) => {
            console.error(`❌ Metadata job ${job?.id} failed:`, error.message);
        });
        this.worker.on('error', (error) => {
            console.error('🚨 Metadata worker error:', error);
        });
    }
    /**
     * Ensure temp directory exists
     */
    async ensureTempDirectory() {
        try {
            await fs_1.promises.mkdir(METADATA_CONFIG.tempDir, { recursive: true });
            console.log(`📁 Metadata temp directory ready: ${METADATA_CONFIG.tempDir}`);
        }
        catch (error) {
            console.error('Failed to create metadata temp directory:', error);
        }
    }
    /**
     * Main job processing method
     * @param job - BullMQ job instance
     * @returns Metadata extraction result
     */
    async processJob(job) {
        const { name, data } = job;
        try {
            switch (name) {
                case queues_1.JOB_TYPES.EXTRACT_METADATA:
                    return await this.extractMetadata(data, job);
                case queues_1.JOB_TYPES.ANALYZE_CONTENT:
                    return await this.analyzeContent(data, job);
                default:
                    throw new Error(`Unknown metadata job type: ${name}`);
            }
        }
        catch (error) {
            console.error(`Metadata extraction error for job ${job.id}:`, error);
            // Update asset with processing error
            if (data.assetId) {
                await asset_dao_1.default.updateById(data.assetId, {
                    status: 'failed',
                    processingError: `Metadata extraction failed: ${error.message}`
                });
            }
            throw error;
        }
    }
    /**
     * Extract comprehensive metadata from asset
     * @param data - Job data containing asset information
     * @param job - BullMQ job for progress tracking
     * @returns Extracted metadata
     */
    async extractMetadata(data, job) {
        const { assetId, organizationId, storageKey, mimeType, originalFilename } = data;
        await job.updateProgress(10);
        // Create unique temp directory for this job
        const jobTempDir = path_1.default.join(METADATA_CONFIG.tempDir, `job_${job.id}`);
        await fs_1.promises.mkdir(jobTempDir, { recursive: true });
        try {
            // Download file for analysis
            const tempFilePath = path_1.default.join(jobTempDir, this.sanitizeFilename(originalFilename));
            await this.downloadFileFromStorage(storageKey, tempFilePath);
            await job.updateProgress(30);
            // Extract metadata based on file type
            let metadata = {
                originalFilename,
                mimeType,
                extractedAt: new Date().toISOString()
            };
            // Get basic file information
            const stats = await fs_1.promises.stat(tempFilePath);
            metadata.fileSizeBytes = stats.size;
            metadata.lastModified = stats.mtime;
            await job.updateProgress(40);
            // Extract type-specific metadata
            if (this.isImageType(mimeType)) {
                const imageMetadata = await this.extractImageMetadata(tempFilePath);
                metadata = { ...metadata, ...imageMetadata };
                await job.updateProgress(70);
            }
            else if (this.isVideoType(mimeType)) {
                const videoMetadata = await this.extractVideoMetadata(tempFilePath);
                metadata = { ...metadata, ...videoMetadata };
                await job.updateProgress(70);
            }
            else if (this.isAudioType(mimeType)) {
                const audioMetadata = await this.extractAudioMetadata(tempFilePath);
                metadata = { ...metadata, ...audioMetadata };
                await job.updateProgress(70);
            }
            else if (this.isDocumentType(mimeType)) {
                const documentMetadata = await this.extractDocumentMetadata(tempFilePath);
                metadata = { ...metadata, ...documentMetadata };
                await job.updateProgress(70);
            }
            // Generate content tags based on filename and metadata
            const contentTags = this.generateContentTags(originalFilename, metadata);
            metadata.suggestedTags = contentTags;
            await job.updateProgress(85);
            // Update asset with extracted metadata
            await asset_dao_1.default.updateById(assetId, {
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    duration: metadata.duration,
                    codec: metadata.codec || metadata.videoCodec,
                    bitrate: metadata.bitrate,
                    pageCount: metadata.pageCount
                },
                // Add suggested tags to existing tags
                tags: contentTags.slice(0, 5) // Limit to 5 auto-generated tags
            });
            await job.updateProgress(100);
            const summary = this.generateMetadataSummary(metadata);
            console.log(`📊 Metadata extracted for ${assetId}: ${summary}`);
            return { metadata, summary };
        }
        finally {
            // Clean up temp files
            await this.cleanupTempDirectory(jobTempDir);
        }
    }
    /**
     * Analyze content for additional insights
     * @param data - Job data
     * @param job - BullMQ job
     * @returns Content analysis result
     */
    async analyzeContent(data, job) {
        const { assetId, storageKey, mimeType } = data;
        await job.updateProgress(20);
        // This could be extended with AI/ML analysis
        // For now, we'll do basic content analysis
        const analysis = {
            contentType: this.categorizeContent(mimeType),
            complexity: 'medium', // Could be determined by file size, dimensions, etc.
            quality: 'good', // Could be determined by technical metrics
            suitability: ['web', 'print'] // Based on resolution, format, etc.
        };
        await job.updateProgress(100);
        return { analysis };
    }
    /**
     * Extract metadata from image files using Sharp
     * @param filePath - Path to image file
     * @returns Image metadata
     */
    async extractImageMetadata(filePath) {
        try {
            const metadata = await (0, sharp_1.default)(filePath).metadata();
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                colorSpace: metadata.space,
                channels: metadata.channels,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                isAnimated: metadata.pages && metadata.pages > 1,
                pageCount: metadata.pages || 1,
                compression: metadata.compression,
                resolutionUnit: metadata.resolutionUnit
            };
        }
        catch (error) {
            console.error('Image metadata extraction failed:', error);
            return { error: `Image metadata extraction failed: ${error.message}` };
        }
    }
    /**
     * Extract metadata from video files using FFprobe
     * @param filePath - Path to video file
     * @returns Video metadata
     */
    async extractVideoMetadata(filePath) {
        return new Promise((resolve) => {
            const ffprobe = (0, child_process_1.spawn)(METADATA_CONFIG.ffprobe.path, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                filePath
            ]);
            let stdout = '';
            let stderr = '';
            ffprobe.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            ffprobe.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffprobe.on('close', (code) => {
                if (code !== 0) {
                    resolve({ error: `FFprobe failed: ${stderr}` });
                    return;
                }
                try {
                    const metadata = JSON.parse(stdout);
                    const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                    const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
                    resolve({
                        duration: parseFloat(metadata.format.duration),
                        bitrate: parseInt(metadata.format.bit_rate),
                        width: videoStream?.width,
                        height: videoStream?.height,
                        videoCodec: videoStream?.codec_name,
                        audioCodec: audioStream?.codec_name,
                        frameRate: videoStream?.r_frame_rate,
                        aspectRatio: videoStream ? `${videoStream.width}:${videoStream.height}` : undefined,
                        pixelFormat: videoStream?.pix_fmt,
                        profile: videoStream?.profile,
                        level: videoStream?.level,
                        hasAudio: !!audioStream,
                        audioChannels: audioStream?.channels,
                        audioSampleRate: audioStream?.sample_rate,
                        format: metadata.format.format_name,
                        containerFormat: metadata.format.format_long_name
                    });
                }
                catch (error) {
                    resolve({ error: `Failed to parse FFprobe output: ${error.message}` });
                }
            });
        });
    }
    /**
     * Extract metadata from audio files using FFprobe
     * @param filePath - Path to audio file
     * @returns Audio metadata
     */
    async extractAudioMetadata(filePath) {
        return new Promise((resolve) => {
            const ffprobe = (0, child_process_1.spawn)(METADATA_CONFIG.ffprobe.path, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                filePath
            ]);
            let stdout = '';
            let stderr = '';
            ffprobe.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            ffprobe.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffprobe.on('close', (code) => {
                if (code !== 0) {
                    resolve({ error: `FFprobe failed: ${stderr}` });
                    return;
                }
                try {
                    const metadata = JSON.parse(stdout);
                    const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
                    resolve({
                        duration: parseFloat(metadata.format.duration),
                        bitrate: parseInt(metadata.format.bit_rate),
                        codec: audioStream?.codec_name,
                        channels: audioStream?.channels,
                        sampleRate: audioStream?.sample_rate,
                        bitDepth: audioStream?.bits_per_sample,
                        format: metadata.format.format_name,
                        title: metadata.format.tags?.title,
                        artist: metadata.format.tags?.artist,
                        album: metadata.format.tags?.album,
                        year: metadata.format.tags?.date,
                        genre: metadata.format.tags?.genre
                    });
                }
                catch (error) {
                    resolve({ error: `Failed to parse audio metadata: ${error.message}` });
                }
            });
        });
    }
    /**
     * Extract metadata from document files
     * @param filePath - Path to document file
     * @returns Document metadata
     */
    async extractDocumentMetadata(filePath) {
        try {
            const stats = await fs_1.promises.stat(filePath);
            const extension = path_1.default.extname(filePath).toLowerCase();
            // Basic document metadata
            const metadata = {
                extension,
                fileSizeBytes: stats.size,
                lastModified: stats.mtime
            };
            // For PDF files, we could use a PDF parsing library
            if (extension === '.pdf') {
                // This would require a PDF parsing library like pdf-parse
                // For now, we'll provide basic info
                metadata.documentType = 'PDF';
                metadata.estimatedPages = Math.ceil(stats.size / 50000); // Rough estimate
            }
            else if (['.txt', '.md'].includes(extension)) {
                const content = await fs_1.promises.readFile(filePath, 'utf-8');
                metadata.characterCount = content.length;
                metadata.wordCount = content.split(/\s+/).length;
                metadata.lineCount = content.split('\n').length;
            }
            return metadata;
        }
        catch (error) {
            return { error: `Document metadata extraction failed: ${error.message}` };
        }
    }
    /**
     * Generate content tags based on filename and metadata
     * @param filename - Original filename
     * @param metadata - Extracted metadata
     * @returns Array of suggested tags
     */
    generateContentTags(filename, metadata) {
        const tags = [];
        // Extract tags from filename
        const nameWithoutExt = path_1.default.parse(filename).name.toLowerCase();
        const filenameParts = nameWithoutExt.split(/[-_\s]+/);
        // Add meaningful filename parts as tags
        filenameParts.forEach(part => {
            if (part.length > 2 && !['img', 'image', 'video', 'doc'].includes(part)) {
                tags.push(part);
            }
        });
        // Add format-based tags
        if (metadata.format) {
            tags.push(metadata.format);
        }
        // Add dimension-based tags for images/videos
        if (metadata.width && metadata.height) {
            if (metadata.width > 1920) {
                tags.push('high-resolution');
            }
            if (metadata.width > metadata.height) {
                tags.push('landscape');
            }
            else if (metadata.height > metadata.width) {
                tags.push('portrait');
            }
            else {
                tags.push('square');
            }
        }
        // Add duration-based tags for videos/audio
        if (metadata.duration) {
            if (metadata.duration < 30) {
                tags.push('short');
            }
            else if (metadata.duration > 300) {
                tags.push('long');
            }
        }
        // Add quality indicators
        if (metadata.bitrate) {
            if (metadata.bitrate > 5000000) {
                tags.push('high-quality');
            }
        }
        // Remove duplicates and limit to reasonable number
        return [...new Set(tags)].slice(0, 10);
    }
    /**
     * Generate a summary of extracted metadata
     * @param metadata - Extracted metadata
     * @returns Summary string
     */
    generateMetadataSummary(metadata) {
        const parts = [];
        if (metadata.width && metadata.height) {
            parts.push(`${metadata.width}x${metadata.height}`);
        }
        if (metadata.duration) {
            parts.push(`${Math.round(metadata.duration)}s`);
        }
        if (metadata.format) {
            parts.push(metadata.format.toUpperCase());
        }
        if (metadata.fileSizeBytes) {
            parts.push(this.formatFileSize(metadata.fileSizeBytes));
        }
        return parts.join(', ');
    }
    /**
     * Format file size in human readable format
     * @param bytes - File size in bytes
     * @returns Formatted file size
     */
    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    /**
     * Categorize content type
     * @param mimeType - MIME type
     * @returns Content category
     */
    categorizeContent(mimeType) {
        if (this.isImageType(mimeType))
            return 'image';
        if (this.isVideoType(mimeType))
            return 'video';
        if (this.isAudioType(mimeType))
            return 'audio';
        if (this.isDocumentType(mimeType))
            return 'document';
        return 'other';
    }
    /**
     * Check if MIME type is an image
     */
    isImageType(mimeType) {
        return METADATA_CONFIG.supportedTypes.image.includes(mimeType);
    }
    /**
     * Check if MIME type is a video
     */
    isVideoType(mimeType) {
        return METADATA_CONFIG.supportedTypes.video.includes(mimeType);
    }
    /**
     * Check if MIME type is audio
     */
    isAudioType(mimeType) {
        return METADATA_CONFIG.supportedTypes.audio.includes(mimeType);
    }
    /**
     * Check if MIME type is a document
     */
    isDocumentType(mimeType) {
        return METADATA_CONFIG.supportedTypes.document.includes(mimeType);
    }
    /**
     * Sanitize filename for safe file system usage
     * @param filename - Original filename
     * @returns Sanitized filename
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
    /**
     * Download file from storage to local path
     * @param storageKey - Storage key
     * @param localPath - Local file path
     */
    async downloadFileFromStorage(storageKey, localPath) {
        try {
            const { url } = await this.storage.getPresignedDownloadUrl(storageKey, {
                expiresIn: 600 // 10 minutes
            });
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            await fs_1.promises.writeFile(localPath, buffer);
            console.log(`📥 Downloaded for metadata: ${storageKey} -> ${localPath}`);
        }
        catch (error) {
            throw new Error(`File download failed: ${error.message}`);
        }
    }
    /**
     * Clean up temporary directory
     * @param dirPath - Directory path to clean up
     */
    async cleanupTempDirectory(dirPath) {
        try {
            await fs_1.promises.rm(dirPath, { recursive: true, force: true });
            console.log(`🧹 Cleaned up metadata temp directory: ${dirPath}`);
        }
        catch (error) {
            console.error(`Failed to cleanup temp directory: ${dirPath}`, error);
        }
    }
    /**
     * Gracefully close the worker
     */
    async close() {
        console.log('🛑 Shutting down metadata extraction worker...');
        await this.worker.close();
        console.log('✅ Metadata extraction worker closed');
    }
}
exports.MetadataWorker = MetadataWorker;
exports.default = MetadataWorker;
