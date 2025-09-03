"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function computeParentPath(fullPath) {
    const normalized = String(fullPath || '').trim();
    if (!normalized || normalized === '/')
        return '/';
    const idx = normalized.lastIndexOf('/');
    if (idx <= 0)
        return '/';
    return normalized.slice(0, idx);
}
exports.default = computeParentPath;
