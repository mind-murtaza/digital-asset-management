/**
 * @fileoverview Asset Model - Digital Asset Management
 * Comprehensive asset model with versioning, renditions, and metadata support.
 * Implements the complete Asset lifecycle from upload to processing completion.
 */
import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Asset type enumeration for categorizing digital assets
 */
export enum AssetType {
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO', 
    DOCUMENT = 'DOCUMENT',
    AUDIO = 'AUDIO',
    ARCHIVE = 'ARCHIVE',
    OTHER = 'OTHER'
}

/**
 * Asset processing status throughout the upload and processing pipeline
 */
export enum AssetStatus {
    UPLOADING = 'uploading',
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

/**
 * Storage provider options for multi-cloud support
 */
export enum StorageProvider {
    MINIO = 'minio',
    S3 = 's3',
    GCS = 'gcs'
}

/**
 * Access level for asset visibility control
 */
export enum AccessLevel {
    PRIVATE = 'private',
    ORGANIZATION = 'organization', 
    PUBLIC = 'public'
}

/**
 * Asset version embedded document interface
 * Tracks different versions of the same asset
 */
export interface IAssetVersion {
    version: number;
    storageKey: string;
    fileSizeBytes: number;
    createdBy: Types.ObjectId;
    createdAt: Date;
}

/**
 * Asset rendition embedded document interface  
 * Stores processed variants like thumbnails and previews
 */
export interface IRenditions {
    thumbnail_small?: {
        storageKey: string;
        width: number;
        height: number;
    };
    thumbnail_large?: {
        storageKey: string;
        width: number;
        height: number;
    };
    preview_720p?: {
        storageKey: string;
        fileSizeBytes: number;
    };
}

/**
 * Asset metadata interface for technical properties
 */
export interface IAssetMetadata {
    width?: number;
    height?: number;
    duration?: number;
    codec?: string;
    bitrate?: number;
    pageCount?: number;
}

/**
 * Asset analytics interface for tracking usage metrics
 */
export interface IAssetAnalytics {
    viewCount: number;
    downloadCount: number;
}

/**
 * Main Asset document interface
 * Complete digital asset with all metadata, versions, and processing info
 */
export interface IAsset extends Document {
    // References
    organizationId: Types.ObjectId;
    projectId: Types.ObjectId;
    uploadedBy: Types.ObjectId;

    // Identity
    originalFilename: string;
    mimeType: string;
    assetType: AssetType;
    fileSizeBytes: number;
    checksum: string;

    // Status
    status: AssetStatus;
    processingError?: string;

    // Storage
    storageProvider: StorageProvider;
    storageKey: string;

    // Versions
    latestVersion: number;
    versions: IAssetVersion[];

    // Descriptors
    tags: string[];
    metadata?: IAssetMetadata;
    customMetadata: Map<string, string>;
    renditions?: IRenditions;

    // Access
    access: AccessLevel;

    // Analytics
    analytics: IAssetAnalytics;

    // Lifecycle
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Asset Version embedded schema
 */
const AssetVersionSchema = new Schema<IAssetVersion>({
    version: { 
        type: Number, 
        required: true 
    },
    storageKey: { 
        type: String, 
        required: true 
    },
    fileSizeBytes: { 
        type: Number, 
        required: true 
    },
    createdBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, { _id: false });

/**
 * Renditions embedded schema
 */
const RenditionsSchema = new Schema<IRenditions>({
    thumbnail_small: {
        storageKey: { type: String, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true }
    },
    thumbnail_large: {
        storageKey: { type: String, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true }
    },
    preview_720p: {
        storageKey: { type: String, required: true },
        fileSizeBytes: { type: Number, required: true }
    }
}, { _id: false });

/**
 * Asset metadata embedded schema
 */
const AssetMetadataSchema = new Schema<IAssetMetadata>({
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    codec: { type: String },
    bitrate: { type: Number },
    pageCount: { type: Number }
}, { _id: false });

/**
 * Asset analytics embedded schema
 */
const AssetAnalyticsSchema = new Schema<IAssetAnalytics>({
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 }
}, { _id: false });

/**
 * Main Asset schema with comprehensive indexing and validation
 */
const AssetSchema = new Schema<IAsset>({
    // References
    organizationId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Organization', 
        required: true 
    },
    projectId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },
    uploadedBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    // Identity
    originalFilename: { 
        type: String, 
        required: true,
        trim: true
    },
    mimeType: { 
        type: String, 
        required: true 
    },
    assetType: { 
        type: String, 
        enum: Object.values(AssetType),
        required: true 
    },
    fileSizeBytes: { 
        type: Number, 
        required: true,
        min: 0
    },
    checksum: { 
        type: String, 
        required: true 
    },

    // Status  
    status: { 
        type: String, 
        enum: Object.values(AssetStatus),
        default: AssetStatus.UPLOADING 
    },
    processingError: { 
        type: String,
        sparse: true 
    },

