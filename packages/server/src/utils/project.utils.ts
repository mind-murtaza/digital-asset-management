function computeParentPath(fullPath: string): string {
    const normalized = String(fullPath || '').trim();
    if (!normalized || normalized === '/') return '/';
    const idx = normalized.lastIndexOf('/');
    if (idx <= 0) return '/';
    return normalized.slice(0, idx);
}

export default computeParentPath;
