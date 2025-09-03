/**
 * @fileoverview Asset DAO - Database operations for Asset management
 * Comprehensive data access layer for asset CRUD operations with MongoDB
 * including complex queries, aggregations, and asset relationship management.
 */
import Asset, { type IAsset, AssetType, AssetStatus, AccessLevel, StorageProvider } from '../models/Asset.model';
import Organization from '../models/Organization.model';
import Project from '../models/Project.model';  
import User from '../models/User.model';
import dbError from '../utils/db.error';
import { Types } from 'mongoose';

/**
 * Asset list filter interface for flexible querying
 */
export interface AssetListFilter {
    organizationId?: string;
    projectId?: string;
    assetType?: AssetType;
    status?: AssetStatus;
    access?: AccessLevel;
    tags?: string[];
    search?: string;
    uploadedBy?: string;
    createdAfter?: Date;
    createdBefore?: Date;
}

/**
 * Asset list options for pagination and sorting
 */
export interface AssetListOptions {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'originalFilename' | 'fileSizeBytes';
    sortOrder?: 'asc' | 'desc';
    populate?: boolean;
}

/**
 * Asset creation data interface
 */
export interface CreateAssetData {
    organizationId: string;
    projectId: string;
    uploadedBy: string;
    originalFilename: string;
    mimeType: string;
    assetType: AssetType;
    fileSizeBytes: number;
    checksum: string;
    storageProvider: StorageProvider;
    storageKey: string;
    tags?: string[];
    access?: AccessLevel;
    customMetadata?: Record<string, string>;
}

/**
 * Asset update data interface
 */
export interface UpdateAssetData {
    tags?: string[];
    access?: AccessLevel;
    customMetadata?: Record<string, string>;
    status?: AssetStatus;
    processingError?: string;
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        codec?: string;
        bitrate?: number;
        pageCount?: number;
    };
    renditions?: any;
}

/**
 * Create new asset record
 * @param data - Asset creation data
 * @returns Created asset document
 */
async function createAsset(data: CreateAssetData): Promise<IAsset> {
    try {
        // Validate references exist
        const [organization, project, user] = await Promise.all([
            Organization.findById(data.organizationId),
            Project.findById(data.projectId),
            User.findById(data.uploadedBy)
        ]);

        if (!organization) {
            throw new Error('Organization not found');
        }
        if (!project) {
            throw new Error('Project not found');
        }
        if (!user) {
            throw new Error('User not found');
        }

        // Ensure project belongs to organization
        if (project.organizationId.toString() !== data.organizationId) {
            throw new Error('Project does not belong to the specified organization');
        }

        const asset = new Asset({
            ...data,
            versions: [{
                version: 1,
                storageKey: data.storageKey,
                fileSizeBytes: data.fileSizeBytes,
                createdBy: data.uploadedBy,
                createdAt: new Date()
            }],
            analytics: {
                viewCount: 0,
                downloadCount: 0
            }
        });

        await asset.save();
        return asset;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Create asset failed', 500, error);
    }
}

/**
 * Find asset by ID
 * @param id - Asset ID
 * @param populate - Whether to populate references
 * @returns Asset document or null
 */
async function findById(id: string, populate = false): Promise<IAsset | null> {
    try {
        let query = Asset.findById(id);
        
        if (populate) {
            query = query
                .populate('organizationId', 'name')
                .populate('projectId', 'name path')
                .populate('uploadedBy', 'name email')
                .populate('versions.createdBy', 'name email');
        }

        return await query.exec();
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find asset by ID failed', 500, error);
    }
}

/**
 * Find asset by checksum for deduplication
 * @param organizationId - Organization ID
 * @param checksum - Asset checksum
 * @returns Asset document or null
 */
async function findByChecksum(organizationId: string, checksum: string): Promise<IAsset | null> {
    try {
        return await Asset.findOne({
            organizationId,
            checksum,
            deletedAt: { $exists: false }
        });
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find asset by checksum failed', 500, error);
    }
}

/**
 * List assets with filtering, pagination, and sorting
 * @param filter - Asset filter criteria
 * @param options - List options (pagination, sorting)
 * @returns Assets list with pagination info
 */
