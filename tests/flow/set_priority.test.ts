import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API set_priority (Emergency Route)', () => {
    const endpoint = '/api/flow/set_priority';
    const VALID_STAFF_TOKEN = 'medical_staff_token_2026';
    const START_NODE = 'NODE_A';
    const END_NODE = 'NODE_B';

    beforeAll(async () => {
        // Setup bản đồ mồi
        await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES (1, 'BUILD_A', 'Building A', 1, 1) ON CONFLICT DO NOTHING");
        // Setup bảng nodes và map dữ liệu (map_id = 1)
        await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate) VALUES ($1, 1, 0, 0), ($2, 1, 10, 10) ON CONFLICT DO NOTHING", [START_NODE, END_NODE]);
    });

    afterAll(async () => {
        await db.query("DELETE FROM nodes WHERE id IN ($1, $2, 'NODE_C')", [START_NODE, END_NODE]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Thiết lập lộ trình ưu tiên thành công', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_STAFF_TOKEN,
                    emergency_id: 'EMG_001',
                    start_point: START_NODE,
                    end_point: END_NODE
                });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toHaveProperty('priority_route');
            expect(Array.isArray(res.body.data.priority_route)).toBe(true);
            expect(res.body.data.priority_route[0]).toHaveProperty('clearance_required');
        });
    });

    describe('Kiểm tra Quyền & Token (3xxx)', () => {
        it('TC-02: 3101 | Permission denied - Người dùng không đủ thẩm quyền', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: 'guest_token',
                    emergency_id: 'EMG_001',
                    start_point: START_NODE,
                    end_point: END_NODE
                });

            expect(res.body.code).toBe(RESPONSE_CODES.PERMISSION_DENIED);
        });
    });

    describe('Kiểm tra Tham số & Logic (2xxx, 4xxx, 5xxx)', () => {
        it('TC-03: 2001 | Missing Param - Thiếu emergency_id', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_STAFF_TOKEN,
                    start_point: START_NODE,
                    end_point: END_NODE
                });

            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-04: 4002 | Node not found - Điểm xuất phát không tồn tại', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_STAFF_TOKEN,
                    emergency_id: 'EMG_001',
                    start_point: 'UNKNOWN_NODE',
                    end_point: END_NODE
                });

            expect([RESPONSE_CODES.NODE_NOT_FOUND, '4002']).toContain(res.body.code);
        });

        it('TC-05: 5003 | Path not found - Không tìm được đường đi giữa 2 điểm', async () => {
            // Giả lập điểm C không có đường nối
            const ISOLATED_NODE = 'NODE_C';
            await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate) VALUES ($1, 1, 20, 20) ON CONFLICT DO NOTHING", [ISOLATED_NODE]);

            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_STAFF_TOKEN,
                    emergency_id: 'EMG_001',
                    start_point: START_NODE,
                    end_point: ISOLATED_NODE
                });

            expect([RESPONSE_CODES.PATH_NOT_FOUND, '5003', '5000']).toContain(res.body.code);

            await db.query("DELETE FROM nodes WHERE id = $1", [ISOLATED_NODE]);
        });
    });
});
