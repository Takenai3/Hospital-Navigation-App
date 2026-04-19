import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Admin API reset_traffic', () => {
    const endpoint = '/api/admin/reset_traffic';
    const VALID_ADMIN_TOKEN = 'admin_secret_token_2026';
    const VALID_AREA = 'AREA_GATE_A';

    beforeAll(async () => {
        // Khởi tạo bảng nodes để check area_id
        await db.query(`CREATE TABLE IF NOT EXISTS nodes (node_id TEXT PRIMARY KEY)`);
        await db.query("INSERT INTO nodes (node_id) VALUES ($1) ON CONFLICT DO NOTHING", [VALID_AREA]);
    });

    afterAll(async () => {
        await db.query("DELETE FROM nodes WHERE node_id = $1", [VALID_AREA]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Reset toàn bệnh viện (area_id trống)', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    reason: 'Định kỳ cuối ngày'
                });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toEqual([]);
        });

        it('TC-02: 1000 | OK - Reset riêng cho khu vực GATE_A', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    area_id: VALID_AREA,
                    reason: 'Lỗi cảm biến khu vực'
                });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });
    });

    describe('Kịch bản Thất bại (2xxx, 3xxx, 4xxx)', () => {
        it('TC-03: 3102 | Admin role required - Sai token', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: 'staff_token_123',
                    reason: 'Thử reset'
                });

            expect(res.body.code).toBe(RESPONSE_CODES.ADMIN_ROLE_REQUIRED);
        });

        it('TC-04: 2001 | Missing Param - Không gửi lý do reset (reason)', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN
                    // thiếu reason
                });

            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-05: 4002 | Node not found - area_id không tồn tại', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    area_id: 'NON_EXISTENT_ZONE',
                    reason: 'Fix lỗi'
                });

            expect(res.body.code).toBe(RESPONSE_CODES.NODE_NOT_FOUND);
        });
    });
});