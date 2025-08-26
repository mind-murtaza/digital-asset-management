/**
 * Sanitizers for API responses (TypeScript)
 */
function sanitizeUser(user: any) {
    if (!user) return null;
    const u = typeof user.toJSON === 'function' ? user.toJSON() : user;

    return {
        id: u.id || u._id?.toString?.(),
        email: u.email,
        status: u.status,
        fullName: u.fullName,
        initials: u.initials,
        profile: {
            firstName: u.profile?.firstName ?? null,
            lastName: u.profile?.lastName ?? null,
        },
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
    };
}

const apiSanitizers = { sanitizeUser };
export = apiSanitizers;
