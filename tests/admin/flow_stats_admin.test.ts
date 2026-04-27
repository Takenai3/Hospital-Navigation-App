import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API flow_stats_admin', () => {
    const endpoint = '/api/admin/flow_stats_admin';
    const VALID_ADMIN_TOKEN = 'admin_secret_token_2026';
    const TEST_DATE = '2026-04-19';
    const TEST_AREA = 'AREA_EMERGENCY_01';

    // SETUP: Khởi tạo bảng và dữ liệu mẫu
    beforeAll(async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS hourly_stats (
                id SERIAL PRIMARY KEY,
                stats_date DATE NOT NULL,
                hour TEXT NOT NULL,
                area_id TEXT,
                total_visitors INT DEFAULT 0
            )
        `);
        // Setup bản đồ mồi
        await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES (1, 'BUILD_A', 'Building A', 1, 1) ON CONFLICT DO NOTHING");

        // Seed dữ liệu: 1 Emergency (100 người), 1 Clinic (50 người)
        await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate) VALUES ($1, 1, 0, 0), ('AREA_CLINIC', 1, 5, 5) ON CONFLICT DO NOTHING", [TEST_AREA]);
        
        // Regression Fix: Dọn rác Database trước khi Test
        await db.query("DELETE FROM hourly_stats WHERE stats_date = $1", [TEST_DATE]);

        await db.query(`
            INSERT INTO hourly_stats (stats_date, hour, area_id, total_visitors)
            VALUES
            ($1, '08:00', $2, 100),
            ($1, '08:00', 'AREA_CLINIC', 50)
        `, [TEST_DATE, TEST_AREA]);
    });

    // CLEANUP: Xóa dữ liệu sau khi test
    afterAll(async () => {
        await db.query("DELETE FROM hourly_stats WHERE stats_date = $1", [TEST_DATE]);
        await db.query("DELETE FROM nodes WHERE id IN ($1, 'AREA_CLINIC')", [TEST_AREA]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Thống kê TOÀN VIỆN (không truyền area_id)', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('authorization', VALID_ADMIN_TOKEN)
                .query({ date: TEST_DATE });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            // Tổng visitors phải là 150
            const total = res.body.data.reduce((sum: number, r: any) => sum + r.total_visitors, 0);
            expect(total).toBe(150);
            expect(res.body.data.length).toBe(2);
        });

        it('TC-02: 1000 | OK - Thống kê KHU VỰC CỤ THỂ', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('authorization', VALID_ADMIN_TOKEN)
                .query({ date: TEST_DATE, area_id: TEST_AREA });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].area_id).toBe(TEST_AREA);
            expect(res.body.data[0].total_visitors).toBe(100);
        });

        it('TC-03: 1000 | OK - Ngày không có dữ liệu trả về mảng rỗng []', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('authorization', VALID_ADMIN_TOKEN)
                .query({ date: '2026-01-01' });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toEqual([]);
        });
    });

    describe('Kịch bản Thất bại (Lỗi tham số & Quyền)', () => {
        it('TC-04: 2001 | Missing Param - Không truyền date', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('authorization', VALID_ADMIN_TOKEN)
                .query({});
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-05: 2003 | Invalid Value - Sai định dạng ngày', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('authorization', VALID_ADMIN_TOKEN)
                .query({ date: '19/04/2026' });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
        });

        it('TC-06: 3102 | Admin Role Required - Token sai quyền', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('authorization', 'token-user')
                .query({ date: TEST_DATE });
            expect([RESPONSE_CODES.ADMIN_REQUIRED, '1009']).toContain(res.body.code);
        });

        it('TC-07: 4002 | Node Not Found - area_id không tồn tại', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('authorization', VALID_ADMIN_TOKEN)
                .query({ date: TEST_DATE, area_id: 'UNKNOWN_AREA' });
            expect(res.body.code).toBe(RESPONSE_CODES.NODE_NOT_FOUND);
        });
    });

    describe('Kịch bản Lỗi Hệ thống (9xxx)', () => {
        it('TC-08: 9901 | DB Connection Failed', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('connection failure')));
            const res = await request(app)
                .get(endpoint)
                .set('authorization', VALID_ADMIN_TOKEN)
                .query({ date: TEST_DATE });
            expect([RESPONSE_CODES.DB_CONNECTION_FAILED, RESPONSE_CODES.DB_QUERY_FAILED, '5000']).toContain(res.body.code);
            spy.mockRestore();
        });
    });
});
