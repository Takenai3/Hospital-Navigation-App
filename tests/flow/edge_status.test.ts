import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API edge_status', () => {
    const endpoint = '/api/flow/edge_status';
    const VALID_EDGE = 'EDGE_CORRIDOR_001';

    beforeAll(async () => {
        // Setup bảng edges và dữ liệu mật độ
        await db.query(`CREATE TABLE IF NOT EXISTS edges (edge_id TEXT PRIMARY KEY, map_id INT DEFAULT 1)`);
        await db.query(`CREATE TABLE IF NOT EXISTS edge_density (
            edge_id TEXT PRIMARY KEY,
            current_count INTEGER,
            fill_percentage TEXT,
            map_id INT DEFAULT 1
        )`);

        // Chèn dữ liệu mẫu
        await db.query("INSERT INTO edges (edge_id, map_id) VALUES ($1, 1) ON CONFLICT DO NOTHING", [VALID_EDGE]);
        await db.query(
            "INSERT INTO edge_density (edge_id, current_count, fill_percentage, map_id) VALUES ($1, 10, '85%', 1) ON CONFLICT DO NOTHING",
            [VALID_EDGE]
        );
    });

    afterAll(async () => {
        await db.query("DELETE FROM edge_density");
        await db.query("DELETE FROM edges");
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | SUCCESS - Truyền đúng edge_id hợp lệ', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ edge_id: VALID_EDGE });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toMatchObject({
                edge_id: VALID_EDGE,
                current_count: 10,
                fill_percentage: '85%'
            });
        });
    });

    describe('Kịch bản Lỗi (200x, 4003, 6002)', () => {
        it('TC-02: 2001 | MISSING_PARAM - Người dùng gửi thiếu edge_id', async () => {
            const res = await request(app).get(endpoint);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
            expect(res.body.message).toBe('Missing required parameter');
        });

        it('TC-03: 4003 | EDGE_NOT_FOUND - Người dùng gửi edge_id không tồn tại', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ edge_id: 'NON_EXISTENT_EDGE' });

            expect(res.body.code).toBe(RESPONSE_CODES.EDGE_NOT_FOUND);
            expect(res.body.message).toBe('Edge not found');
        });

        it('TC-04: 6002 | DENSITY_UNAVAILABLE - Không có dữ liệu mật độ tại đoạn đường này', async () => {
            const EMPTY_EDGE = 'EDGE_EMPTY_DATA';
            await db.query("INSERT INTO edges (edge_id, map_id) VALUES ($1, 1) ON CONFLICT DO NOTHING", [EMPTY_EDGE]);

            const res = await request(app)
                .get(endpoint)
                .query({ edge_id: EMPTY_EDGE });

            expect(res.body.code).toBe(RESPONSE_CODES.DENSITY_UNAVAILABLE);

            await db.query("DELETE FROM edges WHERE edge_id = $1", [EMPTY_EDGE]);
        });
    });

    describe('Lỗi Hệ thống (99xx)', () => {
        it('TC-05: 9901 | DB_CONNECTION_FAILED - Lỗi kết nối Database', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Connection lost');
            });

            const res = await request(app).get(endpoint).query({ edge_id: VALID_EDGE });
            expect(res.body.code).toBe(RESPONSE_CODES.DB_CONNECTION_FAILED);

            spy.mockRestore();
        });
    });
});