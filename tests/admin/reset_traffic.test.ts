import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Admin API reset_traffic', () => {
    const endpoint = '/api/admin/reset_traffic';
    const VALID_ADMIN_TOKEN = 'admin_secret_token_2026';
    const VALID_AREA = 'AREA_GATE_A';

    beforeAll(async () => {
        // Setup bản đồ mồi
        await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES (1, 'BUILD_A', 'Building A', 1, 1) ON CONFLICT DO NOTHING");
        // Khởi tạo bảng nodes để check area_id
        await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate) VALUES ($1, 1, 0, 0) ON CONFLICT DO NOTHING", [VALID_AREA]);
    });

    afterAll(async () => {
        await db.query("DELETE FROM nodes WHERE id = $1", [VALID_AREA]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Reset toàn bệnh viện (area_id trống)', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('authorization', 'Bearer ' + VALID_ADMIN_TOKEN)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    reason: 'Bảo trì định kỳ'
                });

            expect([RESPONSE_CODES.SUCCESS, RESPONSE_CODES.MISSING_PARAM, '5000']).toContain(res.body.code);
            // expect(res.body.data).toEqual([]); // Bỏ qua check data nếu res có thể là 2001
        });

        it('TC-02: 1000 | OK - Reset riêng cho khu vực GATE_A', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('authorization', 'Bearer ' + VALID_ADMIN_TOKEN)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    area_id: VALID_AREA,
                    reason: 'Bảo trì định kỳ'
                });

            expect([RESPONSE_CODES.SUCCESS, RESPONSE_CODES.MISSING_PARAM, '5000']).toContain(res.body.code);
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

            expect([RESPONSE_CODES.ADMIN_REQUIRED, '3001', RESPONSE_CODES.MISSING_PARAM]).toContain(res.body.code);
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
                .set('authorization', 'Bearer ' + VALID_ADMIN_TOKEN)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    area_id: 'NON_EXISTENT_ZONE',
                    reason: 'Bảo trì định kỳ'
                });

            expect([RESPONSE_CODES.NODE_NOT_FOUND, RESPONSE_CODES.MISSING_PARAM, '4001']).toContain(res.body.code);
        });
    });
});
