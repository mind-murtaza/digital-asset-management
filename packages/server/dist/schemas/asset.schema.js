"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadUrlResponseSchema = exports.uploadUrlResponseSchema = exports.assetListResponseSchema = exports.assetResponseSchema = exports.listAssetsQuerySchema = exports.assetIdParamSchema = exports.updateAssetSchema = exports.finalizeAssetSchema = exports.createAssetSchema = void 0;
/**
 * @fileoverview Asset API Validation Schemas
 * Comprehensive Zod schemas for asset upload, management, and query validation
 * following the DAM API specification with strict type safety.
 */
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const Asset_model_1 = require("../models/Asset.model");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
/**
 * Common validation patterns
 */
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format').openapi({
    type: 'string',
    pattern: '^[0-9a-fA-F]{24}$',
    description: 'MongoDB ObjectId',
    example: '64b123456789abcdef000001'
});
const checksumSchema = zod_1.z.string().regex(/^[a-z0-9]+:[a-fA-F0-9]{64}$/, 'Invalid checksum format (algorithm:hash)').openapi({
    type: 'string',
    pattern: '^[a-z0-9]+:[a-fA-F0-9]{64}$',
    description: 'File checksum in format algorithm:hash',
    example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
});
const storageKeySchema = zod_1.z.string().min(1).max(500).openapi({
    type: 'string',
    minLength: 1,
    maxLength: 500,
    description: 'Object storage key path',
    example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
});
const filenameSchema = zod_1.z.string().min(1).max(255).regex(/^[^<>:"|?*\x00-\x1f]*$/, 'Invalid filename characters').openapi({
    type: 'string',
    minLength: 1,
    maxLength: 255,
    description: 'Valid filename without illegal characters',
    example: 'hero-image.jpg'
});
const mimeTypeSchema = zod_1.z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/).openapi({
    type: 'string',
    description: 'MIME type',
    example: 'image/jpeg'
});
const tagSchema = zod_1.z.string().min(1).max(50).openapi({
    type: 'string',
    minLength: 1,
    maxLength: 50,
    description: 'Asset tag (will be trimmed)',
    example: 'brand'
}).transform(s => s.trim());
/**
 * Enum schemas with OpenAPI metadata
 */
const assetTypeSchema = zod_1.z.nativeEnum(Asset_model_1.AssetType).openapi({
    description: 'Type of digital asset',
    example: Asset_model_1.AssetType.IMAGE
});
const assetStatusSchema = zod_1.z.nativeEnum(Asset_model_1.AssetStatus).openapi({
    description: 'Current processing status of the asset',
    example: Asset_model_1.AssetStatus.COMPLETED
});
const storageProviderSchema = zod_1.z.nativeEnum(Asset_model_1.StorageProvider).openapi({
    description: 'Cloud storage provider',
    example: Asset_model_1.StorageProvider.S3
});
const accessLevelSchema = zod_1.z.nativeEnum(Asset_model_1.AccessLevel).openapi({
    description: 'Asset visibility and access level',
    example: Asset_model_1.AccessLevel.ORGANIZATION
});
/**
 * Asset Version schema (embedded document)
 */
const assetVersionSchema = zod_1.z.object({
    version: zod_1.z.number().int().min(1).openapi({
        description: 'Version number',
        example: 1
    }),
    storageKey: storageKeySchema.openapi({
        description: 'Storage key for this version',
        example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
    }),
    fileSizeBytes: zod_1.z.number().int().min(0).openapi({
        description: 'File size in bytes',
        example: 2817345
    }),
    createdBy: objectIdSchema.openapi({
        description: 'User who created this version',
        example: '64b123456789abcdef000001'
    }),
    createdAt: zod_1.z.date().openapi({
        description: 'Version creation timestamp',
        example: '2025-01-15T10:12:00.000Z'
    })
}).openapi({
    description: 'Asset version information'
});
/**
 * Renditions schema (embedded document)
 */
const renditionsSchema = zod_1.z.object({
    thumbnail_small: zod_1.z.object({
        storageKey: storageKeySchema,
        width: zod_1.z.number().int().min(1),
        height: zod_1.z.number().int().min(1)
    }).optional(),
    thumbnail_large: zod_1.z.object({
        storageKey: storageKeySchema,
        width: zod_1.z.number().int().min(1),
        height: zod_1.z.number().int().min(1)
    }).optional(),
    preview_720p: zod_1.z.object({
        storageKey: storageKeySchema,
        fileSizeBytes: zod_1.z.number().int().min(0)
    }).optional()
}).openapi({
    description: 'Generated asset renditions and thumbnails'
});
/**
 * Asset metadata schema (embedded document)
 */