async function list(
    filter: AssetListFilter = {},
    options: AssetListOptions = {}
): Promise<{ assets: IAsset[]; total: number; totalPages: number }> {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'updatedAt',
            sortOrder = 'desc',
            populate = false
        } = options;

        const skip = (page - 1) * limit;
        const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Build query
        const query: any = { deletedAt: { $exists: false } };

        if (filter.organizationId) {
            query.organizationId = filter.organizationId;
        }
        if (filter.projectId) {
            query.projectId = filter.projectId;
        }
        if (filter.assetType) {
            query.assetType = filter.assetType;
        }
        if (filter.status) {
            query.status = filter.status;
        }
        if (filter.access) {
            query.access = filter.access;
        }
        if (filter.uploadedBy) {
            query.uploadedBy = filter.uploadedBy;
        }
        if (filter.tags && filter.tags.length > 0) {
            query.tags = { $in: filter.tags };
        }
        if (filter.createdAfter || filter.createdBefore) {
            query.createdAt = {};
            if (filter.createdAfter) {
                query.createdAt.$gte = filter.createdAfter;
            }
            if (filter.createdBefore) {
                query.createdAt.$lte = filter.createdBefore;
            }
        }

        // Add text search if provided
        if (filter.search) {
            query.$or = [
                { originalFilename: { $regex: filter.search, $options: 'i' } },
                { tags: { $in: [new RegExp(filter.search, 'i')] } }
            ];
        }

        // Execute query
        let assetsQuery = Asset.find(query).sort(sort).skip(skip).limit(limit);
        
        if (populate) {
            assetsQuery = assetsQuery
                .populate('organizationId', 'name')
                .populate('projectId', 'name path')
                .populate('uploadedBy', 'name email');
        }

        const [assets, total] = await Promise.all([
            assetsQuery.exec(),
            Asset.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return { assets, total, totalPages };
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'List assets failed', 500, error);
    }
}

/**
 * Update asset by ID
 * @param id - Asset ID
 * @param data - Update data
 * @returns Updated asset document or null
 */
async function updateById(id: string, data: UpdateAssetData): Promise<IAsset | null> {
    try {
        const updateDoc: any = {};

        if (data.tags !== undefined) {
            updateDoc.tags = data.tags;
        }
        if (data.access !== undefined) {
            updateDoc.access = data.access;
        }
        if (data.customMetadata !== undefined) {
            updateDoc.customMetadata = data.customMetadata;
        }
        if (data.status !== undefined) {
            updateDoc.status = data.status;
        }
        if (data.processingError !== undefined) {
            updateDoc.processingError = data.processingError;
        }
        if (data.metadata !== undefined) {
            updateDoc.metadata = data.metadata;
        }
        if (data.renditions !== undefined) {
            updateDoc.renditions = data.renditions;
        }

        if (Object.keys(updateDoc).length === 0) {
            return await findById(id);
        }

        const asset = await Asset.findByIdAndUpdate(
            id,
            { $set: updateDoc },
            { new: true, runValidators: true }
        );

        return asset;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Update asset failed', 500, error);
    }
}

/**
 * Add new version to asset
 * @param id - Asset ID
 * @param storageKey - Storage key for new version
 * @param fileSizeBytes - File size in bytes
 * @param createdBy - User who created the version
 * @returns Updated asset document
 */
async function addVersion(
    id: string,
    storageKey: string,
    fileSizeBytes: number,
    createdBy: string
): Promise<IAsset | null> {
    try {
        const asset = await Asset.findById(id);
        if (!asset) return null;

        const newVersion = asset.latestVersion + 1;
        
        await Asset.findByIdAndUpdate(id, {
            $push: {
                versions: {
                    version: newVersion,
                    storageKey,
                    fileSizeBytes,
                    createdBy,
                    createdAt: new Date()
                }
            },
            $set: { latestVersion: newVersion }
        });

        return await findById(id);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Add asset version failed', 500, error);
    }
}

/**
 * Increment view count for asset analytics
 * @param id - Asset ID
 * @returns Updated asset document
 */
async function incrementViewCount(id: string): Promise<IAsset | null> {
    try {
        const asset = await Asset.findByIdAndUpdate(
            id,
            { $inc: { 'analytics.viewCount': 1 } },
            { new: true }
        );
        return asset;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Increment view count failed', 500, error);
    }
}

/**
 * Increment download count for asset analytics
 * @param id - Asset ID
 * @returns Updated asset document
 */
async function incrementDownloadCount(id: string): Promise<IAsset | null> {
    try {
        const asset = await Asset.findByIdAndUpdate(
            id,
            { $inc: { 'analytics.downloadCount': 1 } },
            { new: true }
        );
        return asset;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Increment download count failed', 500, error);
    }
}

/**
 * Soft delete asset by ID
 * @param id - Asset ID
 * @returns Success boolean
 */
async function softDeleteById(id: string): Promise<boolean> {
    try {
        const result = await Asset.updateOne(
            { _id: id },
            { $set: { deletedAt: new Date() } }
        );
        return result.matchedCount > 0;
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Soft delete asset failed', 500, error);
    }
}

