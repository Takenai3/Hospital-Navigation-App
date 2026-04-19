import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API Get Bottlenecks', () => {
    const endpoint = '/api/flow/get_bottlenecks';
    const TEST_ROUTE = 'ROUTE_BT_001';

    beforeAll(async () => {
        // Setup bảng cần thiết
        await db.query("CREATE TABLE IF NOT EXISTS routes (id SERIAL PRIMARY KEY, route_id TEXT UNIQUE)");
        await db.query(`CREATE TABLE IF NOT EXISTS bottlenecks_data (
            id SERIAL PRIMARY KEY,
            route_id TEXT,
            edge_name TEXT,
            x FLOAT,
            y FLOAT,
            occupancy_rate FLOAT
        )`);

        // Chèn route mẫu
        await db.query("INSERT INTO routes (route_id) VALUES ($1) ON CONFLICT DO NOTHING", [TEST_ROUTE]);

        // Chèn dữ liệu ùn tắc mẫu (>0.8)
        await db.query(
            "INSERT INTO bottlenecks_data (route_id, edge_name, x, y, occupancy_rate) VALUES ($1, 'Hành lang A', 100.5, 200.5, 0.95)",
            [TEST_ROUTE]
        );
    });

    afterAll(async () => {
        await db.query("DELETE FROM bottlenecks_data");
        await db.query("DELETE FROM routes WHERE route_id = $1", [TEST_ROUTE]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | SUCCESS - Lấy danh sách điểm ùn tắc thành công', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ route_id: TEST_ROUTE });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.message).toBe('OK');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data[0]).toMatchObject({
                edge_name: 'Hành lang A',
                severity: 'CRITICAL' // Vì logic: rate 0.95 > 0.9
            });
        });

        it('TC-02: 1000 | SUCCESS - Trả về mảng rỗng khi route tồn tại nhưng không có ùn tắc', async () => {
            const EMPTY_ROUTE = 'ROUTE_NO_JAM';
            await db.query("INSERT INTO routes (route_id) VALUES ($1) ON CONFLICT DO NOTHING", [EMPTY_ROUTE]);

            const res = await request(app)
                .get(endpoint)
                .query({ route_id: EMPTY_ROUTE });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toEqual([]);

            await db.query("DELETE FROM routes WHERE route_id = $1", [EMPTY_ROUTE]);
        });
    });

    describe('Kiểm tra Ràng buộc & Lỗi (200x, 5003, 9901)', () => {
        it('TC-03: 2001 | MISSING_PARAM - Không truyền route_id', async () => {
            const res = await request(app).get(endpoint);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-04: 2002 | INVALID_TYPE - route_id chứa ký tự nguy hiểm', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ route_id: "'; DROP TABLE routes;--" });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });

        it('TC-05: 5003 | PATH_NOT_FOUND - route_id không tồn tại', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ route_id: 'NON_EXISTENT_ROUTE' });

            expect(res.body.code).toBe(RESPONSE_CODES.PATH_NOT_FOUND);
            expect(res.body.message).toBe('Path not found');
        });

        it('TC-06: 9901 | DB_CONNECTION_FAILED - Lỗi kết nối Database', async () => {
            // Giả lập lỗi kết nối (thường trả về trong block catch đầu tiên hoặc ngoài cùng)
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const res = await request(app)
                .get(endpoint)
                .query({ route_id: TEST_ROUTE });

            // Sửa từ 9999 thành 9901 theo bảng mã lỗi của bạn
            expect(res.body.code).toBe(RESPONSE_CODES.DB_CONNECTION_FAILED);

            spy.mockRestore();
        });
    });
});