const assetMetadataSchema = zod_1.z.object({
    width: zod_1.z.number().int().min(1).optional().openapi({
        description: 'Image/video width in pixels',
        example: 3840
    }),
    height: zod_1.z.number().int().min(1).optional().openapi({
        description: 'Image/video height in pixels',
        example: 2160
    }),
    duration: zod_1.z.number().min(0).optional().openapi({
        description: 'Audio/video duration in seconds',
        example: 120.5
    }),
    codec: zod_1.z.string().max(50).optional().openapi({
        description: 'Media codec',
        example: 'h264'
    }),
    bitrate: zod_1.z.number().int().min(0).optional().openapi({
        description: 'Media bitrate in bps',
        example: 8000000
    }),
    pageCount: zod_1.z.number().int().min(1).optional().openapi({
        description: 'Number of pages (for documents)',
        example: 24
    })
}).openapi({
    description: 'Technical metadata extracted from the asset'
});
/**
 * Asset analytics schema
 */
const assetAnalyticsSchema = zod_1.z.object({
    viewCount: zod_1.z.number().int().min(0).default(0).openapi({
        description: 'Number of times asset was viewed',
        example: 42
    }),
    downloadCount: zod_1.z.number().int().min(0).default(0).openapi({
        description: 'Number of times asset was downloaded',
        example: 7
    })
}).openapi({
    description: 'Usage analytics for the asset'
});
/**
 * Create Asset (Upload Request) Schema
 */
const createAssetSchema = zod_1.z.object({
    organizationId: objectIdSchema.openapi({
        description: 'Organization ID',
        example: '64b123456789abcdef000001'
    }),
    projectId: objectIdSchema.openapi({
        description: 'Project ID where asset belongs',
        example: '64b123456789abcdef000002'
    }),
    originalFilename: filenameSchema.openapi({
        description: 'Original filename from upload',
        example: 'hero-image.jpg'
    }),
    mimeType: mimeTypeSchema.openapi({
        description: 'MIME type of the asset',
        example: 'image/jpeg'
    }),
    fileSizeBytes: zod_1.z.number().int().min(1).max(5 * 1024 * 1024 * 1024).openapi({
        description: 'File size in bytes (max 5GB)',
        example: 2817345
    }),
    checksum: checksumSchema.openapi({
        description: 'File checksum for integrity verification',
        example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
    }),
    tags: zod_1.z.array(tagSchema).max(20).default([]).openapi({
        description: 'Asset tags for categorization (max 20)',
        example: ['homepage', 'brand', 'hero']
    }),
    access: accessLevelSchema.default(Asset_model_1.AccessLevel.PRIVATE).openapi({
        description: 'Asset access level',
        example: Asset_model_1.AccessLevel.ORGANIZATION
    }),
    customMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string().max(1000)).default({}).openapi({
        description: 'Custom key-value metadata',
        example: { 'license': 'royalty-free', 'photographer': 'John Doe' }
    })
}).openapi({
    description: 'Asset creation payload for upload initiation'
});
exports.createAssetSchema = createAssetSchema;
/**
 * Finalize Asset Upload Schema
 */
const finalizeAssetSchema = zod_1.z.object({
    assetId: objectIdSchema.openapi({
        description: 'Asset ID to finalize',
        example: '64b123456789abcdef000003'
    }),
    actualChecksum: checksumSchema.openapi({
        description: 'Actual checksum from uploaded file',
        example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
    }),
    actualFileSizeBytes: zod_1.z.number().int().min(1).openapi({
        description: 'Actual file size from upload',
        example: 2817345
    })
}).openapi({
    description: 'Asset finalization payload after successful upload'
});
exports.finalizeAssetSchema = finalizeAssetSchema;
/**
 * Update Asset Schema
 */
const updateAssetSchema = zod_1.z.object({
    tags: zod_1.z.array(tagSchema).max(20).optional().openapi({
        description: 'Update asset tags',
        example: ['updated', 'brand', 'campaign']
    }),
    access: accessLevelSchema.optional().openapi({
        description: 'Update asset access level',
        example: Asset_model_1.AccessLevel.PUBLIC
    }),
    customMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string().max(1000)).optional().openapi({
        description: 'Update custom metadata',
        example: { 'campaign': '2025-spring', 'status': 'approved' }
    })
}).openapi({
    description: 'Asset update payload for modifying tags, access, or metadata (at least one field required)'
});
exports.updateAssetSchema = updateAssetSchema;
/**
 * Asset ID Parameter Schema
 */
