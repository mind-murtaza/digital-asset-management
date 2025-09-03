"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageUtils = exports.getStorageService = exports.StorageService = void 0;
/**
 * @fileoverview Storage Configuration - MinIO/S3 Client Setup
 * AWS SDK v3 S3 client configured for MinIO with presigned URL support
 * Provides unified interface for object storage operations across providers.
 */
const client_s3_1 = require("@aws-sdk/client-s3");
const client_s3_2 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
require('dotenv').config();
/**
 * Storage service class for unified object storage operations
 * Supports MinIO, AWS S3, and other S3-compatible providers
 */
class StorageService {
    s3Client;
    bucket;
    defaultPresignExpiry = 3600; // 1 hour
    /**
     * Initialize storage service with configuration
     * @param config - Storage configuration
     */
    constructor(config) {
        this.bucket = config.bucket;
        const clientConfig = {
            region: config.region,
            credentials: config.credentials
        };
        // MinIO/S3-compatible endpoint configuration
        if (config.endpoint) {
            clientConfig.endpoint = config.endpoint;
            clientConfig.forcePathStyle = config.forcePathStyle ?? true;
        }
        this.s3Client = new client_s3_1.S3Client(clientConfig);
    }
    /**
     * Generate presigned URL for uploading an object
     * @param key - Storage key/path
     * @param options - Presign options
     * @returns Presigned upload URL and expiration
     */
    async getPresignedUploadUrl(key, options = {}) {
        const { expiresIn = this.defaultPresignExpiry, contentType, contentLength } = options;
        const command = new client_s3_2.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn });
        const expiresAt = new Date(Date.now() + (expiresIn * 1000));
        return { url, expiresAt };
    }
    /**
     * Generate presigned URL for downloading an object
     * @param key - Storage key/path
     * @param options - Presign options
     * @returns Presigned download URL and expiration
     */
    async getPresignedDownloadUrl(key, options = {}) {
        const { expiresIn = this.defaultPresignExpiry } = options;
        const command = new client_s3_2.GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn });
        const expiresAt = new Date(Date.now() + (expiresIn * 1000));
        return { url, expiresAt };
    }
    /**
     * Check if object exists and get metadata
     * @param key - Storage key/path
     * @returns Object metadata or null if not found
     */
    async headObject(key) {
        try {
            const command = new client_s3_2.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key
            });
            const response = await this.s3Client.send(command);
            return {
                contentLength: response.ContentLength,
                contentType: response.ContentType,
                lastModified: response.LastModified,
                etag: response.ETag?.replace(/"/g, '') // Remove quotes from ETag
            };
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Delete an object from storage
     * @param key - Storage key/path
     * @returns Success boolean
     */
    async deleteObject(key) {
        try {
            const command = new client_s3_2.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
                return true; // Already deleted
            }
            throw error;
        }
    }
    /**
     * Generate storage key for asset
     * Format: {orgId}/{projectId}/{assetId}/original/v{version}/{filename}
     */
    generateAssetKey(orgId, projectId, assetId, version, filename, type = 'original', renditionName) {
        const sanitizedFilename = this.sanitizeFilename(filename);
        const basePath = `org/${orgId}/proj/${projectId}/asset/${assetId}`;
        if (type === 'original') {
            return `${basePath}/original/v${version}/${sanitizedFilename}`;
        }
        else {
            return `${basePath}/renditions/${renditionName}/${sanitizedFilename}`;
        }
    }
    /**
     * Sanitize filename for storage
     * @param filename - Original filename
     * @returns Sanitized filename safe for storage
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace invalid chars with underscore
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .substring(0, 255); // Limit length
    }
    /**
     * Get bucket name
     */
    getBucket() {
        return this.bucket;
    }
}
exports.StorageService = StorageService;
/**
 * Environment variable validation and parsing
 */
