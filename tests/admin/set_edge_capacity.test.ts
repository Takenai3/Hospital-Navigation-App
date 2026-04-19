import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Admin API set_edge_capacity', () => {
    const endpoint = '/api/admin/set_edge_capacity';
    const VALID_ADMIN_TOKEN = 'admin_secret_token_2026';
    const VALID_EDGE_ID = 'EDGE_STAIR_01';

    beforeAll(async () => {
        // Khởi tạo bảng edges
        await db.query(`CREATE TABLE IF NOT EXISTS edges (
            edge_id TEXT PRIMARY KEY,
            max_capacity INTEGER DEFAULT 50
        )`);

        // Chèn dữ liệu mẫu
        await db.query("INSERT INTO edges (edge_id, max_capacity) VALUES ($1, 50) ON CONFLICT DO NOTHING", [VALID_EDGE_ID]);
    });

    afterAll(async () => {
        await db.query("DELETE FROM edges WHERE edge_id = $1", [VALID_EDGE_ID]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Admin cập nhật sức chứa thành công', async () => {
            const res = await request(app)
                .patch(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    edge_id: VALID_EDGE_ID,
                    max_capacity: 100
                });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.message).toBe('OK');
            expect(res.body.data).toMatchObject({
                edge_id: VALID_EDGE_ID,
                max_capacity: 100
            });

            // Kiểm tra DB thực tế
            const dbRes = await db.query("SELECT max_capacity FROM edges WHERE edge_id = $1", [VALID_EDGE_ID]);
            expect(dbRes.rows[0].max_capacity).toBe(100);
        });
    });

    describe('Kiểm tra Quyền hạn & Token (3001, 3002, 3102)', () => {
        it('TC-02: 3102 | Admin role required - Người dùng không phải Admin', async () => {
            const res = await request(app)
                .patch(endpoint)
                .send({
                    token: 'user_normal_token',
                    edge_id: VALID_EDGE_ID,
                    max_capacity: 80
                });

            expect(res.body.code).toBe(RESPONSE_CODES.ADMIN_ROLE_REQUIRED);
        });

        it('TC-03: 3001 | Invalid token - Token không hợp lệ', async () => {
            const res = await request(app)
                .patch(endpoint)
                .send({
                    token: 'wrong_token',
                    edge_id: VALID_EDGE_ID,
                    max_capacity: 80
                });

            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TOKEN);
        });
    });

    describe('Kiểm tra Tham số & Dữ liệu (2001, 2002, 4003)', () => {
        it('TC-04: 2001 | Missing required parameter - Thiếu max_capacity', async () => {
            const res = await request(app)
                .patch(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    edge_id: VALID_EDGE_ID
                });

            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-05: 2002 | Invalid parameter type - max_capacity là chuỗi', async () => {
            const res = await request(app)
                .patch(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    edge_id: VALID_EDGE_ID,
                    max_capacity: "100" // Sai kiểu int
                });

            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });

        it('TC-06: 4003 | Edge not found - edge_id không tồn tại', async () => {
            const res = await request(app)
                .patch(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    edge_id: 'UNKNOWN_EDGE',
                    max_capacity: 50
                });

            expect(res.body.code).toBe(RESPONSE_CODES.EDGE_NOT_FOUND);
        });
    });

    describe('Lỗi Hệ thống (9902)', () => {
        it('TC-07: 9902 | DB_QUERY_FAILED - Lỗi khi thực hiện query UPDATE', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce((sql: string) => {
                if (sql.includes('UPDATE')) throw new Error('Update failed');
                return db.query(sql); // Các query khác (như check token) vẫn chạy
            });

            const res = await request(app)
                .patch(endpoint)
                .send({
                    token: VALID_ADMIN_TOKEN,
                    edge_id: VALID_EDGE_ID,
                    max_capacity: 120
                });

            expect(res.body.code).toBe(RESPONSE_CODES.DB_QUERY_FAILED);
            spy.mockRestore();
        });
    });
});