import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Flow Get Heatmap', () => {
    const endpoint = '/api/flow/get_heatmap';
    const TEST_ROUTE = 'ROUTE_H1_T2_005';

    beforeAll(async () => {
        // 0. Dọn dẹp dữ liệu cũ (Regression Fix)
        await db.query("DELETE FROM heatmap_data WHERE route_id = $1", [TEST_ROUTE]);
        await db.query("DELETE FROM routes WHERE route_id = $1", [TEST_ROUTE]);

        // 1. Chèn route mẫu (Đã xóa CREATE TABLE và map_id)
        await db.query("INSERT INTO routes (route_id) VALUES ($1) ON CONFLICT DO NOTHING", [TEST_ROUTE]);

        // 2. Chèn dữ liệu heatmap mẫu (Đã xóa CREATE TABLE và map_id)
        await db.query(
            "INSERT INTO heatmap_data (route_id, x, y, density_value, status_message, radius) VALUES ($1, 150.5, 300.2, 0.85, 'Khu vực đông đúc', 20.0)",
            [TEST_ROUTE]
        );
    });

    afterAll(async () => {
        await db.query("DELETE FROM heatmap_data WHERE route_id = $1", [TEST_ROUTE]);
        await db.query("DELETE FROM routes WHERE route_id = $1", [TEST_ROUTE]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | SUCCESS - Lấy dữ liệu heatmap thành công', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ route_id: TEST_ROUTE });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data[0]).toMatchObject({
                x: 150.5,
                y: 300.2,
                value: 0.85,
                radius: 20.0
            });
        });
    });

    describe('Kịch bản Lỗi Logic (5003)', () => {
        it('TC-02: 5003 | PATH_NOT_FOUND - route_id không có trong database', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ route_id: 'ROUTE_NOT_IN_DB' });

            expect(res.body.code).toBe(RESPONSE_CODES.PATH_NOT_FOUND);
        });
    });

    describe('Kịch bản Lỗi tham số (200x)', () => {
        it('TC-03: 2001 | MISSING_PARAM - Khi không truyền tham số route_id', async () => {
            const res = await request(app).get(endpoint);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-04: 2001 | MISSING_PARAM - Khi route_id là chuỗi rỗng', async () => {
            const res = await request(app).get(endpoint).query({ route_id: '' });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-05: 2002 | INVALID_TYPE - SQL Injection', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ route_id: "'; DELETE FROM heatmap_data;--" });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });

        it('TC-06: 2002 | INVALID_TYPE - Parameter Pollution (Mảng)', async () => {
            const res = await request(app).get(`${endpoint}?route_id=R1&route_id=R2`);
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });
    });

    describe('Kịch bản Lỗi Hệ thống (9901)', () => {
        it('TC-07: 9901 | DB_CONNECTION_FAILED - Lỗi kết nối Database', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const res = await request(app)
                .get(endpoint)
                .query({ route_id: TEST_ROUTE });

            expect([RESPONSE_CODES.DB_CONNECTION_FAILED, '5000']).toContain(res.body.code);

            spy.mockRestore();
        });
    });

    describe('Kiểm tra tính toàn vẹn dữ liệu', () => {
        it('TC-08: Đảm bảo các giá trị trả về đúng kiểu number', async () => {
            const res = await request(app).get(endpoint).query({ route_id: TEST_ROUTE });
            const item = res.body.data[0];

            expect(typeof item.x).toBe('number');
            expect(typeof item.y).toBe('number');
            expect(typeof item.value).toBe('number');
            expect(typeof item.radius).toBe('number');
        });
    });
});
