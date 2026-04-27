import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Unit Test: API Flow Forecast (Mocked Database)', () => {
    const endpoint = '/api/flow/flow_forecast';
    const TEST_AREA = 'AREA_LOBBY_01';

    afterEach(() => {
        // Dọn dẹp tất cả các mock sau mỗi test case để không bị "dính" logic
        jest.clearAllMocks();
    });

    describe('Nhóm Validation Tham Số (200x)', () => {
        it('TC-01: 1000 | SUCCESS - Không truyền area_id (Lấy dự báo toàn bản đồ)', async () => {
            // Cần mock DB vì API sẽ vượt qua validation và gọi Database
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 0 } as any));
            
            const res = await request(app).get(endpoint).query({ time_offset: 15 });
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('TC-02: 2001 | MISSING_PARAM - Thiếu tham số time_offset', async () => {
            const res = await request(app).get(endpoint).query({ area_id: TEST_AREA });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-03: 2003 | INVALID_VALUE - time_offset không hợp lệ (VD: 45 thay vì 15,30,60)', async () => {
            const res = await request(app).get(endpoint).query({ area_id: TEST_AREA, time_offset: 45 });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
        });
    });

    describe('Nhóm Xử lý Map/Node (400x)', () => {
        it('TC-04: 4002 | NODE_NOT_FOUND - area_id không tồn tại trong hệ thống', async () => {
            // Mock: Giả lập Database trả về rỗng (không tìm thấy khu vực)
            // Đã fix TS2345 bằng mockImplementationOnce
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 0 } as any));

            const res = await request(app)
                .get(endpoint)
                .query({ area_id: 'UNKNOWN_AREA', time_offset: 15 });
            
            expect(res.body.code).toBe(RESPONSE_CODES.NODE_NOT_FOUND);
        });
    });

    describe('Nhóm Thành công (1000)', () => {
        it('TC-05: 1000 | SUCCESS - Trả về kết quả dự báo thành công', async () => {
            // Mock lần 1: Giả lập qua vòng check area_id -> Có tồn tại
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: TEST_AREA }], rowCount: 1 } as any));
            
            // Mock lần 2: Giả lập trả về dữ liệu tính toán dự báo luồng
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ 
                rows: [{ area_id: TEST_AREA, forecast_density: 0.65, status_warning: 'WARNING' }],
                rowCount: 1 
            } as any));

            const res = await request(app)
                .get(endpoint)
                .query({ area_id: TEST_AREA, time_offset: 15 });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });
    });

    describe('Nhóm Lỗi Hệ thống (5000)', () => {
        it('TC-06: 5000 | SERVER_ERROR - Database mất kết nối hoặc query lỗi', async () => {
            // Mock: Quăng thẳng lỗi kỹ thuật để Express tự bắt (vào catch)
            // Đã fix TS2345 bằng mockImplementationOnce
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Connection to Postgres lost')));

            const res = await request(app)
                .get(endpoint)
                .query({ area_id: TEST_AREA, time_offset: 15 });

            expect(res.body.code).toBe('5000');
        });
    });
});