const getStorageConfig = () => {
    // Required environment variables
    const requiredVars = [
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'S3_BUCKET_NAME',
        'S3_REGION'
    ];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        throw new Error(`Missing required storage environment variables: ${missing.join(', ')}`);
    }
    const config = {
        region: process.env.S3_REGION,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
        },
        bucket: process.env.S3_BUCKET_NAME
    };
    // Optional MinIO endpoint configuration
    if (process.env.S3_ENDPOINT) {
        config.endpoint = process.env.S3_ENDPOINT;
        config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false'; // Default true for MinIO
    }
    return config;
};
/**
 * Global storage service instance
 * Singleton pattern for reusing S3 client connection
 */
let storageServiceInstance = null;
/**
 * Get or create storage service instance
 * @returns StorageService singleton instance
 */
const getStorageService = () => {
    if (!storageServiceInstance) {
        const config = getStorageConfig();
        storageServiceInstance = new StorageService(config);
    }
    return storageServiceInstance;
};
exports.getStorageService = getStorageService;
/**
 * Storage utility functions
 */
exports.StorageUtils = {
    /**
     * Parse storage key to extract components
     * @param key - Storage key to parse
     * @returns Parsed components or null if invalid format
     */
    parseStorageKey: (key) => {
        // Pattern: org/{orgId}/proj/{projectId}/asset/{assetId}/original/v{version}/{filename}
        // Or: org/{orgId}/proj/{projectId}/asset/{assetId}/renditions/{renditionName}/{filename}
        const originalPattern = /^org\/([^/]+)\/proj\/([^/]+)\/asset\/([^/]+)\/original\/v(\d+)\/(.+)$/;
        const renditionPattern = /^org\/([^/]+)\/proj\/([^/]+)\/asset\/([^/]+)\/renditions\/([^/]+)\/(.+)$/;
        let match = key.match(originalPattern);
        if (match) {
            return {
                orgId: match[1],
                projectId: match[2],
                assetId: match[3],
                type: 'original',
                version: parseInt(match[4], 10),
                filename: match[5]
            };
        }
        match = key.match(renditionPattern);
        if (match) {
            return {
                orgId: match[1],
                projectId: match[2],
                assetId: match[3],
                type: 'rendition',
                renditionName: match[4],
                filename: match[5]
            };
        }
        return null;
    },
    /**
     * Validate file extension against MIME type
     * @param filename - Original filename
     * @param mimeType - Detected MIME type
     * @returns Whether extension matches MIME type expectation
     */
    validateFileExtension: (filename, mimeType) => {
        const ext = filename.toLowerCase().split('.').pop() || '';
        const type = mimeType.toLowerCase();
        const extensionMap = {
            'image/jpeg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/gif': ['gif'],
            'image/webp': ['webp'],
            'video/mp4': ['mp4'],
            'video/mpeg': ['mpeg', 'mpg'],
            'video/quicktime': ['mov'],
            'audio/mpeg': ['mp3'],
            'audio/wav': ['wav'],
            'application/pdf': ['pdf'],
            'text/plain': ['txt'],
            'application/zip': ['zip'],
            'application/x-tar': ['tar']
        };
        const expectedExtensions = extensionMap[type];
        return expectedExtensions ? expectedExtensions.includes(ext) : true; // Allow unknown types
    },
    /**
     * Get asset type from MIME type
     * @param mimeType - MIME type string
     * @returns AssetType enum value
     */
    getAssetTypeFromMime: (mimeType) => {
        const type = mimeType.toLowerCase();
        if (type.startsWith('image/'))
            return 'IMAGE';
        if (type.startsWith('video/'))
            return 'VIDEO';
        if (type.startsWith('audio/'))
            return 'AUDIO';
        if (type.includes('pdf') || type.includes('document') || type.includes('text'))
            return 'DOCUMENT';
        if (type.includes('zip') || type.includes('tar') || type.includes('archive'))
            return 'ARCHIVE';
        return 'OTHER';
    }
};
exports.default = StorageService;
