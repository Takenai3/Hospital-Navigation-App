import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Medical Module: Medical Records Integration Test Suite
 * APIs: result_status, get_prescription, medical_history
 * Tuân thủ gen_medical_master.txt (Mocking 100%)
 */
describe('Medical Module: Medical Records', () => {
    const VALID_TOKEN = 'token_HIS_2026';

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('API: result_status (GET /api/medical/result_status)', () => {
        const endpoint = '/api/medical/result_status';

        it('Nhóm Success: 1000 | OK - Lấy trạng thái kết quả xét nghiệm', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
                rows: [{ task_id: 101, result_ready: true, estimated_time: null }],
                rowCount: 1
            } as any));

            const res = await request(app)
                .get(endpoint)
                .query({ token: VALID_TOKEN, task_id: 101 });

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data.result_ready).toBe(true);
        });

        it('Nhóm Validation: 2003 | Invalid Value - task_id không tồn tại (400x)', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 0 } as any));

            const res = await request(app)
                .get(endpoint)
                .query({ token: VALID_TOKEN, task_id: 999 });

            expect([RESPONSE_CODES.NODE_NOT_FOUND, '4001', '4002']).toContain(res.body.code);
        });
    });

    describe('API: get_prescription (GET /api/medical/get_prescription)', () => {
        const endpoint = '/api/medical/get_prescription';

        it('Nhóm Success: 1000 | OK - Lấy đơn thuốc thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
                rows: [
                    { medicine_name: 'Paracetamol', dosage: '500mg', frequency: '2 times/day' },
                    { medicine_name: 'Amoxicillin', dosage: '250mg', frequency: '3 times/day' }
                ]
            } as any));

            const res = await request(app)
                .get(endpoint)
                .query({ token: VALID_TOKEN });

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data[0]).toHaveProperty('medicine_name');
        });
    });

    describe('API: medical_history (GET /api/medical/medical_history)', () => {
        const endpoint = '/api/medical/medical_history';

        it('Nhóm Success: 1000 | OK - Lấy lịch sử khám bệnh theo ngày', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
                rows: [
                    { date: '2026-04-20', diagnosis: 'Flu', hospital: 'Main Hospital' }
                ]
            } as any));

            const res = await request(app)
                .get(endpoint)
                .query({ token: VALID_TOKEN, date: '2026-04-20' });

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('Nhóm System Error: 5000 | Database Error', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Query failed')));

            const res = await request(app)
                .get(endpoint)
                .query({ token: VALID_TOKEN, date: '2026-04-20' });

            expect(res.body.code).toBe('5000');
        });
    });
});
