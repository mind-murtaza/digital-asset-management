"use strict";
/**
 * @fileoverview Comprehensive E2E API tests for Auth endpoints
 * Requires running server with env: API_BASE_URL, JWT_SECRET
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
describe('Auth API - Comprehensive E2E Tests', () => {
    const testUser = {
        email: `auth.test+${Date.now()}@example.com`,
        password: 'SecureP@ssw0rd123!',
        profile: { firstName: 'Auth', lastName: 'Tester' },
    };
    let token;
    describe('POST /api/v1/auth/register - Register', () => {
        it('registers a new user successfully', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/register')
                .send(testUser)
                .expect(201);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.data.token).toBe('string');
            expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
            expect(res.body.data.user).toHaveProperty('id');
        });
        it('rejects duplicate registration', async () => {
            await (0, supertest_1.default)(baseUrl).post('/api/v1/auth/register').send(testUser).expect(400);
        });
        it('rejects invalid email format', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/register')
                .send({ ...testUser, email: 'bad' })
                .expect(400);
        });
        it('rejects weak password', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/register')
                .send({ ...testUser, email: `weak+${Date.now()}@example.com`, password: 'weak' })
                .expect(400);
        });
        it('rejects missing profile fields', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/register')
                .send({ email: `noprof+${Date.now()}@example.com`, password: testUser.password })
                .expect(400);
        });
        it('rejects unknown fields (strict schema)', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/register')
                .send({ ...testUser, unknown: 'field' })
                .expect(400);
        });
    });
    describe('POST /api/v1/auth/login - Login', () => {
        it('logins successfully with valid credentials', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/login')
                .send({ email: testUser.email, password: testUser.password })
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('user');
            expect(res.body.data).toHaveProperty('token');
            token = res.body.data.token;
        });
        it('rejects invalid password', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/login')
                .send({ email: testUser.email, password: 'WrongP@ssw0rd!' })
                .expect(401);
        });
        it('rejects non-existing user', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/login')
                .send({ email: `nouser+${Date.now()}@example.com`, password: testUser.password })
                .expect(401);
        });
        it('rejects invalid email format', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/login')
                .send({ email: 'bad', password: testUser.password })
                .expect(400);
        });
        it('rejects missing fields', async () => {
            await (0, supertest_1.default)(baseUrl).post('/api/v1/auth/login').send({}).expect(400);
        });
    });
    describe('POST /api/v1/auth/refresh - Token Refresh', () => {
        it('refreshes token with valid bearer', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/refresh')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.data.token).toBe('string');
        });
        it('rejects missing bearer token', async () => {
            await (0, supertest_1.default)(baseUrl).post('/api/v1/auth/refresh').expect(401);
        });
        it('rejects malformed auth header', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/refresh')
                .set('Authorization', 'NotBearer token')
                .expect(401);
        });
        it('rejects invalid/expired token', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/auth/refresh')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(401);
        });
    });
});
