"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoWorker = void 0;
/**
 * @fileoverview Video Processing Worker - FFmpeg Integration
 * Handles video transcoding, poster frame extraction, and format conversion
 * for uploaded video assets using FFmpeg for professional video processing.
 */
const bullmq_1 = require("bullmq");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const redis_1 = require("../config/redis");
const storage_1 = require("../config/storage");
const asset_dao_1 = __importDefault(require("../dao/asset.dao"));
const queues_1 = require("../queues");
/**
 * Video processing configuration
 */
const VIDEO_CONFIG = {
    resolutions: {
        '720p': { width: 1280, height: 720, bitrate: '2500k', audioBitrate: '128k' },
        '1080p': { width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' }
    },
    formats: {
        mp4: { codec: 'libx264', audioCodec: 'aac' },
        webm: { codec: 'libvpx-vp9', audioCodec: 'libopus' }
    },
    poster: {
        format: 'jpg',
        quality: 85,
        timeOffset: '00:00:02' // Extract poster at 2 seconds
    },
    ffmpeg: {
        path: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
        probePath: process.env.FFPROBE_PATH || '/usr/bin/ffprobe'
    },
    tempDir: '/tmp/dam-processing'
};
/**
 * Video processing worker class
 */
class VideoWorker {
    worker;
    storage = (0, storage_1.getStorageService)();
    constructor() {
        this.worker = new bullmq_1.Worker(queues_1.QUEUE_NAMES.VIDEO_PROCESSING, this.processJob.bind(this), {
            connection: (0, redis_1.getRedisClient)(),
            concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10), // Lower concurrency for video
            removeOnComplete: 25,
            removeOnFail: 10
        });
        this.setupEventHandlers();
        this.ensureTempDirectory();
    }
    /**
     * Setup worker event handlers for monitoring
     */
    setupEventHandlers() {
        this.worker.on('ready', () => {
            console.log('🎬 Video processing worker ready');
        });
        this.worker.on('active', (job) => {
            console.log(`🔄 Processing video job ${job.id}: ${job.name}`);
        });
        this.worker.on('completed', (job, result) => {
            console.log(`✅ Video job ${job.id} completed:`, result);
        });
        this.worker.on('failed', (job, error) => {
            console.error(`❌ Video job ${job?.id} failed:`, error.message);
        });
        this.worker.on('error', (error) => {
            console.error('🚨 Video worker error:', error);
        });
    }
    /**
     * Ensure temp directory exists for video processing
     */
    async ensureTempDirectory() {
        try {
            await fs_1.promises.mkdir(VIDEO_CONFIG.tempDir, { recursive: true });
            console.log(`📁 Video temp directory ready: ${VIDEO_CONFIG.tempDir}`);
        }
        catch (error) {
            console.error('Failed to create temp directory:', error);
        }
    }
    /**
     * Main job processing method
     * @param job - BullMQ job instance
     * @returns Processing result
     */
    async processJob(job) {
        const { name, data } = job;
        try {
            switch (name) {
                case queues_1.JOB_TYPES.TRANSCODE_VIDEO:
                    return await this.transcodeVideo(data, job);
                case queues_1.JOB_TYPES.EXTRACT_POSTER:
                    return await this.extractPosterFrame(data, job);
                case queues_1.JOB_TYPES.GENERATE_PREVIEWS:
                    return await this.generatePreviews(data, job);
                default:
                    throw new Error(`Unknown video job type: ${name}`);
            }
        }
        catch (error) {
            console.error(`Video processing error for job ${job.id}:`, error);
            // Update asset with processing error
            if (data.assetId) {
                await asset_dao_1.default.updateById(data.assetId, {
                    status: 'failed',
                    processingError: `Video processing failed: ${error.message}`
                });
            }
            throw error;
        }
    }
    /**
     * Transcode video to multiple resolutions
     * @param data - Job data containing video information
     * @param job - BullMQ job for progress tracking
     * @returns Processing result with transcoded videos
     */
    async transcodeVideo(data, job) {
        const { assetId, organizationId, storageKey, targetResolutions, extractPoster } = data;
        await job.updateProgress(5);
        // Create unique temp directory for this job
        const jobTempDir = path_1.default.join(VIDEO_CONFIG.tempDir, `job_${job.id}`);
        await fs_1.promises.mkdir(jobTempDir, { recursive: true });
        try {
            // Download original video
            const originalPath = path_1.default.join(jobTempDir, 'original.mp4');
            await this.downloadVideoFromStorage(storageKey, originalPath);
            await job.updateProgress(15);
            // Get video metadata
            const metadata = await this.getVideoMetadata(originalPath);
            console.log(`📹 Video metadata for ${assetId}:`, metadata);
            await job.updateProgress(25);
            const renditions = {};
            // Extract poster frame if requested
            if (extractPoster) {
                const posterPath = path_1.default.join(jobTempDir, 'poster.jpg');
                await this.extractPoster(originalPath, posterPath);
                const posterKey = this.generateRenditionKey(organizationId, assetId, 'poster');
                await this.uploadRendition(posterPath, posterKey, 'image/jpeg');
                renditions.poster = {
                    storageKey: posterKey,
                    format: 'jpg'
                };
                await job.updateProgress(35);
            }
            // Transcode to target resolutions
            let progressStep = 35;
            const progressPerResolution = (90 - progressStep) / targetResolutions.length;
            for (const resolution of targetResolutions) {
                const config = VIDEO_CONFIG.resolutions[resolution];
                if (!config) {
                    console.warn(`Unknown resolution: ${resolution}`);
                    continue;
                }
                const outputPath = path_1.default.join(jobTempDir, `${resolution}.mp4`);
                await this.transcodeToResolution(originalPath, outputPath, config, job);
                const renditionKey = this.generateRenditionKey(organizationId, assetId, `preview_${resolution}`);
                await this.uploadRendition(outputPath, renditionKey, 'video/mp4');
                // Get file size
                const stats = await fs_1.promises.stat(outputPath);
                renditions[`preview_${resolution}`] = {
                    storageKey: renditionKey,
                    fileSizeBytes: stats.size,
                    resolution,
                    width: config.width,
                    height: config.height
                };
                progressStep += progressPerResolution;
                await job.updateProgress(Math.round(progressStep));
            }
            // Update asset with renditions and metadata
            await asset_dao_1.default.updateById(assetId, {
                status: 'completed',
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    duration: metadata.duration,
                    codec: metadata.videoCodec,
                    bitrate: metadata.bitrate
                },
                renditions
            });
            await job.updateProgress(100);
            return { renditions, metadata };
        }
        finally {
            // Clean up temp files
            await this.cleanupTempDirectory(jobTempDir);
        }
    }
    /**
     * Extract poster frame from video
     * @param data - Job data
     * @param job - BullMQ job
     * @returns Poster extraction result
     */
    async extractPosterFrame(data, job) {
        const { assetId, organizationId, storageKey, timeOffset } = data;
        const jobTempDir = path_1.default.join(VIDEO_CONFIG.tempDir, `poster_${job.id}`);
        await fs_1.promises.mkdir(jobTempDir, { recursive: true });
        try {
            await job.updateProgress(10);
            // Download original video
            const originalPath = path_1.default.join(jobTempDir, 'original.mp4');
            await this.downloadVideoFromStorage(storageKey, originalPath);
            await job.updateProgress(40);
            // Extract poster frame
            const posterPath = path_1.default.join(jobTempDir, 'poster.jpg');
            await this.extractPoster(originalPath, posterPath, timeOffset);
            await job.updateProgress(70);
            // Upload poster
            const posterKey = this.generateRenditionKey(organizationId, assetId, 'poster');
            await this.uploadRendition(posterPath, posterKey, 'image/jpeg');
            await job.updateProgress(100);
            return {
                posterKey,
                timeOffset: timeOffset || VIDEO_CONFIG.poster.timeOffset
            };
        }
        finally {
            await this.cleanupTempDirectory(jobTempDir);
        }
    }
    /**
     * Generate video previews (short clips)
     * @param data - Job data
     * @param job - BullMQ job
     * @returns Preview generation result
     */
    async generatePreviews(data, job) {
        const { assetId, organizationId, storageKey, previewDuration = 10 } = data;
        const jobTempDir = path_1.default.join(VIDEO_CONFIG.tempDir, `preview_${job.id}`);
        await fs_1.promises.mkdir(jobTempDir, { recursive: true });
        try {
            await job.updateProgress(10);
            // Download original video
            const originalPath = path_1.default.join(jobTempDir, 'original.mp4');
            await this.downloadVideoFromStorage(storageKey, originalPath);
            await job.updateProgress(30);
            // Generate preview clip
            const previewPath = path_1.default.join(jobTempDir, 'preview.mp4');
            await this.generatePreviewClip(originalPath, previewPath, previewDuration);
            await job.updateProgress(70);
            // Upload preview
            const previewKey = this.generateRenditionKey(organizationId, assetId, 'preview_clip');
            await this.uploadRendition(previewPath, previewKey, 'video/mp4');
            await job.updateProgress(100);
            const stats = await fs_1.promises.stat(previewPath);
            return {
                previewKey,
                duration: previewDuration,
                fileSizeBytes: stats.size
            };
        }
        finally {
            await this.cleanupTempDirectory(jobTempDir);
        }
    }
    /**
     * Get video metadata using ffprobe
     * @param videoPath - Path to video file
     * @returns Video metadata
     */
    async getVideoMetadata(videoPath) {
        return new Promise((resolve, reject) => {
            const ffprobe = (0, child_process_1.spawn)(VIDEO_CONFIG.ffmpeg.probePath, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                videoPath
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
                    reject(new Error(`ffprobe failed: ${stderr}`));
                    return;
                }
                try {
                    const metadata = JSON.parse(stdout);
                    const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                    const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
                    resolve({
                        duration: parseFloat(metadata.format.duration),
                        bitrate: parseInt(metadata.format.bit_rate),
                        size: parseInt(metadata.format.size),
                        width: videoStream?.width,
                        height: videoStream?.height,
                        videoCodec: videoStream?.codec_name,
                        audioCodec: audioStream?.codec_name,
                        frameRate: videoStream?.r_frame_rate,
                        format: metadata.format.format_name
                    });
                }
                catch (error) {
                    reject(new Error(`Failed to parse ffprobe output: ${error}`));
                }
            });
        });
    }
    /**
     * Transcode video to specific resolution
     * @param inputPath - Input video path
     * @param outputPath - Output video path
     * @param config - Resolution configuration
     * @param job - Job for progress tracking
     */
    async transcodeToResolution(inputPath, outputPath, config, job) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i', inputPath,
                '-c:v', VIDEO_CONFIG.formats.mp4.codec,
                '-c:a', VIDEO_CONFIG.formats.mp4.audioCodec,
                '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:(ow-iw)/2:(oh-ih)/2`,
                '-b:v', config.bitrate,
                '-b:a', config.audioBitrate,
                '-preset', process.env.VIDEO_PROCESSING_PRESET || 'fast',
                '-movflags', '+faststart', // Optimize for streaming
                '-y', // Overwrite output file
                outputPath
            ];
            console.log(`🎬 Transcoding to ${config.width}x${config.height}: ${outputPath}`);
            const ffmpeg = (0, child_process_1.spawn)(VIDEO_CONFIG.ffmpeg.path, args);
            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
                // Parse progress from ffmpeg output
                const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/);
                if (timeMatch) {
                    const hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);
                    const seconds = parseInt(timeMatch[3]);
                    const currentTime = hours * 3600 + minutes * 60 + seconds;
                    // This is a rough progress estimation
                    // In production, you'd want more accurate progress tracking
                    console.log(`⏱️ Transcoding progress: ${currentTime}s`);
                }
            });
            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    console.error(`FFmpeg transcoding failed with code ${code}:`, stderr);
                    reject(new Error(`Video transcoding failed: ${stderr}`));
                    return;
                }
                console.log(`✅ Transcoding completed: ${outputPath}`);
                resolve();
            });
            ffmpeg.on('error', (error) => {
                reject(new Error(`FFmpeg spawn error: ${error.message}`));
            });
        });
    }
    /**
     * Extract poster frame from video
     * @param inputPath - Input video path
     * @param outputPath - Output image path
     * @param timeOffset - Time offset for frame extraction
     */
    async extractPoster(inputPath, outputPath, timeOffset = VIDEO_CONFIG.poster.timeOffset) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i', inputPath,
                '-ss', timeOffset,
                '-vframes', '1',
                '-q:v', '2', // High quality
                '-y',
                outputPath
            ];
            console.log(`📸 Extracting poster frame at ${timeOffset}: ${outputPath}`);
            const ffmpeg = (0, child_process_1.spawn)(VIDEO_CONFIG.ffmpeg.path, args);
            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Poster extraction failed: ${stderr}`));
                    return;
                }
                console.log(`✅ Poster frame extracted: ${outputPath}`);
                resolve();
            });
            ffmpeg.on('error', (error) => {
                reject(new Error(`FFmpeg poster extraction error: ${error.message}`));
            });
        });
    }
    /**
     * Generate preview clip from video
     * @param inputPath - Input video path
     * @param outputPath - Output video path
     * @param duration - Preview duration in seconds
     */
    async generatePreviewClip(inputPath, outputPath, duration) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i', inputPath,
                '-ss', '10', // Start at 10 seconds
                '-t', duration.toString(),
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',
                '-y',
                outputPath
            ];
            console.log(`🎞️ Generating ${duration}s preview clip: ${outputPath}`);
            const ffmpeg = (0, child_process_1.spawn)(VIDEO_CONFIG.ffmpeg.path, args);
            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Preview generation failed: ${stderr}`));
                    return;
                }
                console.log(`✅ Preview clip generated: ${outputPath}`);
                resolve();
            });
        });
    }
    /**
     * Download video from storage to local file
     * @param storageKey - Storage key
     * @param localPath - Local file path
     */
    async downloadVideoFromStorage(storageKey, localPath) {
        try {
            const { url } = await this.storage.getPresignedDownloadUrl(storageKey, {
                expiresIn: 1800 // 30 minutes for large video downloads
            });
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            await fs_1.promises.writeFile(localPath, buffer);
            console.log(`📥 Downloaded video: ${storageKey} -> ${localPath} (${buffer.length} bytes)`);
        }
        catch (error) {
            console.error(`Failed to download video: ${storageKey}`, error);
            throw new Error(`Video download failed: ${error.message}`);
        }
    }
    /**
     * Upload rendition file to storage
     * @param filePath - Local file path
     * @param storageKey - Storage key
     * @param contentType - MIME type
     */
    async uploadRendition(filePath, storageKey, contentType) {
        try {
            const buffer = await fs_1.promises.readFile(filePath);
            const { url } = await this.storage.getPresignedUploadUrl(storageKey, {
                contentType,
                contentLength: buffer.length,
                expiresIn: 1800
            });
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
        }
        catch (error) {
            console.error(`Failed to upload rendition: ${storageKey}`, error);
            throw new Error(`Rendition upload failed: ${error.message}`);
        }
    }
    /**
     * Generate storage key for video rendition
     * @param organizationId - Organization ID
     * @param assetId - Asset ID
     * @param renditionType - Type of rendition
     * @returns Storage key
     */
    generateRenditionKey(organizationId, assetId, renditionType) {
        const timestamp = Date.now();
        const extension = renditionType.includes('poster') ? 'jpg' : 'mp4';
        const filename = `${renditionType}_${timestamp}.${extension}`;
        return `org/${organizationId}/assets/${assetId}/renditions/${filename}`;
    }
    /**
     * Clean up temporary directory
     * @param dirPath - Directory path to clean up
     */
    async cleanupTempDirectory(dirPath) {
        try {
            await fs_1.promises.rm(dirPath, { recursive: true, force: true });
            console.log(`🧹 Cleaned up temp directory: ${dirPath}`);
        }
        catch (error) {
            console.error(`Failed to cleanup temp directory: ${dirPath}`, error);
        }
    }
    /**
     * Gracefully close the worker
     */
    async close() {
        console.log('🛑 Shutting down video processing worker...');
        await this.worker.close();
        console.log('✅ Video processing worker closed');
    }
}
exports.VideoWorker = VideoWorker;
exports.default = VideoWorker;
