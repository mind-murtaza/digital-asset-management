"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
/**
 * @fileoverview Asset Service - Business Logic Layer
 * Comprehensive asset management service handling upload, processing, and lifecycle
 * Orchestrates storage, queue processing, and database operations for digital assets.
 */
const asset_dao_1 = __importDefault(require("../dao/asset.dao"));
const storage_1 = require("../config/storage");
const queues_1 = require("../queues");
const Asset_model_1 = require("../models/Asset.model");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Asset service errors
 */
function assetNotFound() {
    const err = new Error('Asset not found');
    err.status = 404;
    err.code = 'ASSET_NOT_FOUND';
    return err;
}
function duplicateAssetError() {
    const err = new Error('Asset with same checksum already exists');
    err.status = 409;
    err.code = 'DUPLICATE_ASSET';
    return err;
}
function uploadUrlExpiredError() {
    const err = new Error('Upload URL has expired');
    err.status = 410;
    err.code = 'UPLOAD_URL_EXPIRED';
    return err;
}
function processingError(message) {
    const err = new Error(message);
    err.status = 422;
    err.code = 'PROCESSING_ERROR';
    return err;
}
/**
 * Generate unique asset ID with prefix
 * @returns Unique asset ID string
 */
function generateAssetId() {
    return `asset_${Date.now()}_${crypto_1.default.randomBytes(8).toString('hex')}`;
}
/**
 * Determine asset type from MIME type
 * @param mimeType - MIME type string
 * @returns AssetType enum value
 */
function determineAssetType(mimeType) {
    const type = mimeType.toLowerCase();
    if (type.startsWith('image/'))
        return Asset_model_1.AssetType.IMAGE;
    if (type.startsWith('video/'))
        return Asset_model_1.AssetType.VIDEO;
    if (type.startsWith('audio/'))
        return Asset_model_1.AssetType.AUDIO;
    if (type.includes('pdf') || type.includes('document') || type.includes('text'))
        return Asset_model_1.AssetType.DOCUMENT;
    if (type.includes('zip') || type.includes('tar') || type.includes('archive'))
        return Asset_model_1.AssetType.ARCHIVE;
    return Asset_model_1.AssetType.OTHER;
}
/**
 * Create asset upload request and generate presigned URL
 * @param payload - Asset creation data
 * @param auth - Authentication context
 * @returns Asset record and presigned upload URL
 */
async function createUpload(payload, auth) {
    try {
        const userId = String(auth.userId);
        const storage = (0, storage_1.getStorageService)();
        // Check for duplicate asset by checksum
        const existingAsset = await asset_dao_1.default.findByChecksum(payload.organizationId, payload.checksum);
        if (existingAsset) {
            throw duplicateAssetError();
        }
        // Validate file extension against MIME type
        if (!storage_1.StorageUtils.validateFileExtension(payload.originalFilename, payload.mimeType)) {
            const err = new Error('File extension does not match MIME type');
            err.status = 400;
            err.code = 'INVALID_FILE_EXTENSION';
            throw err;
        }
        // Generate unique asset ID and storage key
        const assetId = generateAssetId();
        const assetType = determineAssetType(payload.mimeType);
        const storageKey = storage.generateAssetKey(payload.organizationId, payload.projectId, assetId, 1, // version 1
        payload.originalFilename);
        // Create asset record in database
        const asset = await asset_dao_1.default.createAsset({
            organizationId: payload.organizationId,
            projectId: payload.projectId,
            uploadedBy: userId,
            originalFilename: payload.originalFilename,
            mimeType: payload.mimeType,
            assetType,
            fileSizeBytes: payload.fileSizeBytes,
            checksum: payload.checksum,
            storageProvider: Asset_model_1.StorageProvider.S3, // Default to S3/MinIO
            storageKey,
            tags: payload.tags || [],
            access: payload.access || Asset_model_1.AccessLevel.PRIVATE,
            customMetadata: payload.customMetadata || {}
        });
        // Generate presigned upload URL
        const { url: uploadUrl, expiresAt } = await storage.getPresignedUploadUrl(storageKey, {
            contentType: payload.mimeType,
            contentLength: payload.fileSizeBytes,
            expiresIn: 3600 // 1 hour
        });
        return {
            asset,
            uploadUrl,
            storageKey,
            expiresAt
        };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Asset upload creation failed');
        err.status = 500;
        err.code = 'ASSET_UPLOAD_CREATE_ERROR';
        throw err;
    }
}
/**
 * Finalize asset upload and trigger processing
 * @param payload - Finalization data
 * @param auth - Authentication context
 * @returns Updated asset record
 */
