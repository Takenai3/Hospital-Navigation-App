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
        // Setup bảng nodes và map dữ liệu
        await db.query(`CREATE TABLE IF NOT EXISTS nodes (node_id TEXT PRIMARY KEY)`);
        await db.query("INSERT INTO nodes (node_id) VALUES ($1), ($2) ON CONFLICT DO NOTHING", [START_NODE, END_NODE]);
    });

    afterAll(async () => {
        await db.query("DELETE FROM nodes WHERE node_id IN ($1, $2)", [START_NODE, END_NODE]);
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

            expect(res.body.code).toBe(RESPONSE_CODES.NODE_NOT_FOUND);
        });

        it('TC-05: 5003 | Path not found - Không tìm được đường đi giữa 2 điểm', async () => {
            // Giả lập điểm C không có đường nối
            const ISOLATED_NODE = 'NODE_C';
            await db.query("INSERT INTO nodes (node_id) VALUES ($1) ON CONFLICT DO NOTHING", [ISOLATED_NODE]);

            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_STAFF_TOKEN,
                    emergency_id: 'EMG_001',
                    start_point: START_NODE,
                    end_point: ISOLATED_NODE
                });

            expect(res.body.code).toBe(RESPONSE_CODES.PATH_NOT_FOUND);
        });
    });
});