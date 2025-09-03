/**
 * @fileoverview Asset API Validation Schemas
 * Comprehensive Zod schemas for asset upload, management, and query validation
 * following the DAM API specification with strict type safety.
 */
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { AssetType, AssetStatus, StorageProvider, AccessLevel } from '../models/Asset.model';

extendZodWithOpenApi(z);

/**
 * Common validation patterns
 */
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format').openapi({
    type: 'string',
    pattern: '^[0-9a-fA-F]{24}$',
    description: 'MongoDB ObjectId',
    example: '64b123456789abcdef000001'
});

const checksumSchema = z.string().regex(/^[a-z0-9]+:[a-fA-F0-9]{64}$/, 'Invalid checksum format (algorithm:hash)').openapi({
    type: 'string',
    pattern: '^[a-z0-9]+:[a-fA-F0-9]{64}$',
    description: 'File checksum in format algorithm:hash',
    example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
});

const storageKeySchema = z.string().min(1).max(500).openapi({
    type: 'string',
    minLength: 1,
    maxLength: 500,
    description: 'Object storage key path',
    example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
});

const filenameSchema = z.string().min(1).max(255).regex(
    /^[^<>:"|?*\x00-\x1f]*$/,
    'Invalid filename characters'
).openapi({
    type: 'string',
    minLength: 1,
    maxLength: 255,
    description: 'Valid filename without illegal characters',
    example: 'hero-image.jpg'
});

const mimeTypeSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/).openapi({
    type: 'string',
    description: 'MIME type',
    example: 'image/jpeg'
});

const tagSchema = z.string().min(1).max(50).openapi({
    type: 'string',
    minLength: 1,
    maxLength: 50,
    description: 'Asset tag (will be trimmed)',
    example: 'brand'
}).transform(s => s.trim());

/**
 * Enum schemas with OpenAPI metadata
 */
const assetTypeSchema = z.nativeEnum(AssetType).openapi({
    description: 'Type of digital asset',
    example: AssetType.IMAGE
});

const assetStatusSchema = z.nativeEnum(AssetStatus).openapi({
    description: 'Current processing status of the asset',
    example: AssetStatus.COMPLETED
});

const storageProviderSchema = z.nativeEnum(StorageProvider).openapi({
    description: 'Cloud storage provider',
    example: StorageProvider.S3
});

const accessLevelSchema = z.nativeEnum(AccessLevel).openapi({
    description: 'Asset visibility and access level',
    example: AccessLevel.ORGANIZATION
});

/**
 * Asset Version schema (embedded document)
 */
const assetVersionSchema = z.object({
    version: z.number().int().min(1).openapi({
        description: 'Version number',
        example: 1
    }),
    storageKey: storageKeySchema.openapi({
        description: 'Storage key for this version',
        example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
    }),
    fileSizeBytes: z.number().int().min(0).openapi({
        description: 'File size in bytes',
        example: 2817345
    }),
    createdBy: objectIdSchema.openapi({
        description: 'User who created this version',
        example: '64b123456789abcdef000001'
    }),
    createdAt: z.date().openapi({
        description: 'Version creation timestamp',
        example: '2025-01-15T10:12:00.000Z'
    })
}).openapi({
    description: 'Asset version information'
});

/**
 * Renditions schema (embedded document)
 */
const renditionsSchema = z.object({
    thumbnail_small: z.object({
        storageKey: storageKeySchema,
        width: z.number().int().min(1),
        height: z.number().int().min(1)
    }).optional(),
    thumbnail_large: z.object({
        storageKey: storageKeySchema,
        width: z.number().int().min(1),
        height: z.number().int().min(1)
    }).optional(),
    preview_720p: z.object({
        storageKey: storageKeySchema,
        fileSizeBytes: z.number().int().min(0)
    }).optional()
}).openapi({
    description: 'Generated asset renditions and thumbnails'
});

/**
 * Asset metadata schema (embedded document)
 */