async function finalizeUpload(payload, auth) {
    try {
        const userId = String(auth.userId);
        const storage = (0, storage_1.getStorageService)();
        // Find the asset
        const asset = await asset_dao_1.default.findById(payload.assetId);
        if (!asset) {
            throw assetNotFound();
        }
        // Verify upload is from the same user
        if (asset.uploadedBy.toString() !== userId) {
            const err = new Error('Unauthorized to finalize this asset');
            err.status = 403;
            err.code = 'UNAUTHORIZED_FINALIZE';
            throw err;
        }
        // Verify asset is still in uploading status
        if (asset.status !== Asset_model_1.AssetStatus.UPLOADING) {
            const err = new Error('Asset is not in uploading status');
            err.status = 400;
            err.code = 'INVALID_ASSET_STATUS';
            throw err;
        }
        // Verify checksums match
        if (payload.actualChecksum !== asset.checksum) {
            const err = new Error('Checksum mismatch - upload integrity check failed');
            err.status = 400;
            err.code = 'CHECKSUM_MISMATCH';
            throw err;
        }
        // Verify file sizes match
        if (payload.actualFileSizeBytes !== asset.fileSizeBytes) {
            const err = new Error('File size mismatch');
            err.status = 400;
            err.code = 'FILE_SIZE_MISMATCH';
            throw err;
        }
        // Verify file exists in storage
        const headResult = await storage.headObject(asset.storageKey);
        if (!headResult) {
            const err = new Error('File not found in storage');
            err.status = 400;
            err.code = 'FILE_NOT_IN_STORAGE';
            throw err;
        }
        // Update asset status to pending
        const updatedAsset = await asset_dao_1.default.updateById(payload.assetId, {
            status: Asset_model_1.AssetStatus.PENDING
        });
        if (!updatedAsset) {
            throw assetNotFound();
        }
        // Queue processing job
        await queueProcessingJob(updatedAsset, userId);
        return { asset: updatedAsset };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Asset upload finalization failed');
        err.status = 500;
        err.code = 'ASSET_FINALIZE_ERROR';
        throw err;
    }
}
/**
 * Queue appropriate processing jobs based on asset type
 * @param asset - Asset to process
 * @param userId - User ID who triggered processing
 */
async function queueProcessingJob(asset, userId) {
    const jobData = {
        assetId: asset._id.toString(),
        organizationId: asset.organizationId.toString(),
        uploadedBy: userId,
        storageKey: asset.storageKey,
        originalFilename: asset.originalFilename,
        mimeType: asset.mimeType,
        fileSizeBytes: asset.fileSizeBytes
    };
    // Always start with metadata extraction
    const metadataJobData = {
        assetId: asset._id.toString(),
        organizationId: asset.organizationId.toString(),
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        originalFilename: asset.originalFilename
    };
    await queues_1.JobUtils.addExtractMetadataJob(metadataJobData);
    // Queue type-specific processing jobs
    switch (asset.assetType) {
        case Asset_model_1.AssetType.IMAGE:
            const imageJobData = {
                assetId: asset._id.toString(),
                organizationId: asset.organizationId.toString(),
                storageKey: asset.storageKey,
                mimeType: asset.mimeType
            };
            await queues_1.JobUtils.addGenerateThumbnailsJob(imageJobData);
            break;
        case Asset_model_1.AssetType.VIDEO:
            const videoJobData = {
                assetId: asset._id.toString(),
                organizationId: asset.organizationId.toString(),
                storageKey: asset.storageKey,
                targetResolutions: ['720p', '1080p'],
                extractPoster: true
            };
            await queues_1.JobUtils.addTranscodeVideoJob(videoJobData);
            break;
        // Other asset types can be added here
        default:
            // For other types, just process the main asset
            await queues_1.JobUtils.addProcessAssetJob(jobData);
            break;
    }
}
/**
 * Get asset by ID
 * @param id - Asset ID
 * @param auth - Authentication context
 * @param incrementView - Whether to increment view count
 * @returns Asset data
 */
