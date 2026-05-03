import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Medical Module: System Sync Integration Test Suite
 * APIs: sync_now
 * Tuân thủ gen_medical_master.txt (Mocking 100%)
 */
describe('Medical Module: System Sync', () => {
    const VALID_TOKEN = 'token_HIS_2026';

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('API: sync_now (POST /api/medical/sync_now)', () => {
        const endpoint = '/api/medical/sync_now';

        it('Nhóm Success: 1000 | OK - Đồng bộ dữ liệu HIS ngay lập tức', async () => {
            // Mock DB: Giả lập cập nhật trạng thái đồng bộ
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 1 } as any));

            const res = await request(app)
                .post(endpoint)
                .send({ token: VALID_TOKEN });

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('Nhóm Authentication: 3102 | Permission Denied - Token không có quyền Admin/Staff', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({ token: 'token-guest' });

            expect([RESPONSE_CODES.PERMISSION_DENIED, '1009']).toContain(res.body.code);
        });

        it('Nhóm Validation: 2001 | Missing Param - Không gửi token', async () => {
            const res = await request(app).post(endpoint).send({});
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('Nhóm System Error: 5000 | Server Error', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Sync Engine failed')));

            const res = await request(app)
                .post(endpoint)
                .send({ token: VALID_TOKEN });

            expect(res.body.code).toBe('5000');
        });
    });
});
