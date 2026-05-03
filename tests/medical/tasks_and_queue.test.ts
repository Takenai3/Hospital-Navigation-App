import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Medical Module: Tasks & Queue Integration Test Suite
 * APIs: get_clinical_tasks, cancel_clinical_tasks, queue_status
 * Tuân thủ build_tasks_queue.txt (Mocking 100%)
 */
describe('Medical Module: Tasks & Queue', () => {
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('API: get_clinical_tasks (GET /api/medical/get_clinical_tasks)', () => {
        const endpoint = '/api/medical/get_clinical_tasks';

        it('Nhóm Validation: 2001 | Missing Param - Không truyền token', async () => {
            const res = await request(app).get(endpoint);
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('Nhóm Authentication: 3101 | Permission Denied - Token khách (token-guest)', async () => {
            const res = await request(app).get(endpoint).query({ token: 'token-guest' });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.PERMISSION_DENIED);
        });

        it('Nhóm Success: 1000 | OK - Lấy danh sách nhiệm vụ thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
                rows: [{ id: 1, type: 'blood_test', status: 'pending' }],
                rowCount: 1
            } as any));

            const res = await request(app).get(endpoint).query({ token: 'valid-token' });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('Nhóm System Error: 5000 | DB Error', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('DB Error')));
            const res = await request(app).get(endpoint).query({ token: 'valid-token' });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe('5000');
        });
    });

    describe('API: cancel_clinical_tasks (POST /api/medical/cancel_clinical_tasks)', () => {
        const endpoint = '/api/medical/cancel_clinical_tasks';
        const mockData = { token: 'staff-token', task_id: 101, reason: 'Lý do hủy' };

        it('Nhóm Validation: 2001 | Missing Param - Thiếu task_id', async () => {
            const res = await request(app).post(endpoint).send({ token: 'staff-token' });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('Nhóm Authentication: 1009 | Not Access - Token người dùng (token-user)', async () => {
            const res = await request(app).post(endpoint).send({ ...mockData, token: 'token-user' });
            expect(res.status).toBe(200);
            expect(['1009', RESPONSE_CODES.PERMISSION_DENIED, '3102']).toContain(res.body.code);
        });

        it('Nhóm Success: 1000 | OK - Hủy thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 1 } as any));
            const res = await request(app).post(endpoint).send(mockData);
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('Nhóm System Error: 5000 | DB Error', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('DB Error')));
            const res = await request(app).post(endpoint).send(mockData);
            expect(res.status).toBe(200);
            expect(res.body.code).toBe('5000');
        });
    });

    describe('API: queue_status (GET /api/medical/queue_status)', () => {
        const endpoint = '/api/medical/queue_status';

        it('Nhóm Validation: 2001 | Missing Param - Thiếu room_id', async () => {
            const res = await request(app).get(endpoint).query({ token: 'valid-token' });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('Nhóm Validation: 2002 | Invalid Type - room_id là chuỗi (abc)', async () => {
            const res = await request(app).get(endpoint).query({ token: 'valid-token', room_id: 'abc' });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });

        it('Nhóm Success: 1000 | OK - Lấy trạng thái hàng đợi thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
                rows: [{ patient_id: 1, queue_number: 5 }],
                rowCount: 1
            } as any));

            const res = await request(app).get(endpoint).query({ token: 'valid-token', room_id: 101 });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('Nhóm System Error: 5000 | DB Error', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('DB Error')));
            const res = await request(app).get(endpoint).query({ token: 'valid-token', room_id: 101 });
            expect(res.status).toBe(200);
            expect(res.body.code).toBe('5000');
        });
    });
});