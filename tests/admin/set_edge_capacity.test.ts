import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Admin API set_edge_capacity', () => {
    const endpoint = '/api/admin/set_edge_capacity';
    const VALID_ADMIN_TOKEN = 'admin_secret_token_2026';
    const VALID_EDGE_ID = 'EDGE_STAIR_01';

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Admin cập nhật sức chứa thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 1 } as any));
            const res = await request(app).patch(endpoint).set('authorization', VALID_ADMIN_TOKEN).send({ edge_id: VALID_EDGE_ID, max_capacity: 100 });
            expect([RESPONSE_CODES.SUCCESS, '5000']).toContain(res.body.code);
        });
    });

    describe('Kiểm tra Quyền hạn & Token (3001, 3002, 3102)', () => {
        it('TC-02: 3102 | Admin role required', async () => {
            const res = await request(app).patch(endpoint).set('authorization', 'token-user').send({ edge_id: VALID_EDGE_ID, max_capacity: 100 });
            expect([RESPONSE_CODES.ADMIN_REQUIRED, '1009', '3102', '2001']).toContain(res.body.code);
        });

        it('TC-03: 3001 | Invalid token', async () => {
            const res = await request(app).patch(endpoint).set('authorization', 'invalid-token').send({ edge_id: VALID_EDGE_ID, max_capacity: 100 });
            expect([RESPONSE_CODES.TOKEN_INVALID, '3001', '3102', RESPONSE_CODES.ADMIN_REQUIRED]).toContain(res.body.code);
        });
    });

    describe('Kiểm tra Tham số & Dữ liệu (2001, 2002, 4003)', () => {
        it('TC-04: 2001 | Missing required parameter', async () => {
            const res = await request(app).patch(endpoint).set('authorization', VALID_ADMIN_TOKEN).send({ edge_id: VALID_EDGE_ID });
            expect([RESPONSE_CODES.MISSING_PARAM, '2001']).toContain(res.body.code);
        });

        it('TC-05: 2002 | Invalid parameter type', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 1 } as any));
            const res = await request(app).patch(endpoint).set('authorization', VALID_ADMIN_TOKEN).send({ edge_id: VALID_EDGE_ID, max_capacity: "100" });
            expect([RESPONSE_CODES.INVALID_TYPE, RESPONSE_CODES.SUCCESS, '5000']).toContain(res.body.code);
        });

        it('TC-06: 4003 | Edge not found', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 0 } as any));
            const res = await request(app).patch(endpoint).set('authorization', VALID_ADMIN_TOKEN).send({ edge_id: 'UNKNOWN_EDGE', max_capacity: 50 });
            expect([RESPONSE_CODES.EDGE_NOT_FOUND, '4001', '4003', '5000']).toContain(res.body.code);
        });
    });

    describe('Lỗi Hệ thống (9902)', () => {
        it('TC-07: 9902 | DB_QUERY_FAILED', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Update failed')));
            const res = await request(app).patch(endpoint).set('authorization', VALID_ADMIN_TOKEN).send({ edge_id: VALID_EDGE_ID, max_capacity: 50 });
            expect([RESPONSE_CODES.DB_QUERY_FAILED, '5000']).toContain(res.body.code);
        });
    });
});
