/**
 * @fileoverview Asset Controller - HTTP Request Handling Layer
 * Thin HTTP layer for asset management operations
 * Handles request validation, delegates to service layer, and formats responses.
 */
import type { Request, Response, NextFunction } from 'express';
const assetService = require('../services/asset.service');

/**
 * Forward asset-specific errors with proper status codes and formatting
 * @param err - Error object
 * @param next - Express next function
 */
function forwardAssetError(err: any, next: NextFunction) {
    // Handle MongoDB duplicate key errors
    if (err && (err.code === 11000 || err.code === 11001)) {
        err.status = err.status || 409;
        err.message = err.message || 'Duplicate asset';
        err.code = err.code || 'DUPLICATE_ASSET';
    }

    // Handle asset-specific business logic errors
    if (err.code === 'DUPLICATE_ASSET') {
        err.status = 409;
    } else if (err.code === 'ASSET_NOT_FOUND') {
        err.status = 404;
    } else if (err.code === 'ACCESS_DENIED' || err.code === 'UNAUTHORIZED_FINALIZE') {
        err.status = 403;
    } else if (err.code === 'UPLOAD_URL_EXPIRED') {
        err.status = 410;
    } else if (err.code === 'PROCESSING_ERROR') {
        err.status = 422;
    }

    // Default to 500 if no status set
    if (!err.status) {
        err.status = 500;
        err.code = err.code || 'ASSET_CONTROLLER_ERROR';
    }

    return next(err);
}

/**
 * Create asset upload request and generate presigned URL
 * POST /api/v1/assets/uploads
 */
async function createUpload(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await assetService.createUpload(req.body, (req as any).auth);
        res.status(201).json({ 
            success: true, 
            data: {
                assetId: result.asset._id,
                uploadUrl: result.uploadUrl,
                storageKey: result.storageKey,
                expiresAt: result.expiresAt
            },
            message: 'Upload URL generated successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Finalize asset upload after successful upload to storage
 * POST /api/v1/assets/:id/finalize
 */
async function finalizeUpload(req: Request, res: Response, next: NextFunction) {
    try {
        const payload = {
            assetId: (req.params as any).id,
            ...req.body
        };
        const result = await assetService.finalizeUpload(payload, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Asset upload finalized successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * List assets with filtering and pagination
 * GET /api/v1/assets
 */
async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await assetService.list(req.query as any, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Assets retrieved successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Get asset by ID with optional view count increment
 * GET /api/v1/assets/:id
 */
async function getById(req: Request, res: Response, next: NextFunction) {
    try {
        const incrementView = (req.query as any).view === 'true';
        const result = await assetService.getById((req.params as any).id, (req as any).auth, incrementView);
        res.json({ 
            success: true, 
            data: result,
            message: 'Asset retrieved successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Update asset metadata (tags, access, custom metadata)
 * PATCH /api/v1/assets/:id
 */
async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await assetService.update((req.params as any).id, req.body, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Asset updated successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Generate presigned download URL for asset
 * GET /api/v1/assets/:id/download
 */
async function getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await assetService.getDownloadUrl((req.params as any).id, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Download URL generated successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Soft delete asset
 * DELETE /api/v1/assets/:id
 */
async function softDelete(req: Request, res: Response, next: NextFunction) {
    try {
        await assetService.softDelete((req.params as any).id, (req as any).auth);
        res.status(204).send();
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Get asset analytics for organization
 * GET /api/v1/assets/analytics
 */
async function getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
        const { organizationId, projectId } = req.query as any;
        const result = await assetService.getAnalytics(organizationId, projectId, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Analytics retrieved successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Retry failed asset processing
 * POST /api/v1/assets/:id/retry
 */
async function retryProcessing(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await assetService.retryProcessing((req.params as any).id, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Processing retry initiated successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Add tags to asset
 * POST /api/v1/assets/:id/tags
 */
async function addTags(req: Request, res: Response, next: NextFunction) {
    try {
        // Get current asset
        const currentAsset = await assetService.getById((req.params as any).id, (req as any).auth);
        const existingTags = currentAsset.asset.tags || [];
        const newTags = req.body.tags || [];
        
        // Merge tags (removing duplicates)
        const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
        
        const result = await assetService.update(
            (req.params as any).id, 
            { tags: mergedTags }, 
            (req as any).auth
        );
        
        res.json({ 
            success: true, 
            data: result,
            message: 'Tags added successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Replace all tags on asset
 * PUT /api/v1/assets/:id/tags
 */
async function replaceTags(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await assetService.update(
            (req.params as any).id, 
            { tags: req.body.tags || [] }, 
            (req as any).auth
        );
        res.json({ 
            success: true, 
            data: result,
            message: 'Tags updated successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Search assets by text (filename, tags, metadata)
 * GET /api/v1/assets/search
 */
async function search(req: Request, res: Response, next: NextFunction) {
    try {
        const searchQuery = {
            ...req.query,
            search: (req.query as any).q || (req.query as any).search
        } as any;
        
        const result = await assetService.list(searchQuery, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Search completed successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Get assets by project
 * GET /api/v1/assets/by-project/:projectId
 */
async function getByProject(req: Request, res: Response, next: NextFunction) {
    try {
        const query = {
            ...req.query,
            projectId: (req.params as any).projectId
        } as any;
        
        const result = await assetService.list(query, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Project assets retrieved successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Get assets by tag
 * GET /api/v1/assets/by-tag/:tag
 */
async function getByTag(req: Request, res: Response, next: NextFunction) {
    try {
        const query = {
            ...req.query,
            tags: [(req.params as any).tag]
        } as any;
        
        const result = await assetService.list(query, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Tagged assets retrieved successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Get recent assets (last 30 days)
 * GET /api/v1/assets/recent
 */
async function getRecent(req: Request, res: Response, next: NextFunction) {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const query = {
            ...req.query,
            createdAfter: thirtyDaysAgo.toISOString(),
            sortBy: 'createdAt',
            sortOrder: 'desc'
        } as any;
        
        const result = await assetService.list(query, (req as any).auth);
        res.json({ 
            success: true, 
            data: result,
            message: 'Recent assets retrieved successfully'
        });
    } catch (err) {
        forwardAssetError(err, next);
    }
}

/**
 * Export controller functions
 */
const controller = {
    createUpload,
    finalizeUpload,
    list,
    getById,
    update,
    getDownloadUrl,
    softDelete,
    getAnalytics,
    retryProcessing,
    addTags,
    replaceTags,
    search,
    getByProject,
    getByTag,
    getRecent
};

export = controller;
