"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @fileoverview Asset API Routes
 * Comprehensive asset management endpoints with proper validation and authentication
 * Following RESTful conventions with additional asset-specific operations.
 */
const express_1 = require("express");
const auth_1 = __importDefault(require("../middlewares/auth"));
const validate_1 = require("../middlewares/validate");
const asset_controller_1 = __importDefault(require("../../controllers/asset.controller"));
const asset_schema_1 = require("../../schemas/asset.schema");
const router = (0, express_1.Router)();
// All asset routes require authentication
router.use(auth_1.default);
/**
 * @swagger
 * /api/v1/assets/uploads:
 *   post:
 *     summary: Create asset upload request
 *     description: Creates asset record and generates presigned upload URL
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAsset'
 *     responses:
 *       201:
 *         description: Upload URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadUrlResponse'
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Duplicate asset (checksum exists)
 *       401:
 *         description: Unauthorized
 */
router.post('/uploads', (0, validate_1.validate)(asset_schema_1.createAssetSchema), asset_controller_1.default.createUpload);
/**
 * @swagger
 * /api/v1/assets/{id}/finalize:
 *   post:
 *     summary: Finalize asset upload
 *     description: Validates uploaded file and triggers processing pipeline
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FinalizeAsset'
 *     responses:
 *       200:
 *         description: Asset upload finalized successfully
 *       400:
 *         description: Validation failed or file not found
 *       403:
 *         description: Not authorized to finalize this asset
 *       404:
 *         description: Asset not found
 */
router.post('/:id/finalize', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), (0, validate_1.validate)(asset_schema_1.finalizeAssetSchema), asset_controller_1.default.finalizeUpload);
/**
 * @swagger
 * /api/v1/assets:
 *   get:
 *     summary: List assets
 *     description: Retrieve assets with filtering, pagination, and sorting
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Organization ID filter
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Project ID filter
 *       - in: query
 *         name: assetType
 *         schema:
 *           type: string
 *           enum: [IMAGE, VIDEO, DOCUMENT, AUDIO, ARCHIVE, OTHER]
 *         description: Asset type filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [uploading, pending, processing, completed, failed]
 *         description: Processing status filter
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags to filter by
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in filename and tags
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Assets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssetListResponse'
 */
router.get('/', (0, validate_1.validate)(asset_schema_1.listAssetsQuerySchema, 'query'), asset_controller_1.default.list);
/**
 * @swagger
 * /api/v1/assets/analytics:
 *   get:
 *     summary: Get asset analytics
 *     description: Retrieve analytics summary for organization assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Organization ID
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Optional project ID filter
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       403:
 *         description: Access denied to organization analytics
 */
router.get('/analytics', asset_controller_1.default.getAnalytics);
/**
 * @swagger
 * /api/v1/assets/search:
 *   get:
 *     summary: Search assets
 *     description: Search assets by text in filename, tags, and metadata
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Organization ID filter
 *     responses:
 *       200:
 *         description: Search completed successfully
 */
router.get('/search', asset_controller_1.default.search);
/**
 * @swagger
 * /api/v1/assets/recent:
 *   get:
 *     summary: Get recent assets
 *     description: Retrieve assets from the last 30 days
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Organization ID filter
 *     responses:
 *       200:
 *         description: Recent assets retrieved successfully
 */
router.get('/recent', asset_controller_1.default.getRecent);
/**
 * @swagger
 * /api/v1/assets/by-project/{projectId}:
 *   get:
 *     summary: Get assets by project
 *     description: Retrieve all assets belonging to a specific project
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project assets retrieved successfully
 */
router.get('/by-project/:projectId', asset_controller_1.default.getByProject);
/**
 * @swagger
 * /api/v1/assets/by-tag/{tag}:
 *   get:
 *     summary: Get assets by tag
 *     description: Retrieve all assets with a specific tag
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag name
 *     responses:
 *       200:
 *         description: Tagged assets retrieved successfully
 */
router.get('/by-tag/:tag', asset_controller_1.default.getByTag);
/**
 * @swagger
 * /api/v1/assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     description: Retrieve asset details with optional view count increment
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *       - in: query
 *         name: view
 *         schema:
 *           type: boolean
 *         description: Whether to increment view count
 *     responses:
 *       200:
 *         description: Asset retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     asset:
 *                       $ref: '#/components/schemas/AssetResponse'
 *       404:
 *         description: Asset not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), asset_controller_1.default.getById);
/**
 * @swagger
 * /api/v1/assets/{id}/download:
 *   get:
 *     summary: Get download URL
 *     description: Generate presigned download URL for asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Download URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DownloadUrlResponse'
 *       400:
 *         description: Asset not ready for download
 *       403:
 *         description: No permission to download
 *       404:
 *         description: Asset not found
 */
router.get('/:id/download', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), asset_controller_1.default.getDownloadUrl);
/**
 * @swagger
 * /api/v1/assets/{id}:
 *   patch:
 *     summary: Update asset metadata
 *     description: Update asset tags, access level, or custom metadata
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAsset'
 *     responses:
 *       200:
 *         description: Asset updated successfully
 *       403:
 *         description: No permission to edit asset
 *       404:
 *         description: Asset not found
 */
router.patch('/:id', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), (0, validate_1.validate)(asset_schema_1.updateAssetSchema), asset_controller_1.default.update);
/**
 * @swagger
 * /api/v1/assets/{id}/tags:
 *   post:
 *     summary: Add tags to asset
 *     description: Add new tags to existing asset tags
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 description: Tags to add
 *             required: [tags]
 *     responses:
 *       200:
 *         description: Tags added successfully
 */
router.post('/:id/tags', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), asset_controller_1.default.addTags);
/**
 * @swagger
 * /api/v1/assets/{id}/tags:
 *   put:
 *     summary: Replace asset tags
 *     description: Replace all existing tags with new tags
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 20
 *                 description: New tags to set
 *             required: [tags]
 *     responses:
 *       200:
 *         description: Tags updated successfully
 */
router.put('/:id/tags', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), asset_controller_1.default.replaceTags);
/**
 * @swagger
 * /api/v1/assets/{id}/retry:
 *   post:
 *     summary: Retry failed processing
 *     description: Retry processing for failed assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Processing retry initiated successfully
 *       400:
 *         description: Asset not in failed status
 *       403:
 *         description: No permission to retry processing
 *       404:
 *         description: Asset not found
 */
router.post('/:id/retry', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), asset_controller_1.default.retryProcessing);
/**
 * @swagger
 * /api/v1/assets/{id}:
 *   delete:
 *     summary: Delete asset
 *     description: Soft delete asset and queue storage cleanup
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Asset ID
 *     responses:
 *       204:
 *         description: Asset deleted successfully
 *       403:
 *         description: No permission to delete asset
 *       404:
 *         description: Asset not found
 */
router.delete('/:id', (0, validate_1.validate)(asset_schema_1.assetIdParamSchema, 'params'), asset_controller_1.default.softDelete);
exports.default = router;