const assetMetadataSchema = z.object({
    width: z.number().int().min(1).optional().openapi({
        description: 'Image/video width in pixels',
        example: 3840
    }),
    height: z.number().int().min(1).optional().openapi({
        description: 'Image/video height in pixels', 
        example: 2160
    }),
    duration: z.number().min(0).optional().openapi({
        description: 'Audio/video duration in seconds',
        example: 120.5
    }),
    codec: z.string().max(50).optional().openapi({
        description: 'Media codec',
        example: 'h264'
    }),
    bitrate: z.number().int().min(0).optional().openapi({
        description: 'Media bitrate in bps',
        example: 8000000
    }),
    pageCount: z.number().int().min(1).optional().openapi({
        description: 'Number of pages (for documents)',
        example: 24
    })
}).openapi({
    description: 'Technical metadata extracted from the asset'
});

/**
 * Asset analytics schema
 */
const assetAnalyticsSchema = z.object({
    viewCount: z.number().int().min(0).default(0).openapi({
        description: 'Number of times asset was viewed',
        example: 42
    }),
    downloadCount: z.number().int().min(0).default(0).openapi({
        description: 'Number of times asset was downloaded',
        example: 7
    })
}).openapi({
    description: 'Usage analytics for the asset'
});

/**
 * Create Asset (Upload Request) Schema
 */
const createAssetSchema = z.object({
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
    fileSizeBytes: z.number().int().min(1).max(5 * 1024 * 1024 * 1024).openapi({ // 5GB limit
        description: 'File size in bytes (max 5GB)',
        example: 2817345
    }),
    checksum: checksumSchema.openapi({
        description: 'File checksum for integrity verification',
        example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
    }),
    tags: z.array(tagSchema).max(20).default([]).openapi({
        description: 'Asset tags for categorization (max 20)',
        example: ['homepage', 'brand', 'hero']
    }),
    access: accessLevelSchema.default(AccessLevel.PRIVATE).openapi({
        description: 'Asset access level',
        example: AccessLevel.ORGANIZATION
    }),
    customMetadata: z.record(z.string(), z.string().max(1000)).default({}).openapi({
        description: 'Custom key-value metadata',
        example: { 'license': 'royalty-free', 'photographer': 'John Doe' }
    })
}).openapi({
    description: 'Asset creation payload for upload initiation'
});

/**
 * Finalize Asset Upload Schema  
 */
const finalizeAssetSchema = z.object({
    assetId: objectIdSchema.openapi({
        description: 'Asset ID to finalize',
        example: '64b123456789abcdef000003'
    }),
    actualChecksum: checksumSchema.openapi({
        description: 'Actual checksum from uploaded file',
        example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
    }),
    actualFileSizeBytes: z.number().int().min(1).openapi({
        description: 'Actual file size from upload',
        example: 2817345
    })
}).openapi({
    description: 'Asset finalization payload after successful upload'
});

/**
 * Update Asset Schema
 */
const updateAssetSchema = z.object({
    tags: z.array(tagSchema).max(20).optional().openapi({
        description: 'Update asset tags',
        example: ['updated', 'brand', 'campaign']
    }),
    access: accessLevelSchema.optional().openapi({
        description: 'Update asset access level',
        example: AccessLevel.PUBLIC
    }),
    customMetadata: z.record(z.string(), z.string().max(1000)).optional().openapi({
        description: 'Update custom metadata',
        example: { 'campaign': '2025-spring', 'status': 'approved' }
    })
}).openapi({
    description: 'Asset update payload for modifying tags, access, or metadata (at least one field required)'
});

/**
 * Asset ID Parameter Schema
 */
const assetIdParamSchema = z.object({
    id: objectIdSchema.openapi({
        description: 'Asset ID',
        example: '64b123456789abcdef000003'
    })
}).openapi({
    description: 'Asset ID parameter'
})

/**
 * List Assets Query Schema
 */