async function getById(id, auth, incrementView = false) {
    try {
        const asset = await asset_dao_1.default.findById(id, true); // Populate references
        if (!asset) {
            throw assetNotFound();
        }
        // Verify user has access to the asset
        const hasAccess = await verifyAssetAccess(asset, auth);
        if (!hasAccess) {
            const err = new Error('Access denied to this asset');
            err.status = 403;
            err.code = 'ACCESS_DENIED';
            throw err;
        }
        // Increment view count if requested
        if (incrementView) {
            await asset_dao_1.default.incrementViewCount(id);
            asset.analytics.viewCount += 1;
        }
        return { asset };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Asset fetch failed');
        err.status = 500;
        err.code = 'ASSET_FETCH_ERROR';
        throw err;
    }
}
/**
 * List assets with filtering and pagination
 * @param query - List query parameters
 * @param auth - Authentication context
 * @returns Assets list with pagination
 */
async function list(query, auth) {
    try {
        // Ensure organization access
        const filter = {
            organizationId: query.organizationId,
            projectId: query.projectId,
            assetType: query.assetType,
            status: query.status,
            access: query.access,
            tags: query.tags,
            search: query.search,
            createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
            createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined
        };
        const options = {
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
            populate: true
        };
        const { assets, total, totalPages } = await asset_dao_1.default.list(filter, options);
        // Filter assets based on access permissions
        const accessibleAssets = await Promise.all(assets.map(async (asset) => {
            const hasAccess = await verifyAssetAccess(asset, auth);
            return hasAccess ? asset : null;
        }));
        const filteredAssets = accessibleAssets.filter(Boolean);
        return {
            assets: filteredAssets,
            pagination: {
                total: filteredAssets.length,
                page: query.page,
                limit: query.limit,
                totalPages: Math.ceil(filteredAssets.length / query.limit),
                hasNext: query.page < Math.ceil(filteredAssets.length / query.limit),
                hasPrev: query.page > 1
            }
        };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Asset list failed');
        err.status = 500;
        err.code = 'ASSET_LIST_ERROR';
        throw err;
    }
}
/**
 * Update asset metadata
 * @param id - Asset ID
 * @param payload - Update data
 * @param auth - Authentication context
 * @returns Updated asset
 */
async function update(id, payload, auth) {
    try {
        const asset = await asset_dao_1.default.findById(id);
        if (!asset) {
            throw assetNotFound();
        }
        // Verify user has edit access
        const hasAccess = await verifyAssetAccess(asset, auth, 'edit');
        if (!hasAccess) {
            const err = new Error('No permission to edit this asset');
            err.status = 403;
            err.code = 'EDIT_ACCESS_DENIED';
            throw err;
        }
        const updatedAsset = await asset_dao_1.default.updateById(id, payload);
        if (!updatedAsset) {
            throw assetNotFound();
        }
        return { asset: updatedAsset };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Asset update failed');
        err.status = 500;
        err.code = 'ASSET_UPDATE_ERROR';
        throw err;
    }
}
/**
 * Generate download URL for asset
 * @param id - Asset ID
 * @param auth - Authentication context
 * @returns Presigned download URL
 */
async function getDownloadUrl(id, auth) {
    try {
        const asset = await asset_dao_1.default.findById(id);
        if (!asset) {
            throw assetNotFound();
        }
        // Verify asset is completed
        if (asset.status !== Asset_model_1.AssetStatus.COMPLETED) {
            const err = new Error('Asset is not ready for download');
            err.status = 400;
            err.code = 'ASSET_NOT_READY';
            throw err;
        }
        // Verify user has download access
        const hasAccess = await verifyAssetAccess(asset, auth, 'download');
        if (!hasAccess) {
            const err = new Error('No permission to download this asset');
            err.status = 403;
            err.code = 'DOWNLOAD_ACCESS_DENIED';
            throw err;
        }
        const storage = (0, storage_1.getStorageService)();
        const { url: downloadUrl, expiresAt } = await storage.getPresignedDownloadUrl(asset.storageKey, {
            expiresIn: 300 // 5 minutes
        });
        // Increment download count
        await asset_dao_1.default.incrementDownloadCount(id);
        return { downloadUrl, expiresAt };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Download URL generation failed');
        err.status = 500;
        err.code = 'DOWNLOAD_URL_ERROR';
        throw err;
    }
}
/**
 * Soft delete asset and queue cleanup
 * @param id - Asset ID
 * @param auth - Authentication context
 */
