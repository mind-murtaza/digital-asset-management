/**
 * @fileoverview Storage Configuration - MinIO/S3 Client Setup
 * AWS SDK v3 S3 client configured for MinIO with presigned URL support
 * Provides unified interface for object storage operations across providers.
 */
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { 
    PutObjectCommand, 
    GetObjectCommand, 
    DeleteObjectCommand,
    HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
require('dotenv').config();

/**
 * Storage provider configuration interface
 */
interface StorageConfig {
    endpoint?: string;
    publicEndpoint?: string;
    region: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    forcePathStyle?: boolean;
    bucket: string;
}

/**
 * Presigned URL options
 */
interface PresignOptions {
    expiresIn?: number; // seconds, default 3600 (1 hour)
    contentType?: string;
    contentLength?: number;
}

/**
 * Storage service class for unified object storage operations
 * Supports MinIO, AWS S3, and other S3-compatible providers
 */
export class StorageService {
    private s3Client: S3Client;
    private bucket: string;
    private defaultPresignExpiry: number = 3600; // 1 hour
    private publicEndpoint?: string;

    /**
     * Initialize storage service with configuration
     * @param config - Storage configuration
     */
    constructor(config: StorageConfig) {
        this.bucket = config.bucket;
        this.publicEndpoint = config.publicEndpoint;
        
        const clientConfig: S3ClientConfig = {
            region: config.region,
            credentials: config.credentials
        };

        // MinIO/S3-compatible endpoint configuration
        if (config.endpoint) {
            clientConfig.endpoint = config.endpoint;
            clientConfig.forcePathStyle = config.forcePathStyle ?? true;
        }

        this.s3Client = new S3Client(clientConfig);
    }

    private rewriteToPublic(url: string): string {
        if (!this.publicEndpoint) return url;
        try {
            const pub = new URL(this.publicEndpoint);
            const u = new URL(url);
            u.protocol = pub.protocol;
            u.host = pub.host;
            return u.toString();
        } catch {
            return url;
        }
    }

    /**
     * Generate presigned URL for uploading an object
     * @param key - Storage key/path
     * @param options - Presign options
     * @returns Presigned upload URL and expiration
     */
    async getPresignedUploadUrl(
        key: string, 
        options: PresignOptions = {}
    ): Promise<{ url: string; expiresAt: Date }> {
        const { expiresIn = this.defaultPresignExpiry, contentType, contentLength } = options;
        
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength
        });

        const url = await getSignedUrl(this.s3Client, command, { expiresIn });
        const expiresAt = new Date(Date.now() + (expiresIn * 1000));
        const publicUrl = this.rewriteToPublic(url);
        return { url: publicUrl, expiresAt };
    }

    /**
     * Generate presigned URL for downloading an object
     * @param key - Storage key/path
     * @param options - Presign options
     * @returns Presigned download URL and expiration
     */
    async getPresignedDownloadUrl(
        key: string,
        options: PresignOptions = {}
    ): Promise<{ url: string; expiresAt: Date }> {
        const { expiresIn = this.defaultPresignExpiry } = options;
        
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        const url = await getSignedUrl(this.s3Client, command, { expiresIn });
        const expiresAt = new Date(Date.now() + (expiresIn * 1000));
        const publicUrl = this.rewriteToPublic(url);
        return { url: publicUrl, expiresAt };
    }

    /**
     * Check if object exists and get metadata
     * @param key - Storage key/path
     * @returns Object metadata or null if not found
     */
    async headObject(key: string): Promise<{
        contentLength?: number;
        contentType?: string;
        lastModified?: Date;
        etag?: string;
    } | null> {
        try {
            const command = new HeadObjectCommand({
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
        } catch (error: any) {
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
    async deleteObject(key: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key
            });

            await this.s3Client.send(command);
            return true;
        } catch (error: any) {
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
    generateAssetKey(
        orgId: string,
        projectId: string, 
        assetId: string,
        version: number,
        filename: string,
        type: 'original' | 'rendition' = 'original',
        renditionName?: string
    ): string {
        const sanitizedFilename = this.sanitizeFilename(filename);
        const basePath = `org/${orgId}/proj/${projectId}/asset/${assetId}`;
        
        if (type === 'original') {
            return `${basePath}/original/v${version}/${sanitizedFilename}`;
        } else {
            return `${basePath}/renditions/${renditionName}/${sanitizedFilename}`;
        }
    }

    /**
     * Sanitize filename for storage
     * @param filename - Original filename
     * @returns Sanitized filename safe for storage
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .replace(/[^a-zA-Z0-9.\-_]/g, '_')  // Replace invalid chars with underscore
            .replace(/_{2,}/g, '_')              // Replace multiple underscores with single
            .substring(0, 255);                 // Limit length
    }

    /**
     * Get bucket name
     */
    getBucket(): string {
        return this.bucket;
    }
}

/**
 * Environment variable validation and parsing
 */
const getStorageConfig = (): StorageConfig => {
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

    const config: StorageConfig = {
        region: process.env.S3_REGION!,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
        },
        bucket: process.env.S3_BUCKET_NAME!
    };

    // Optional MinIO endpoint configuration
    if (process.env.S3_ENDPOINT) {
        config.endpoint = process.env.S3_ENDPOINT;
        config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false'; // Default true for MinIO
    }

    // Optional public endpoint for presigned URLs (host-accessible)
    if (process.env.S3_PUBLIC_ENDPOINT) {
        config.publicEndpoint = process.env.S3_PUBLIC_ENDPOINT;
    }

    return config;
};

/**
 * Global storage service instance
 * Singleton pattern for reusing S3 client connection
 */
let storageServiceInstance: StorageService | null = null;

/**
 * Get or create storage service instance
 * @returns StorageService singleton instance
 */
export const getStorageService = (): StorageService => {
    if (!storageServiceInstance) {
        const config = getStorageConfig();
        storageServiceInstance = new StorageService(config);
    }
    return storageServiceInstance;
};

/**
 * Storage utility functions
 */
export const StorageUtils = {
    /**
     * Parse storage key to extract components
     * @param key - Storage key to parse
     * @returns Parsed components or null if invalid format
     */
    parseStorageKey: (key: string): {
        orgId: string;
        projectId: string;
        assetId: string;
        type: 'original' | 'rendition';
        version?: number;
        renditionName?: string;
        filename: string;
    } | null => {
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
    validateFileExtension: (filename: string, mimeType: string): boolean => {
        const ext = filename.toLowerCase().split('.').pop() || '';
        const type = mimeType.toLowerCase();

        const extensionMap: Record<string, string[]> = {
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
    getAssetTypeFromMime: (mimeType: string): string => {
        const type = mimeType.toLowerCase();
        
        if (type.startsWith('image/')) return 'IMAGE';
        if (type.startsWith('video/')) return 'VIDEO'; 
        if (type.startsWith('audio/')) return 'AUDIO';
        if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'DOCUMENT';
        if (type.includes('zip') || type.includes('tar') || type.includes('archive')) return 'ARCHIVE';
        
        return 'OTHER';
    }
};

export default StorageService;
