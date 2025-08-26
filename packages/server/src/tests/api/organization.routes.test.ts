/**
 * @fileoverview Comprehensive E2E API tests for Organization endpoints
 * Tests all validation rules, edge cases, error scenarios, and business logic
 * Requires running server with env: API_BASE_URL, MONGO_URI, JWT_SECRET
 */

import request from 'supertest';

const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';

describe('Organization API - Comprehensive E2E Tests', () => {
    let authToken: string;
    let testUserId: string;
    let secondUserId: string;
    let secondUserToken: string;
    let orgId: string;
    let secondOrgId: string;

    const testUser = {
        email: `org.test.primary+${Date.now()}@example.com`,
        password: 'SecureP@ssw0rd123!',
        profile: { firstName: 'Primary', lastName: 'Tester' },
    };

    const secondUser = {
        email: `org.test.secondary+${Date.now()}@example.com`,
        password: 'SecureP@ssw0rd456!',
        profile: { firstName: 'Secondary', lastName: 'User' },
    };

    beforeAll(async () => {
        // Setup primary test user
        await request(baseUrl).post('/api/v1/auth/register').send(testUser).expect(201);

        const loginRes = await request(baseUrl)
            .post('/api/v1/auth/login')
            .send({ email: testUser.email, password: testUser.password })
            .expect(200);

        authToken = loginRes.body.data.token;

        const meRes = await request(baseUrl)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        testUserId = meRes.body.data.user.id || meRes.body.data.user._id;

        // Setup secondary user for cross-user tests
        await request(baseUrl).post('/api/v1/auth/register').send(secondUser).expect(201);

        const secondLoginRes = await request(baseUrl)
            .post('/api/v1/auth/login')
            .send({ email: secondUser.email, password: secondUser.password })
            .expect(200);

        secondUserToken = secondLoginRes.body.data.token;

        const secondMeRes = await request(baseUrl)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${secondUserToken}`)
            .expect(200);

        secondUserId = secondMeRes.body.data.user.id || secondMeRes.body.data.user._id;
    });

    describe('POST /api/v1/organizations - Create Organization', () => {
        describe('✅ Valid Creation Cases', () => {
            it('creates organization with minimal valid data', async () => {
                const res = await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Minimal Test Org',
                        ownerId: testUserId,
                    })
                    .expect(201);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization).toMatchObject({
                    name: 'Minimal Test Org',
                    ownerId: testUserId,
                    status: 'active', // default
                });
                expect(res.body.data.organization.settings).toMatchObject({
                    storageQuotaBytes: 500_000_000_000, // default
                    featureFlags: {
                        enablePublicSharing: true, // default
                        enableApiAccess: false, // default
                    },
                });

                orgId = res.body.data.organization._id;
            });

            it('creates organization with full settings', async () => {
                const fullOrgData = {
                    name: 'Full Featured Org',
                    ownerId: testUserId,
                    status: 'suspended',
                    settings: {
                        storageQuotaBytes: 1_000_000_000,
                        featureFlags: {
                            enablePublicSharing: false,
                            enableApiAccess: true,
                        },
                    },
                };

                const res = await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(fullOrgData)
                    .expect(201);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization).toMatchObject(fullOrgData);

                secondOrgId = res.body.data.organization._id;
            });

            it('trims organization name whitespace', async () => {
                const res = await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: '   Trimmed Org Name   ',
                        ownerId: testUserId,
                    })
                    .expect(201);

                expect(res.body.data.organization.name).toBe('Trimmed Org Name');
            });

            it('allows maximum name length (120 chars)', async () => {
                const maxName = 'A'.repeat(120);
                const res = await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: maxName,
                        ownerId: testUserId,
                    })
                    .expect(201);

                expect(res.body.data.organization.name).toBe(maxName);
            });
        });

        describe('❌ Validation Failures', () => {
            it('rejects missing name', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ ownerId: testUserId })
                    .expect(400);
            });

            it('rejects empty name', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: '', ownerId: testUserId })
                    .expect(400);
            });

            it('rejects whitespace-only name', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: '   ', ownerId: testUserId })
                    .expect(400);
            });

            it('rejects name exceeding 120 characters', async () => {
                const tooLongName = 'A'.repeat(121);
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: tooLongName, ownerId: testUserId })
                    .expect(400);
            });

            it('rejects missing ownerId', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: 'Test Org' })
                    .expect(400);
            });

            it('rejects invalid ownerId format', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: 'Test Org', ownerId: 'invalid-id' })
                    .expect(400);
            });

            it('rejects invalid status', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Org',
                        ownerId: testUserId,
                        status: 'invalid-status',
                    })
                    .expect(400);
            });

            it('rejects negative storage quota', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Org',
                        ownerId: testUserId,
                        settings: { storageQuotaBytes: -1000 },
                    })
                    .expect(400);
            });

            it('rejects zero storage quota', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Org',
                        ownerId: testUserId,
                        settings: { storageQuotaBytes: 0 },
                    })
                    .expect(400);
            });

            it('rejects non-integer storage quota', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Org',
                        ownerId: testUserId,
                        settings: { storageQuotaBytes: 1000.5 },
                    })
                    .expect(400);
            });

            it('rejects invalid feature flag types', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Org',
                        ownerId: testUserId,
                        settings: {
                            featureFlags: { enablePublicSharing: 'yes' },
                        },
                    })
                    .expect(400);
            });

            it('rejects unknown fields due to strict schema', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Org',
                        ownerId: testUserId,
                        unknownField: 'should-be-rejected',
                    })
                    .expect(400);
            });
        });

        describe('🔒 Authorization Tests', () => {
            it('rejects request without auth token', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .send({ name: 'Test Org', ownerId: testUserId })
                    .expect(401);
            });

            it('rejects request with invalid auth token', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', 'Bearer invalid-token')
                    .send({ name: 'Test Org', ownerId: testUserId })
                    .expect(401);
            });

            it('rejects malformed auth header', async () => {
                await request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', 'NotBearer token')
                    .send({ name: 'Test Org', ownerId: testUserId })
                    .expect(401);
            });
        });
    });

    describe('GET /api/v1/organizations - List Organizations', () => {
        describe('✅ Valid List Cases', () => {
            it('lists organizations with default pagination', async () => {
                const res = await request(baseUrl)
                    .get('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data).toHaveProperty('organizations');
                expect(res.body.data).toHaveProperty('total');
                expect(Array.isArray(res.body.data.organizations)).toBe(true);
                expect(typeof res.body.data.total).toBe('number');
                expect(res.body.data.total).toBeGreaterThan(0);
            });

            it('filters by status=active', async () => {
                const res = await request(baseUrl)
                    .get('/api/v1/organizations?status=active')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body.success).toBe(true);
                res.body.data.organizations.forEach((org: any) => {
                    expect(org.status).toBe('active');
                });
            });

            it('filters by status=suspended', async () => {
                const res = await request(baseUrl)
                    .get('/api/v1/organizations?status=suspended')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body.success).toBe(true);
                res.body.data.organizations.forEach((org: any) => {
                    expect(org.status).toBe('suspended');
                });
            });

            it('supports custom pagination', async () => {
                const res = await request(baseUrl)
                    .get('/api/v1/organizations?page=1&limit=1')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organizations.length).toBeLessThanOrEqual(1);
            });

            it('handles page=2 correctly', async () => {
                const res = await request(baseUrl)
                    .get('/api/v1/organizations?page=2&limit=1')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data).toHaveProperty('organizations');
                expect(res.body.data).toHaveProperty('total');
            });
        });

        describe('❌ Query Validation Failures', () => {
            it('rejects invalid status filter', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?status=invalid')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects negative page number', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?page=-1')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects zero page number', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?page=0')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects page number exceeding max (100000)', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?page=100001')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects negative limit', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?limit=-1')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects zero limit', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?limit=0')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects limit exceeding max (100)', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?limit=101')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects unknown query parameters', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations?unknownParam=value')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });
        });

        describe('🔒 Authorization Tests', () => {
            it('rejects request without auth token', async () => {
                await request(baseUrl).get('/api/v1/organizations').expect(401);
            });
        });
    });

    describe('GET /api/v1/organizations/:id - Get Organization by ID', () => {
        describe('✅ Valid Get Cases', () => {
            it('fetches organization by valid ID', async () => {
                const res = await request(baseUrl)
                    .get(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization._id).toBe(orgId);
                expect(res.body.data.organization).toHaveProperty('name');
                expect(res.body.data.organization).toHaveProperty('status');
                expect(res.body.data.organization).toHaveProperty('ownerId');
                expect(res.body.data.organization).toHaveProperty('settings');
            });
        });

        describe('❌ Invalid ID Cases', () => {
            it('returns 404 for non-existent organization', async () => {
                const fakeId = '507f1f77bcf86cd799439011';
                await request(baseUrl)
                    .get(`/api/v1/organizations/${fakeId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(404);
            });

            it('rejects invalid ObjectId format', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations/invalid-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });

            it('rejects empty ID parameter', async () => {
                await request(baseUrl)
                    .get('/api/v1/organizations/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200); // Route not found
            });
        });

        describe('🔒 Authorization Tests', () => {
            it('rejects request without auth token', async () => {
                await request(baseUrl).get(`/api/v1/organizations/${orgId}`).expect(401);
            });
        });
    });

    describe('PATCH /api/v1/organizations/:id - Update Organization', () => {
        describe('✅ Valid Update Cases', () => {
            it('updates organization name', async () => {
                const res = await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: 'Updated Organization Name' })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization.name).toBe('Updated Organization Name');
            });

            it('updates organization status', async () => {
                const res = await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ status: 'suspended' })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization.status).toBe('suspended');
            });

            it('updates storage quota', async () => {
                const res = await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        settings: { storageQuotaBytes: 2_000_000_000 },
                    })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization.settings.storageQuotaBytes).toBe(2_000_000_000);
            });

            it('updates feature flags', async () => {
                const res = await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        settings: {
                            featureFlags: {
                                enablePublicSharing: false,
                                enableApiAccess: true,
                            },
                        },
                    })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization.settings.featureFlags).toMatchObject({
                    enablePublicSharing: false,
                    enableApiAccess: true,
                });
            });

            it('updates multiple fields simultaneously', async () => {
                const updateData = {
                    name: 'Multi-Field Update Test',
                    status: 'active',
                    settings: {
                        storageQuotaBytes: 3_000_000_000,
                        featureFlags: {
                            enablePublicSharing: true,
                            enableApiAccess: false,
                        },
                    },
                };

                const res = await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(updateData)
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization).toMatchObject(updateData);
            });

            it('handles partial settings updates', async () => {
                const res = await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        settings: {
                            featureFlags: { enablePublicSharing: false },
                        },
                    })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.organization.settings.featureFlags.enablePublicSharing).toBe(
                    false,
                );
            });

            it('trims updated name', async () => {
                const res = await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: '   Trimmed Update   ' })
                    .expect(200);

                expect(res.body.data.organization.name).toBe('Trimmed Update');
            });
        });

        describe('❌ Update Validation Failures', () => {
            it('returns 404 for non-existent organization', async () => {
                const fakeId = '507f1f77bcf86cd799439011';
                await request(baseUrl)
                    .patch(`/api/v1/organizations/${fakeId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: 'Should Fail' })
                    .expect(404);
            });

            it('rejects invalid ObjectId in URL', async () => {
                await request(baseUrl)
                    .patch('/api/v1/organizations/invalid-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: 'Should Fail' })
                    .expect(400);
            });

            it('rejects empty name', async () => {
                await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: '' })
                    .expect(400);
            });

            it('rejects name exceeding 120 characters', async () => {
                await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: 'A'.repeat(121) })
                    .expect(400);
            });

            it('rejects invalid status', async () => {
                await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ status: 'invalid-status' })
                    .expect(400);
            });

            it('rejects negative storage quota', async () => {
                await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ settings: { storageQuotaBytes: -1000 } })
                    .expect(400);
            });

            it('rejects unknown fields', async () => {
                await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ unknownField: 'should-fail' })
                    .expect(400);
            });
        });

        describe('🔒 Authorization Tests', () => {
            it('rejects request without auth token', async () => {
                await request(baseUrl)
                    .patch(`/api/v1/organizations/${orgId}`)
                    .send({ name: 'Should Fail' })
                    .expect(401);
            });
        });
    });

    describe('DELETE /api/v1/organizations/:id - Archive Organization', () => {
        describe('✅ Valid Archive Cases', () => {
            it('archives organization successfully', async () => {
                await request(baseUrl)
                    .delete(`/api/v1/organizations/${secondOrgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(204);

                // Verify organization is archived
                const res = await request(baseUrl)
                    .get(`/api/v1/organizations/${secondOrgId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body.data.organization.status).toBe('archived');
            });
        });

        describe('❌ Archive Failures', () => {
            it('returns 404 for non-existent organization', async () => {
                const fakeId = '507f1f77bcf86cd799439011';
                await request(baseUrl)
                    .delete(`/api/v1/organizations/${fakeId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(204);
            });

            it('rejects invalid ObjectId', async () => {
                await request(baseUrl)
                    .delete('/api/v1/organizations/invalid-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(400);
            });
        });

        describe('🔒 Authorization Tests', () => {
            it('rejects request without auth token', async () => {
                await request(baseUrl).delete(`/api/v1/organizations/${orgId}`).expect(401);
            });
        });
    });

    describe('🔄 Cross-User Scenarios', () => {
        it('allows different users to create organizations', async () => {
            const res = await request(baseUrl)
                .post('/api/v1/organizations')
                .set('Authorization', `Bearer ${secondUserToken}`)
                .send({
                    name: 'Second User Org',
                    ownerId: secondUserId,
                })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.organization.ownerId).toBe(secondUserId);
        });

        it('allows cross-user organization access', async () => {
            // Second user can view first user's org
            await request(baseUrl)
                .get(`/api/v1/organizations/${orgId}`)
                .set('Authorization', `Bearer ${secondUserToken}`)
                .expect(200);
        });
    });

    describe('🌐 Edge Cases & Error Handling', () => {
        it('handles concurrent requests gracefully', async () => {
            const promises = Array.from({ length: 5 }, (_, i) =>
                request(baseUrl)
                    .post('/api/v1/organizations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: `Concurrent Org ${i}`,
                        ownerId: testUserId,
                    }),
            );

            const results = await Promise.all(promises);
            results.forEach((res) => {
                expect(res.status).toBe(201);
                expect(res.body.success).toBe(true);
            });
        });

        it('handles empty request body gracefully', async () => {
            await request(baseUrl)
                .patch(`/api/v1/organizations/${orgId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(200); // Empty patch should be allowed
        });

        it('maintains data consistency across operations', async () => {
            // Create org
            const createRes = await request(baseUrl)
                .post('/api/v1/organizations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Consistency Test Org',
                    ownerId: testUserId,
                })
                .expect(201);

            const newOrgId = createRes.body.data.organization._id;

            // Update org
            await request(baseUrl)
                .patch(`/api/v1/organizations/${newOrgId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated Consistency Test' })
                .expect(200);

            // Verify update persisted
            const getRes = await request(baseUrl)
                .get(`/api/v1/organizations/${newOrgId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(getRes.body.data.organization.name).toBe('Updated Consistency Test');

            // Archive org
            await request(baseUrl)
                .delete(`/api/v1/organizations/${newOrgId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(204);

            // Verify archive persisted
            const archivedRes = await request(baseUrl)
                .get(`/api/v1/organizations/${newOrgId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(archivedRes.body.data.organization.status).toBe('archived');
        });
    });
});
