"use strict";
/**
 * @fileoverview Comprehensive E2E API tests for User endpoints
 * Requires running server with env: API_BASE_URL, MONGO_URI, JWT_SECRET
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
describe('User API - Comprehensive E2E Tests', () => {
    let authToken;
    const testUser = {
        email: `user.test+${Date.now()}@example.com`,
        password: 'SecureP@ssw0rd123!',
        profile: { firstName: 'User', lastName: 'Tester' },
    };
    beforeAll(async () => {
        const registerRes = await (0, supertest_1.default)(baseUrl).post('/api/v1/auth/register').send(testUser);
        expect(registerRes.status).toBe(201);
        const loginRes = await (0, supertest_1.default)(baseUrl)
            .post('/api/v1/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        expect(loginRes.status).toBe(200);
        authToken = loginRes.body.data?.token;
    });
    describe('GET /api/v1/users/me - Current User', () => {
        it('returns the current user profile', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toHaveProperty('email');
            expect(res.body.data.user).toHaveProperty('id');
        });
        it('rejects request without auth token', async () => {
            await (0, supertest_1.default)(baseUrl).get('/api/v1/users/me').expect(401);
        });
    });
    describe('PATCH /api/v1/users/me/profile - Update Profile', () => {
        it('updates profile successfully', async () => {
            const res = await (0, supertest_1.default)(baseUrl)
                .patch('/api/v1/users/me/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ firstName: 'New', lastName: 'Name' })
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.profile.firstName).toBe('New');
            expect(res.body.data.user.profile.lastName).toBe('Name');
        });
        it('rejects invalid profile fields', async () => {
            await (0, supertest_1.default)(baseUrl)
                .patch('/api/v1/users/me/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ firstName: '123' })
                .expect(400);
        });
        it('rejects empty body due to refine rule', async () => {
            await (0, supertest_1.default)(baseUrl)
                .patch('/api/v1/users/me/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);
        });
    });
    describe('POST /api/v1/users/me/change-password - Change Password', () => {
        it('changes password with valid credentials', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/users/me/change-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ currentPassword: testUser.password, newPassword: 'NewP@ssw0rd987!' })
                .expect(204);
        });
        it('rejects with wrong current password', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/users/me/change-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ currentPassword: 'AnotherP@ss9!', newPassword: 'AnotherP@ss1!' })
                .expect(401);
        });
        it('rejects invalid new password format', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/users/me/change-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ currentPassword: 'NewP@ssw0rd987!', newPassword: 'weak' })
                .expect(400);
        });
        it('rejects missing authorization', async () => {
            await (0, supertest_1.default)(baseUrl)
                .post('/api/v1/users/me/change-password')
                .send({ currentPassword: 'a', newPassword: 'b' })
                .expect(401);
        });
    });
    describe('DELETE /api/v1/users/me - Soft Delete', () => {
        it('soft deletes user account', async () => {
            await (0, supertest_1.default)(baseUrl)
                .delete('/api/v1/users/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(204);
        });
        it('rejects request without auth token', async () => {
            await (0, supertest_1.default)(baseUrl).delete('/api/v1/users/me').expect(401);
        });
    });
});