const listAssetsQuerySchema = z.object({
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
        example: AssetType.IMAGE
    }),
    status: assetStatusSchema.optional().openapi({
        description: 'Filter by processing status',
        example: AssetStatus.COMPLETED
    }),
    access: accessLevelSchema.optional().openapi({
        description: 'Filter by access level',
        example: AccessLevel.ORGANIZATION
    }),
    tags: z.string().optional().openapi({
        description: 'Filter by tags (comma-separated)',
        example: 'brand,homepage'
    }).transform((tags) => 
        tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined
    ),
    search: z.string().min(1).max(100).optional().openapi({
        description: 'Search in filename and tags',
        example: 'hero image'
    }),
    createdAfter: z.string().datetime().optional().openapi({
        description: 'Filter assets created after this date',
        example: '2025-01-01T00:00:00.000Z'
    }),
    createdBefore: z.string().datetime().optional().openapi({
        description: 'Filter assets created before this date', 
        example: '2025-12-31T23:59:59.999Z'
    }),
    page: z.coerce.number().int().min(1).max(10000).default(1).openapi({
        description: 'Page number (1-based)',
        example: 1
    }),
    limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
        description: 'Number of assets per page (max 100)',
        example: 20
    }),
    sortBy: z.enum(['createdAt', 'updatedAt', 'originalFilename', 'fileSizeBytes']).default('updatedAt').openapi({
        description: 'Sort field',
        example: 'updatedAt'
    }),
    sortOrder: z.enum(['asc', 'desc']).default('desc').openapi({
        description: 'Sort order',
        example: 'desc'
    })
}).openapi({
    description: 'Query parameters for listing assets with pagination and filtering'
})

/**
 * Asset Response Schema (full asset details)
 */
const assetResponseSchema = z.object({
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
        example: AssetType.IMAGE
    }),
    fileSizeBytes: z.number().int().min(0).openapi({
        description: 'File size in bytes',
        example: 2817345
    }),
    checksum: checksumSchema.openapi({
        description: 'File checksum',
        example: 'sha256:8a9c4f2e1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c9f8e1b2d4a6c8e0f1b3d5a7c'
    }),
    status: assetStatusSchema.openapi({
        description: 'Processing status',
        example: AssetStatus.COMPLETED
    }),
    processingError: z.string().optional().openapi({
        description: 'Error message if processing failed',
        example: 'Failed to generate thumbnail: Unsupported format'
    }),
    storageProvider: storageProviderSchema.openapi({
        description: 'Storage provider',
        example: StorageProvider.S3
    }),
    storageKey: storageKeySchema.openapi({
        description: 'Storage key',
        example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
    }),
    latestVersion: z.number().int().min(1).openapi({
        description: 'Latest version number',
        example: 1
    }),
    versions: z.array(assetVersionSchema).openapi({
        description: 'Asset versions history',
        example: []
    }),
    tags: z.array(z.string()).openapi({
        description: 'Asset tags',
        example: ['homepage', 'brand', 'hero']
    }),
    metadata: assetMetadataSchema.optional().openapi({
        description: 'Technical metadata',
        example: { width: 3840, height: 2160, codec: 'jpeg' }
    }),
    customMetadata: z.record(z.string(), z.string()).openapi({
        description: 'Custom metadata',
        example: { 'license': 'royalty-free' }
    }),
    renditions: renditionsSchema.optional().openapi({
        description: 'Generated renditions',
        example: {}
    }),
    access: accessLevelSchema.openapi({
        description: 'Access level',
        example: AccessLevel.ORGANIZATION
    }),
    analytics: assetAnalyticsSchema.openapi({
        description: 'Usage analytics',
        example: { viewCount: 42, downloadCount: 7 }
    }),
    deletedAt: z.date().optional().openapi({
        description: 'Soft deletion timestamp',
        example: null
    }),
    createdAt: z.date().openapi({
        description: 'Creation timestamp',
        example: '2025-01-15T10:11:10.000Z'
    }),
    updatedAt: z.date().openapi({
        description: 'Last update timestamp',
        example: '2025-01-15T10:14:00.000Z'
    })
}).openapi({
    description: 'Complete asset information with all fields'
})

/**
 * Asset List Response Schema
 */
