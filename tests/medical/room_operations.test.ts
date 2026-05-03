import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Medical Module: Room Operations Integration Test Suite
 * APIs: room_opening, check_in_room, checkout_room
 * Tuân thủ gen_medical_master.txt (Mocking 100%)
 */
describe('Medical Module: Room Operations', () => {
    const VALID_TOKEN = 'token_HIS_2026';
    const TEST_ROOM_ID = 202;

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('API: room_opening (GET /api/medical/room_opening)', () => {
        const endpoint = '/api/medical/room_opening';

        it('Nhóm Success: 1000 | OK - Kiểm tra phòng đang mở thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
                rows: [{ id: TEST_ROOM_ID, name: 'Phòng Nội 1', status: 'open' }],
                rowCount: 1
            } as any));

            const res = await request(app)
                .get(endpoint)
                .query({ room_id: TEST_ROOM_ID });

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data.status).toBe('open');
        });

        it('Nhóm Validation: 2001 | Missing Param - Không truyền room_id', async () => {
            const res = await request(app).get(endpoint);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });
    });

    describe('API: check_in_room (POST /api/medical/check_in_room)', () => {
        const endpoint = '/api/medical/check_in_room';
        const mockData = { token: VALID_TOKEN, room_id: TEST_ROOM_ID, qr_code: 'QR_HIS_789' };

        it('Nhóm Success: 1000 | OK - Check-in phòng khám thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 1 } as any));

            const res = await request(app).post(endpoint).send(mockData);

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('Nhóm Authentication: 3002 | Token Invalid - Token rác', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({ ...mockData, token: 'fake-token' });

            expect([RESPONSE_CODES.TOKEN_INVALID, '3002']).toContain(res.body.code);
        });
    });

    describe('API: checkout_room (POST /api/medical/checkout_room)', () => {
        const endpoint = '/api/medical/checkout_room';

        it('Nhóm Success: 1000 | OK - Checkout phòng khám thành công', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 1 } as any));

            const res = await request(app)
                .post(endpoint)
                .send({ token: VALID_TOKEN, room_id: TEST_ROOM_ID });

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('Nhóm System Error: 9901 | DB Query Failed - Lỗi thực thi SQL', async () => {
            jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Syntax Error')));

            const res = await request(app)
                .post(endpoint)
                .send({ token: VALID_TOKEN, room_id: TEST_ROOM_ID });

            expect([RESPONSE_CODES.DB_QUERY_FAILED, '5000']).toContain(res.body.code);
        });
    });
});
