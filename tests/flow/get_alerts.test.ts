import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API Get Density Alerts', () => {
    const endpoint = '/api/flow/get_alerts';
    const TEST_EDGE_START = 'EDGE_H01_001';
    const TEST_EDGE_JAM = 'EDGE_H01_999';

    beforeAll(async () => {
        // Setup dữ liệu giả lập (Đã xóa CREATE TABLE và map_id)
        await db.query("INSERT INTO edges (edge_id) VALUES ($1) ON CONFLICT DO NOTHING", [TEST_EDGE_START]);
        await db.query("INSERT INTO edge_status (edge_id, occupancy_rate) VALUES ($1, 0.95) ON CONFLICT (edge_id) DO UPDATE SET occupancy_rate = 0.95", [TEST_EDGE_JAM]);
    });

    afterAll(async () => {
        // Dọn dẹp dữ liệu sau khi test
        await db.query("DELETE FROM edge_status WHERE edge_id = $1", [TEST_EDGE_JAM]);
        await db.query("DELETE FROM edges WHERE edge_id = $1", [TEST_EDGE_START]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | SUCCESS - Lấy danh sách cảnh báo thành công', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ token: 'secure_token', current_edge: TEST_EDGE_START });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].blocked_edge).toBe(TEST_EDGE_JAM);
        });

        it('TC-02: 1000 | SUCCESS - Trả về mảng rỗng nếu toàn bộ các đường đều thông thoáng', async () => {
            await db.query("UPDATE edge_status SET occupancy_rate = 0.2 WHERE edge_id = $1", [TEST_EDGE_JAM]);
            const res = await request(app)
                .get(endpoint)
                .query({ token: 'secure_token', current_edge: TEST_EDGE_START });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toEqual([]);

            // Hoàn trả dữ liệu để test các case sau
            await db.query("UPDATE edge_status SET occupancy_rate = 0.95 WHERE edge_id = $1", [TEST_EDGE_JAM]);
        });
    });

    describe('Kiểm tra Ràng buộc & Bảo mật (2001, 2002)', () => {
        it('TC-03: 2001 | MISSING_PARAM - Thiếu token truy cập', async () => {
            const res = await request(app).get(endpoint).query({ current_edge: TEST_EDGE_START });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-04: 2001 | MISSING_PARAM - current_edge là chuỗi rỗng', async () => {
            const res = await request(app).get(endpoint).query({ token: 'abc', current_edge: ' ' });
            expect([RESPONSE_CODES.MISSING_PARAM, RESPONSE_CODES.EDGE_NOT_FOUND]).toContain(res.body.code);
        });

        it('TC-05: 2002 | INVALID_TYPE - Ngăn chặn SQL Injection', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ token: 'abc', current_edge: "'; DELETE FROM edge_status;--" });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });

        it('TC-06: 2002 | INVALID_TYPE - current_edge dạng mảng', async () => {
            const res = await request(app).get(`${endpoint}?token=abc&current_edge[]=e1&current_edge[]=e2`);
            expect([RESPONSE_CODES.INVALID_TYPE, RESPONSE_CODES.MISSING_PARAM]).toContain(res.body.code);
        });
    });

    describe('Logic Nghiệp vụ & Lỗi hệ thống', () => {
        it('TC-07: Logic - Không cảnh báo tắc nghẽn đối với vị trí hiện tại của user', async () => {
            // Giả lập chính vị trí user đang đứng cũng bị tắc
            await db.query("INSERT INTO edge_status (edge_id, occupancy_rate) VALUES ($1, 0.99) ON CONFLICT (edge_id) DO UPDATE SET occupancy_rate = 0.99", [TEST_EDGE_START]);

            const res = await request(app)
                .get(endpoint)
                .query({ token: 'secure_token', current_edge: TEST_EDGE_START });

            // User đứng ở H01_001 thì không nhận alert của H01_001
            const selfAlert = res.body.data.find((e: any) => e.blocked_edge === TEST_EDGE_START);
            expect(selfAlert).toBeUndefined();

            await db.query("DELETE FROM edge_status WHERE edge_id = $1", [TEST_EDGE_START]);
        });

        it('TC-08: 4003 | EDGE_NOT_FOUND - current_edge không tồn tại', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ token: 'secure_token', current_edge: 'NON_EXISTENT_EDGE' });

            expect(res.body.code).toBe(RESPONSE_CODES.EDGE_NOT_FOUND);
        });

        it('TC-09: 9901 | DB_CONNECTION_FAILED - Lỗi kết nối hệ thống', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const res = await request(app)
                .get(endpoint)
                .query({ token: 'abc', current_edge: TEST_EDGE_START });

            expect([RESPONSE_CODES.UNEXPECTED, '5000']).toContain(res.body.code);

            spy.mockRestore();
        });
    });
});