const assetListResponseSchema = z.object({
    success: z.boolean().default(true),
    data: z.object({
        assets: z.array(assetResponseSchema).openapi({
            description: 'Array of assets'
        }),
        pagination: z.object({
            total: z.number().int().min(0).openapi({
                description: 'Total number of assets matching filters',
                example: 150
            }),
            page: z.number().int().min(1).openapi({
                description: 'Current page number',
                example: 1
            }),
            limit: z.number().int().min(1).openapi({
                description: 'Assets per page',
                example: 20
            }),
            totalPages: z.number().int().min(0).openapi({
                description: 'Total number of pages',
                example: 8
            }),
            hasNext: z.boolean().openapi({
                description: 'Whether there are more pages',
                example: true
            }),
            hasPrev: z.boolean().openapi({
                description: 'Whether there are previous pages',
                example: false
            })
        }).openapi({
            description: 'Pagination information'
        })
    }),
    message: z.string().optional().openapi({
        description: 'Response message',
        example: 'Assets retrieved successfully'
    })
}).openapi({
    description: 'Asset list response with pagination metadata'
})
/**
 * Upload URL Response Schema
 */
const uploadUrlResponseSchema = z.object({
    success: z.boolean().default(true),
    data: z.object({
        assetId: objectIdSchema.openapi({
            description: 'Created asset ID',
            example: '64b123456789abcdef000003'
        }),
        uploadUrl: z.string().url().openapi({
            description: 'Presigned upload URL',
            example: 'https://minio.example.com/bucket/path?X-Amz-Signature=...'
        }),
        storageKey: storageKeySchema.openapi({
            description: 'Storage key for the asset',
            example: 'org/123/proj/456/asset/789/original/v1/hero.jpg'
        }),
        expiresAt: z.date().openapi({
            description: 'Upload URL expiration',
            example: '2025-01-15T11:11:10.000Z'
        })
    }),
    message: z.string().optional().openapi({
        description: 'Response message',
        example: 'Upload URL generated successfully'
    })
}).openapi({
    description: 'Presigned upload URL response for asset upload'
})
/**
 * Download URL Response Schema
 */
const downloadUrlResponseSchema = z.object({
    success: z.boolean().default(true),
    data: z.object({
        downloadUrl: z.string().url().openapi({
            description: 'Presigned download URL',
            example: 'https://minio.example.com/bucket/path?X-Amz-Signature=...'
        }),
        expiresAt: z.date().openapi({
            description: 'Download URL expiration',
            example: '2025-01-15T11:11:10.000Z'
        })
    }),
    message: z.string().optional().openapi({
        description: 'Response message',
        example: 'Download URL generated successfully'
    })
}).openapi({
    description: 'Presigned download URL response for asset access'
})

// Schema for adding tags to an asset
const addTagsSchema = z.object({
    tags: z.array(
        z.string()
         .min(1)
         .max(50)
         .regex(/^[a-z0-9-]+$/i, 'Invalid tag format')
         .transform(s => s.trim())
    ).max(10).openapi({
        description: 'Tags to add (max 10)',
        example: ['new-tag', 'another']
    })
}).openapi({
    description: 'Payload to add tags to an asset'
});

// Schema for replacing tags on an asset
const replaceTagsSchema = z.object({
    tags: z.array(
        z.string()
         .min(1)
         .max(50)
         .regex(/^[a-z0-9-]+$/i, 'Invalid tag format')
         .transform(s => s.trim())
    ).max(20).openapi({
        description: 'Tags to set on the asset (max 20)',
        example: ['tag1', 'tag2', 'tag3']
    })
}).openapi({
    description: 'Payload to replace all tags on an asset'
});

export {
    createAssetSchema,
    finalizeAssetSchema,
    updateAssetSchema,
    assetIdParamSchema,
    listAssetsQuerySchema,
    assetResponseSchema,
    assetListResponseSchema,
    uploadUrlResponseSchema,
    downloadUrlResponseSchema,
    addTagsSchema,
    replaceTagsSchema,
}


/**
 * Export all schemas for use in routes and services
 */
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type FinalizeAssetInput = z.infer<typeof finalizeAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetIdParam = z.infer<typeof assetIdParamSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
export type AssetResponse = z.infer<typeof assetResponseSchema>;
export type AssetListResponse = z.infer<typeof assetListResponseSchema>;
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type DownloadUrlResponse = z.infer<typeof downloadUrlResponseSchema>;
