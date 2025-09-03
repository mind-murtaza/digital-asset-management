/**
 * presentAsset - Convert a Mongoose Asset document into a plain JSON object
 * @param asset - Mongoose document or plain asset object
 * @returns Plain object with public asset fields and flattened metadata
 */
export function presentAsset(asset: any): Record<string, any> {
    const plain = typeof asset.toObject === 'function' ? asset.toObject() : asset;
    // Flatten customMetadata Map to plain object
    const customMetadataObj = plain.customMetadata instanceof Map
        ? Object.fromEntries(plain.customMetadata)
        : (plain.customMetadata || {});
    return {
        ...plain,
        assetType: plain.assetType?.toLowerCase() || plain.assetType,
        status: plain.status?.toLowerCase() || plain.status,
        organizationId: plain.organizationId?._id || plain.organizationId,
        projectId: plain.projectId?._id || plain.projectId,
        uploadedBy: plain.uploadedBy?._id || plain.uploadedBy,
        description: customMetadataObj.description,
        customMetadata: customMetadataObj
    };
}