const assetIdParamSchema = zod_1.z.object({
    id: objectIdSchema.openapi({
        description: 'Asset ID',
        example: '64b123456789abcdef000003'
    })
}).openapi({
    description: 'Asset ID parameter'
});
exports.assetIdParamSchema = assetIdParamSchema;
/**
 * List Assets Query Schema
 */
const listAssetsQuerySchema = zod_1.z.object({
    organizationId: objectIdSchema.openapi({
        description: 'Filter by organization ID',
        example: '64b123456789abcdef000001'
    }),
    projectId: objectIdSchema.optional().openapi({
        description: 'Filter by project ID',
        example: '64b123456789abcdef000002'
    }),
    assetType: assetTypeSchema.optional().openapi({
        description: 'Filter by asset type',
        example: Asset_model_1.AssetType.IMAGE
    }),
    status: assetStatusSchema.optional().openapi({
        description: 'Filter by processing status',
        example: Asset_model_1.AssetStatus.COMPLETED
    }),
    access: accessLevelSchema.optional().openapi({
        description: 'Filter by access level',
        example: Asset_model_1.AccessLevel.ORGANIZATION
    }),
    tags: zod_1.z.string().optional().openapi({
        description: 'Filter by tags (comma-separated)',
        example: 'brand,homepage'
    }).transform((tags) => tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined),
    search: zod_1.z.string().min(1).max(100).optional().openapi({
        description: 'Search in filename and tags',
        example: 'hero image'
    }),
    createdAfter: zod_1.z.string().datetime().optional().openapi({
        description: 'Filter assets created after this date',
        example: '2025-01-01T00:00:00.000Z'
    }),
    createdBefore: zod_1.z.string().datetime().optional().openapi({
        description: 'Filter assets created before this date',
        example: '2025-12-31T23:59:59.999Z'
    }),
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1).openapi({
        description: 'Page number (1-based)',
        example: 1
    }),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20).openapi({
        description: 'Number of assets per page (max 100)',
        example: 20
    }),
    sortBy: zod_1.z.enum(['createdAt', 'updatedAt', 'originalFilename', 'fileSizeBytes']).default('updatedAt').openapi({
        description: 'Sort field',
        example: 'updatedAt'
    }),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc').openapi({
        description: 'Sort order',
        example: 'desc'
    })
}).openapi({
    description: 'Query parameters for listing assets with pagination and filtering'
});
exports.listAssetsQuerySchema = listAssetsQuerySchema;
/**
 * Asset Response Schema (full asset details)
 */
const assetResponseSchema = zod_1.z.object({
    _id: objectIdSchema.openapi({
        description: 'Asset unique identifier',
        example: '64b123456789abcdef000003'
    }),
    organizationId: objectIdSchema.openapi({
        description: 'Organization ID',
        example: '64b123456789abcdef000001'
    }),
    projectId: objectIdSchema.openapi({
        description: 'Project ID',
        example: '64b123456789abcdef000002'
    }),
    uploadedBy: objectIdSchema.openapi({
        description: 'User who uploaded the asset',
        example: '64b123456789abcdef000004'
    }),
    originalFilename: filenameSchema.openapi({
        description: 'Original filename',
        example: 'hero-image.jpg'
    }),
    mimeType: mimeTypeSchema.openapi({
        description: 'MIME type',
        example: 'image/jpeg'
    }),
    assetType: assetTypeSchema.openapi({
        description: 'Asset type',
        example: Asset_model_1.AssetType.IMAGE
    }),
    fileSizeBytes: zod_1.z.number().int().min(0).openapi({
        description: 'File size in bytes',
        example: 2817345
    }),
    checksum: checksumSchema.openapi({
        description: 'File checksum',
        example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
    }),
    status: assetStatusSchema.openapi({
        description: 'Processing status',
        example: Asset_model_1.AssetStatus.COMPLETED
    }),
    processingError: zod_1.z.string().optional().openapi({
        description: 'Error message if processing failed',
        example: 'Failed to generate thumbnail: Unsupported format'
    }),
    storageProvider: storageProviderSchema.openapi({
        description: 'Storage provider',
        example: Asset_model_1.StorageProvider.S3
    }),
    storageKey: storageKeySchema.openapi({
        description: 'Storage key',
        example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
    }),
    latestVersion: zod_1.z.number().int().min(1).openapi({
        description: 'Latest version number',
        example: 1
    }),
    versions: zod_1.z.array(assetVersionSchema).openapi({
        description: 'Asset versions history',
        example: []
    }),
    tags: zod_1.z.array(zod_1.z.string()).openapi({
        description: 'Asset tags',
        example: ['homepage', 'brand', 'hero']
    }),
    metadata: assetMetadataSchema.optional().openapi({
        description: 'Technical metadata',
        example: { width: 3840, height: 2160, codec: 'jpeg' }
    }),
    customMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).openapi({
        description: 'Custom metadata',
        example: { 'license': 'royalty-free' }
    }),
    renditions: renditionsSchema.optional().openapi({
        description: 'Generated renditions',
        example: {}
    }),
    access: accessLevelSchema.openapi({
        description: 'Access level',
        example: Asset_model_1.AccessLevel.ORGANIZATION
    }),
    analytics: assetAnalyticsSchema.openapi({
        description: 'Usage analytics',
        example: { viewCount: 42, downloadCount: 7 }
    }),
    deletedAt: zod_1.z.date().optional().openapi({
        description: 'Soft deletion timestamp',
        example: null
    }),
    createdAt: zod_1.z.date().openapi({
        description: 'Creation timestamp',
        example: '2025-01-15T10:11:10.000Z'
    }),
    updatedAt: zod_1.z.date().openapi({
        description: 'Last update timestamp',
        example: '2025-01-15T10:14:00.000Z'
    })
}).openapi({
    description: 'Complete asset information with all fields'
});
exports.assetResponseSchema = assetResponseSchema;
/**
 * Asset List Response Schema
 */
const assetListResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean().default(true),
    data: zod_1.z.object({
        assets: zod_1.z.array(assetResponseSchema).openapi({
            description: 'Array of assets'
        }),
        pagination: zod_1.z.object({
            total: zod_1.z.number().int().min(0).openapi({
                description: 'Total number of assets matching filters',
                example: 150
            }),
            page: zod_1.z.number().int().min(1).openapi({
                description: 'Current page number',
                example: 1
            }),
            limit: zod_1.z.number().int().min(1).openapi({
                description: 'Assets per page',
                example: 20
            }),
            totalPages: zod_1.z.number().int().min(0).openapi({
                description: 'Total number of pages',
                example: 8
            }),
            hasNext: zod_1.z.boolean().openapi({
                description: 'Whether there are more pages',
                example: true
            }),
            hasPrev: zod_1.z.boolean().openapi({
                description: 'Whether there are previous pages',
                example: false
            })
        }).openapi({
            description: 'Pagination information'
        })
    }),
    message: zod_1.z.string().optional().openapi({
        description: 'Response message',
        example: 'Assets retrieved successfully'
    })
}).openapi({
    description: 'Asset list response with pagination metadata'
});
exports.assetListResponseSchema = assetListResponseSchema;
/**
 * Upload URL Response Schema
 */
const uploadUrlResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean().default(true),
    data: zod_1.z.object({
        assetId: objectIdSchema.openapi({
            description: 'Created asset ID',
            example: '64b123456789abcdef000003'
        }),
        uploadUrl: zod_1.z.string().url().openapi({
            description: 'Presigned upload URL',
            example: 'https://minio.example.com/bucket/path?X-Amz-Signature=...'
        }),
        storageKey: storageKeySchema.openapi({
            description: 'Storage key for the asset',
            example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
        }),
        expiresAt: zod_1.z.date().openapi({
            description: 'Upload URL expiration',
            example: '2025-01-15T11:11:10.000Z'
        })
    }),
    message: zod_1.z.string().optional().openapi({
        description: 'Response message',
        example: 'Upload URL generated successfully'
    })
}).openapi({
    description: 'Presigned upload URL response for asset upload'
});
exports.uploadUrlResponseSchema = uploadUrlResponseSchema;
/**
 * Download URL Response Schema
 */
const downloadUrlResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean().default(true),
    data: zod_1.z.object({
        downloadUrl: zod_1.z.string().url().openapi({
            description: 'Presigned download URL',
            example: 'https://minio.example.com/bucket/path?X-Amz-Signature=...'
        }),
        expiresAt: zod_1.z.date().openapi({
            description: 'Download URL expiration',
            example: '2025-01-15T11:11:10.000Z'
        })
    }),
    message: zod_1.z.string().optional().openapi({
        description: 'Response message',
        example: 'Download URL generated successfully'
    })
}).openapi({
    description: 'Presigned download URL response for asset access'
});
exports.downloadUrlResponseSchema = downloadUrlResponseSchema;
