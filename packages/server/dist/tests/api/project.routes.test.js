"use strict";
/**
 * @fileoverview Comprehensive E2E API tests for Project endpoints
 * Requires running server with env: API_BASE_URL, MONGO_URI, JWT_SECRET
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
describe('Project API - Comprehensive E2E Tests', () => {
    let authToken;
    let userId;
    let orgId;
    let rootProjectId;
    let childProjectId;
    const user = {
        email: `proj.test+${Date.now()}@example.com`,
        password: 'SecureP@ssw0rd123!',
        profile: { firstName: 'Proj', lastName: 'Tester' },
    };
    beforeAll(async () => {
        await (0, supertest_1.default)(baseUrl).post('/api/v1/auth/register').send(user).expect(201);
        const loginRes = await (0, supertest_1.default)(baseUrl)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: user.password })
            .expect(200);
        authToken = loginRes.body.data.token;
        const meRes = await (0, supertest_1.default)(baseUrl)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        userId = meRes.body.data.user.id || meRes.body.data.user._id;
        const orgRes = await (0, supertest_1.default)(baseUrl)
            .post('/api/v1/organizations')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Project Test Org' })
            .expect(201);
        orgId = orgRes.body.data.organization._id;
    });
    describe('POST /api/v1/projects - Create Project', () => {
        it('creates a root-level project', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                organizationId: orgId,
                name: 'Bhagwan ji',
                path: '/Bhagwan-ji',
            })
                .expect(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.project.name).toBe('Bhagwan ji');
            expect(res.body.data.project.path).toBe('/Bhagwan-ji');
            rootProjectId = res.body.data.project._id;
        });
        it('rejects duplicate sibling name (case-insensitive) at same parent', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                organizationId: orgId,
                name: 'bhagwan ji',
                path: '/bhagwan-ji',
            })
                .expect(409);
        });
        it('creates a child project under /Bhagwan-ji', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                organizationId: orgId,
                name: 'Campaign A',
                path: '/Bhagwan-ji/Campaign-A',
                ancestors: [{ _id: rootProjectId, name: 'Bhagwan ji' }],
            })
                .expect(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.project.path).toBe('/Bhagwan-ji/Campaign-A');
            childProjectId = res.body.data.project._id;
        });
        it('allows same name in different parent paths', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                organizationId: orgId,
                name: 'Campaign A',
                path: '/AnotherParent/Campaign-A',
            })
                .expect(201);
            expect(res.body.success).toBe(true);
        });
        it('rejects invalid path format', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ organizationId: orgId, name: 'Bad', path: 'no-slash' })
                .expect(400);
        });
        // createdBy is derived from auth; no body createdBy validation
        it('rejects unknown fields', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                organizationId: orgId,
                name: 'X',
                path: '/X',
                foo: 'bar',
            })
                .expect(400);
        });
        it('rejects unauthenticated requests', async () => {
            await (0, supertest_1.default)(baseUrl).post('/api/v1/projects').send({}).expect(401);
        });
    });
    describe('GET /api/v1/projects - List Projects', () => {
        it('lists projects with defaults', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .get('/api/v1/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('projects');
            expect(res.body.data).toHaveProperty('total');
        });
        it('filters by organizationId', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .get(`/api/v1/projects?organizationId=${orgId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);
            res.body.data.projects.forEach((p) => expect(p.organizationId).toBe(orgId));
        });
        it('rejects invalid query params', async () => {
            await (0, supertest_1.default)(baseUrl)
                .get('/api/v1/projects?page=-1')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
        it('rejects unauthenticated requests', async () => {
            await (0, supertest_1.default)(baseUrl).get('/api/v1/projects').expect(401);
        });
    });
    describe('GET /api/v1/projects/resolve - Resolve by Path', () => {
        it('resolves project by path', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .get(`/api/v1/projects/resolve?organizationId=${orgId}&path=/Bhagwan-ji/Campaign-A`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.project._id).toBe(childProjectId);
        });
        it('returns 404 for non-existent path', async () => {
            await (0, supertest_1.default)(baseUrl)
                .get(`/api/v1/projects/resolve?organizationId=${orgId}&path=/does/not/exist`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
        it('rejects missing query params', async () => {
            await (0, supertest_1.default)(baseUrl)
                .get('/api/v1/projects/resolve')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });
    describe('GET /api/v1/projects/:id - Get by ID', () => {
        it('fetches project by id', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .get(`/api/v1/projects/${rootProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.project._id).toBe(rootProjectId);
        });
        it('rejects invalid ObjectId format', async () => {
            await (0, supertest_1.default)(baseUrl)
                .get('/api/v1/projects/not-an-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });
    describe('PATCH /api/v1/projects/:id - Update Project', () => {
        it('updates project name (enforces sibling uniqueness)', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .patch(`/api/v1/projects/${childProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Campaign B' })
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.project.name).toBe('Campaign B');
        });
        it('accepts case-insensitive duplicate name in same parent', async () => {
            await (0, supertest_1.default)(baseUrl)
                .patch(`/api/v1/projects/${childProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'bhagwan ji', path: '/Bhagwan-ji/bhagwan-ji' })
                .expect(200);
        });
        it('rejects invalid path format', async () => {
            await (0, supertest_1.default)(baseUrl)
                .patch(`/api/v1/projects/${childProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ path: 'no-slash' })
                .expect(400);
        });
        it('rejects unauthenticated requests', async () => {
            await (0, supertest_1.default)(baseUrl)
                .patch(`/api/v1/projects/${childProjectId}`)
                .send({ name: 'X' })
                .expect(401);
        });
    });
    describe('DELETE /api/v1/projects/:id - Soft Delete', () => {
        it('soft deletes a project', async () => {
            await (0, supertest_1.default)(baseUrl)
                .delete(`/api/v1/projects/${childProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(204);
        });
        it('rejects unauthenticated requests', async () => {
            await (0, supertest_1.default)(baseUrl).delete(`/api/v1/projects/${childProjectId}`).expect(401);
        });
    });
});