async function softDelete(id, auth) {
    try {
        const asset = await asset_dao_1.default.findById(id);
        if (!asset) {
            throw assetNotFound();
        }
        // Verify user has delete access
        const hasAccess = await verifyAssetAccess(asset, auth, 'delete');
        if (!hasAccess) {
            const err = new Error('No permission to delete this asset');
            err.status = 403;
            err.code = 'DELETE_ACCESS_DENIED';
            throw err;
        }
        // Soft delete the asset
        const success = await asset_dao_1.default.softDeleteById(id);
        if (!success) {
            throw assetNotFound();
        }
        // Queue cleanup job for storage
        const cleanupJobData = {
            storageKeys: [asset.storageKey],
            assetId: id,
            reason: 'asset-deleted'
        };
        await queues_1.JobUtils.addCleanupJob(cleanupJobData, { delay: 24 * 60 * 60 * 1000 }); // 24 hour delay
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Asset delete failed');
        err.status = 500;
        err.code = 'ASSET_DELETE_ERROR';
        throw err;
    }
}
/**
 * Verify user has access to an asset
 * @param asset - Asset document
 * @param auth - Authentication context
 * @param action - Action being performed ('view', 'edit', 'download', 'delete')
 * @returns Whether user has access
 */
async function verifyAssetAccess(asset, auth, action = 'view') {
    const userId = String(auth.userId);
    const organizationId = String(auth.organizationId || '');
    // Owner always has access
    if (asset.uploadedBy.toString() === userId) {
        return true;
    }
    // Organization members have access to organization-level assets
    if (asset.access === Asset_model_1.AccessLevel.ORGANIZATION && asset.organizationId.toString() === organizationId) {
        return true;
    }
    // Public assets are viewable by anyone in the organization
    if (asset.access === Asset_model_1.AccessLevel.PUBLIC && action === 'view' && asset.organizationId.toString() === organizationId) {
        return true;
    }
    // Private assets only accessible by owner
    if (asset.access === Asset_model_1.AccessLevel.PRIVATE) {
        return asset.uploadedBy.toString() === userId;
    }
    return false;
}
/**
 * Get asset analytics for organization
 * @param organizationId - Organization ID
 * @param projectId - Optional project ID filter
 * @param auth - Authentication context
 * @returns Analytics summary
 */
async function getAnalytics(organizationId, projectId, auth) {
    try {
        // Verify organization access
        if (String(auth.organizationId || '') !== organizationId) {
            const err = new Error('Access denied to organization analytics');
            err.status = 403;
            err.code = 'ANALYTICS_ACCESS_DENIED';
            throw err;
        }
        const analytics = await asset_dao_1.default.getAnalyticsSummary(organizationId, projectId);
        return { analytics };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Analytics fetch failed');
        err.status = 500;
        err.code = 'ANALYTICS_FETCH_ERROR';
        throw err;
    }
}
/**
 * Retry failed asset processing
 * @param id - Asset ID
 * @param auth - Authentication context
 * @returns Updated asset
 */
async function retryProcessing(id, auth) {
    try {
        const asset = await asset_dao_1.default.findById(id);
        if (!asset) {
            throw assetNotFound();
        }
        // Verify access
        const hasAccess = await verifyAssetAccess(asset, auth, 'edit');
        if (!hasAccess) {
            const err = new Error('No permission to retry processing');
            err.status = 403;
            err.code = 'RETRY_ACCESS_DENIED';
            throw err;
        }
        // Only retry failed assets
        if (asset.status !== Asset_model_1.AssetStatus.FAILED) {
            const err = new Error('Asset is not in failed status');
            err.status = 400;
            err.code = 'INVALID_RETRY_STATUS';
            throw err;
        }
        // Update status to pending and clear error
        const updatedAsset = await asset_dao_1.default.updateById(id, {
            status: Asset_model_1.AssetStatus.PENDING,
            processingError: undefined
        });
        if (!updatedAsset) {
            throw assetNotFound();
        }
        // Queue processing job again
        await queueProcessingJob(updatedAsset, String(auth.userId));
        return { asset: updatedAsset };
    }
    catch (error) {
        if (error.status)
            throw error;
        const err = new Error('Retry processing failed');
        err.status = 500;
        err.code = 'RETRY_PROCESSING_ERROR';
        throw err;
    }
}
/**
 * Export all service functions
 */
const service = {
    createUpload,
    finalizeUpload,
    getById,
    list,
    update,
    getDownloadUrl,
    softDelete,
    getAnalytics,
    retryProcessing
};
module.exports = service;
