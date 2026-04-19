import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API Flow Forecast (Full Response Codes Mapping)', () => {
    const endpoint = '/api/flow/flow_forecast';
    const TEST_AREA = 'AREA_LOBBY_01';

    describe('Nhóm Thành công', () => {
        it('TC-01: 1000 | SUCCESS - Truyền đủ tham số hợp lệ', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ area_id: TEST_AREA, time_offset: 15 });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.message).toBe('OK');
        });
    });

    describe('Nhóm Validation (200x)', () => {
        it('TC-02: 2001 | MISSING_PARAM - Thiếu tham số bắt buộc', async () => {
            const res = await request(app).get(endpoint).query({ area_id: TEST_AREA });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-03: 2002 | INVALID_TYPE - time_offset không phải là số', async () => {
            const res = await request(app).get(endpoint).query({ time_offset: 'SAI_KIEU' });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });

        it('TC-04: 2003 | INVALID_VALUE - time_offset khác 15 hoặc 30', async () => {
            const res = await request(app).get(endpoint).query({ time_offset: 45 });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
        });
    });

    describe('Nhóm Map (400x)', () => {
        it('TC-05: 4002 | NODE_NOT_FOUND - area_id không tồn tại', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ area_id: 'MISSING_NODE', time_offset: 15 });
            expect(res.body.code).toBe(RESPONSE_CODES.NODE_NOT_FOUND);
        });
    });

    describe('Nhóm Engine & System (9xxx)', () => {
        it('TC-06: 9001 | ENGINE_UNAVAILABLE - Giả lập engine lỗi', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementation((q) => {
                // Kiểm tra query string hoặc params để throw đúng lỗi engine
                if (typeof q === 'string' && q.includes('flow_forecasts')) {
                    throw new Error('ENGINE_UNAVAILABLE');
                }
                return Promise.resolve({ rows: [{ area_id: TEST_AREA }] } as any);
            });

            const res = await request(app).get(endpoint).query({ time_offset: 15 });
            expect(res.body.code).toBe(RESPONSE_CODES.ENGINE_UNAVAILABLE);

            spy.mockRestore();
        });

        it('TC-07: 9902 | DB_QUERY_FAILED - Lỗi truy vấn SQL', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('SQL_ERR');
            });

            const res = await request(app)
                .get(endpoint)
                .query({ area_id: TEST_AREA, time_offset: 15 });

            expect(res.body.code).toBe(RESPONSE_CODES.DB_QUERY_FAILED);

            spy.mockRestore();
        });

        it('TC-08: 9999 | UNEXPECTED - Lỗi hệ thống chưa xác định', async () => {
            // Giả lập một lỗi nằm ngoài các block try-catch xử lý cụ thể
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('UNKNOWN_CRASH');
            });

            const res = await request(app).get(endpoint).query({ time_offset: 15 });

            expect(res.body.code).toBe(RESPONSE_CODES.UNEXPECTED);

            spy.mockRestore();
        });
    });
});