    // Storage
    storageProvider: { 
        type: String, 
        enum: Object.values(StorageProvider),
        required: true 
    },
    storageKey: { 
        type: String, 
        required: true 
    },

    // Versions
    latestVersion: { 
        type: Number, 
        default: 1,
        min: 1
    },
    versions: {
        type: [AssetVersionSchema],
        default: []
    },

    // Descriptors
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function(tags: string[]) {
                return tags.every(tag => tag.length > 0 && tag.length <= 50);
            },
            message: 'Tags must be between 1-50 characters'
        }
    },
    metadata: {
        type: AssetMetadataSchema,
        default: undefined
    },
    customMetadata: {
        type: Map,
        of: String,
        default: new Map()
    },
    renditions: {
        type: RenditionsSchema,
        default: undefined
    },

    // Access
    access: { 
        type: String, 
        enum: Object.values(AccessLevel),
        default: AccessLevel.PRIVATE 
    },

    // Analytics
    analytics: {
        type: AssetAnalyticsSchema,
        default: () => ({ viewCount: 0, downloadCount: 0 })
    },

    // Lifecycle
    deletedAt: { 
        type: Date,
        sparse: true
    }
}, {
    timestamps: true,
    collection: 'assets'
});

/**
 * Indexes for optimal query performance
 * Following the DB schema specifications for compound indexes
 */

// Primary query patterns
AssetSchema.index({ organizationId: 1, projectId: 1, status: 1, updatedAt: -1 });
AssetSchema.index({ organizationId: 1, assetType: 1, updatedAt: -1 });
AssetSchema.index({ organizationId: 1, access: 1, updatedAt: -1 });

// Uniqueness constraint for checksum (partial for non-deleted)
AssetSchema.index(
    { organizationId: 1, checksum: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { deletedAt: { $exists: false } }
    }
);

// Tag-based queries
AssetSchema.index({ organizationId: 1, tags: 1 });

// Time-based queries
AssetSchema.index({ organizationId: 1, createdAt: -1 });

// Status-based admin queries  
AssetSchema.index({ status: 1, updatedAt: -1 });

/**
 * Instance methods
 */

/**
 * Soft delete the asset by setting deletedAt timestamp
 */
AssetSchema.methods.softDelete = function() {
    this.deletedAt = new Date();
    return this.save();
};

/**
 * Check if asset is deleted
 */
AssetSchema.methods.isDeleted = function() {
    return !!this.deletedAt;
};

/**
 * Add a new version to the asset
 * @param storageKey - Storage key for the new version
 * @param fileSizeBytes - File size in bytes
 * @param createdBy - User who created this version
 */
AssetSchema.methods.addVersion = function(
    storageKey: string, 
    fileSizeBytes: number, 
    createdBy: Types.ObjectId
) {
    const newVersion = this.latestVersion + 1;
    this.versions.push({
        version: newVersion,
        storageKey,
        fileSizeBytes,
        createdBy,
        createdAt: new Date()
    });
    this.latestVersion = newVersion;
    return this.save();
};

/**
 * Increment view count
 */
AssetSchema.methods.incrementViewCount = function() {
    this.analytics.viewCount += 1;
    return this.save();
};

/**
 * Increment download count
 */
AssetSchema.methods.incrementDownloadCount = function() {
    this.analytics.downloadCount += 1;
    return this.save();
};

/**
 * Static methods
 */

/**
 * Find assets by checksum (for deduplication)
 * @param organizationId - Organization ID
 * @param checksum - Asset checksum
 */
AssetSchema.statics.findByChecksum = function(organizationId: Types.ObjectId, checksum: string) {
    return this.findOne({ 
        organizationId, 
        checksum, 
        deletedAt: { $exists: false } 
    });
};

/**
 * Find assets by project with pagination
 * @param organizationId - Organization ID
 * @param projectId - Project ID
 * @param options - Query options (skip, limit, sort)
 */
AssetSchema.statics.findByProject = function(
    organizationId: Types.ObjectId, 
    projectId: Types.ObjectId,
    options: { skip?: number; limit?: number; sort?: any } = {}
) {
    const { skip = 0, limit = 50, sort = { updatedAt: -1 } } = options;
    return this.find({ 
        organizationId, 
        projectId,
        deletedAt: { $exists: false }
    })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'name email')
    .populate('projectId', 'name path');
};

/**
 * Pre-save middleware to validate business rules
 */
AssetSchema.pre('save', function(next) {
    // Ensure latestVersion matches versions array
    if (this.versions.length > 0) {
        const maxVersion = Math.max(...this.versions.map(v => v.version));
        if (this.latestVersion !== maxVersion) {
            this.latestVersion = maxVersion;
        }
    }
    
    // Trim tags and remove empty ones
    this.tags = this.tags.filter(tag => tag.trim().length > 0).map(tag => tag.trim());
    
    next();
});

/**
 * Export Asset model
 */
export const Asset = mongoose.model<IAsset>('Asset', AssetSchema);
export default Asset;
