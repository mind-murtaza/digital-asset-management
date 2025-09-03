"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Asset = exports.AccessLevel = exports.StorageProvider = exports.AssetStatus = exports.AssetType = void 0;
/**
 * @fileoverview Asset Model - Digital Asset Management
 * Comprehensive asset model with versioning, renditions, and metadata support.
 * Implements the complete Asset lifecycle from upload to processing completion.
 */
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Asset type enumeration for categorizing digital assets
 */
var AssetType;
(function (AssetType) {
    AssetType["IMAGE"] = "IMAGE";
    AssetType["VIDEO"] = "VIDEO";
    AssetType["DOCUMENT"] = "DOCUMENT";
    AssetType["AUDIO"] = "AUDIO";
    AssetType["ARCHIVE"] = "ARCHIVE";
    AssetType["OTHER"] = "OTHER";
})(AssetType || (exports.AssetType = AssetType = {}));
/**
 * Asset processing status throughout the upload and processing pipeline
 */
var AssetStatus;
(function (AssetStatus) {
    AssetStatus["UPLOADING"] = "uploading";
    AssetStatus["PENDING"] = "pending";
    AssetStatus["PROCESSING"] = "processing";
    AssetStatus["COMPLETED"] = "completed";
    AssetStatus["FAILED"] = "failed";
})(AssetStatus || (exports.AssetStatus = AssetStatus = {}));
/**
 * Storage provider options for multi-cloud support
 */
var StorageProvider;
(function (StorageProvider) {
    StorageProvider["MINIO"] = "minio";
    StorageProvider["S3"] = "s3";
    StorageProvider["GCS"] = "gcs";
})(StorageProvider || (exports.StorageProvider = StorageProvider = {}));
/**
 * Access level for asset visibility control
 */
var AccessLevel;
(function (AccessLevel) {
    AccessLevel["PRIVATE"] = "private";
    AccessLevel["ORGANIZATION"] = "organization";
    AccessLevel["PUBLIC"] = "public";
})(AccessLevel || (exports.AccessLevel = AccessLevel = {}));
/**
 * Asset Version embedded schema
 */
const AssetVersionSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
const RenditionsSchema = new mongoose_1.Schema({
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
const AssetMetadataSchema = new mongoose_1.Schema({
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
const AssetAnalyticsSchema = new mongoose_1.Schema({
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 }
}, { _id: false });
/**
 * Main Asset schema with comprehensive indexing and validation
 */
const AssetSchema = new mongoose_1.Schema({
    // References
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    projectId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    uploadedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            validator: function (tags) {
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
AssetSchema.index({ organizationId: 1, checksum: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: { $exists: false } }
});
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
AssetSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};
/**
 * Check if asset is deleted
 */
AssetSchema.methods.isDeleted = function () {
    return !!this.deletedAt;
};
/**
 * Add a new version to the asset
 * @param storageKey - Storage key for the new version
 * @param fileSizeBytes - File size in bytes
 * @param createdBy - User who created this version
 */
AssetSchema.methods.addVersion = function (storageKey, fileSizeBytes, createdBy) {
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
AssetSchema.methods.incrementViewCount = function () {
    this.analytics.viewCount += 1;
    return this.save();
};
/**
 * Increment download count
 */
AssetSchema.methods.incrementDownloadCount = function () {
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
AssetSchema.statics.findByChecksum = function (organizationId, checksum) {
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
AssetSchema.statics.findByProject = function (organizationId, projectId, options = {}) {
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
AssetSchema.pre('save', function (next) {
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
exports.Asset = mongoose_1.default.model('Asset', AssetSchema);
exports.default = exports.Asset;