/**
 * Find assets by project with pagination
 * @param organizationId - Organization ID
 * @param projectId - Project ID
 * @param options - List options
 * @returns Assets in the project
 */
async function findByProject(
    organizationId: string,
    projectId: string,
    options: AssetListOptions = {}
): Promise<{ assets: IAsset[]; total: number }> {
    try {
        return await list({ organizationId, projectId }, options);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find assets by project failed', 500, error);
    }
}

/**
 * Find assets by tag
 * @param organizationId - Organization ID
 * @param tag - Tag to search for
 * @param options - List options
 * @returns Assets with the specified tag
 */
async function findByTag(
    organizationId: string,
    tag: string,
    options: AssetListOptions = {}
): Promise<{ assets: IAsset[]; total: number }> {
    try {
        return await list({ organizationId, tags: [tag] }, options);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find assets by tag failed', 500, error);
    }
}

/**
 * Get asset analytics aggregation
 * @param organizationId - Organization ID
 * @param projectId - Optional project ID filter
 * @returns Asset analytics summary
 */
async function getAnalyticsSummary(
    organizationId: string,
    projectId?: string
): Promise<{
    totalAssets: number;
    totalSize: number;
    assetsByType: Record<string, number>;
    assetsByStatus: Record<string, number>;
    totalViews: number;
    totalDownloads: number;
}> {
    try {
        const matchStage: any = { 
            organizationId: new Types.ObjectId(organizationId),
            deletedAt: { $exists: false } 
        };
        
        if (projectId) {
            matchStage.projectId = new Types.ObjectId(projectId);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAssets: { $sum: 1 },
                    totalSize: { $sum: '$fileSizeBytes' },
                    assetsByType: {
                        $push: '$assetType'
                    },
                    assetsByStatus: {
                        $push: '$status'
                    },
                    totalViews: { $sum: '$analytics.viewCount' },
                    totalDownloads: { $sum: '$analytics.downloadCount' }
                }
            }
        ];

        const result = await Asset.aggregate(pipeline);
        
        if (result.length === 0) {
            return {
                totalAssets: 0,
                totalSize: 0,
                assetsByType: {},
                assetsByStatus: {},
                totalViews: 0,
                totalDownloads: 0
            };
        }

        const data = result[0];
        
        // Count occurrences for types and statuses
        const assetsByType = data.assetsByType.reduce((acc: any, type: string) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const assetsByStatus = data.assetsByStatus.reduce((acc: any, status: string) => {
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return {
            totalAssets: data.totalAssets,
            totalSize: data.totalSize,
            assetsByType,
            assetsByStatus,
            totalViews: data.totalViews,
            totalDownloads: data.totalDownloads
        };
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Get analytics summary failed', 500, error);
    }
}

/**
 * Find duplicate assets by checksum
 * @param organizationId - Organization ID
 * @returns Assets with duplicate checksums
 */
async function findDuplicateAssets(organizationId: string): Promise<IAsset[]> {
    try {
        const pipeline = [
            {
                $match: {
                    organizationId: new Types.ObjectId(organizationId),
                    deletedAt: { $exists: false }
                }
            },
            {
                $group: {
                    _id: '$checksum',
                    count: { $sum: 1 },
                    assets: { $push: '$$ROOT' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            },
            {
                $unwind: '$assets'
            },
            {
                $replaceRoot: { newRoot: '$assets' }
            }
        ];

        return await Asset.aggregate(pipeline);
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find duplicate assets failed', 500, error);
    }
}

/**
 * Get assets requiring processing (status = pending or failed with retry)
 * @param limit - Maximum number of assets to return
 * @returns Assets that need processing
 */
async function findAssetsRequiringProcessing(limit = 50): Promise<IAsset[]> {
    try {
        return await Asset.find({
            $or: [
                { status: AssetStatus.PENDING },
                { 
                    status: AssetStatus.FAILED,
                    updatedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes ago
                }
            ],
            deletedAt: { $exists: false }
        })
        .sort({ createdAt: 1 })
        .limit(limit)
        .populate('organizationId', 'name')
        .populate('projectId', 'name path');
    } catch (error: any) {
        throw dbError('DATABASE_ERROR', 'Find assets requiring processing failed', 500, error);
    }
}

/**
 * Export all DAO functions
 */
export default {
    createAsset,
    findById,
    findByChecksum,
    list,
    updateById,
    addVersion,
    incrementViewCount,
    incrementDownloadCount,
    softDeleteById,
    findByProject,
    findByTag,
    getAnalyticsSummary,
    findDuplicateAssets,
    findAssetsRequiringProcessing
};
