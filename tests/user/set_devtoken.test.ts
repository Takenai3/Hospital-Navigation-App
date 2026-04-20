import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API set_devtoken (Đăng ký FCM Token)', () => {
    const endpoint = '/api/user/set_devtoken';
    const VALID_USER_TOKEN = 'user_access_token_2026';
    const INVALID_TOKEN = 'wrong_format_token_123';
    const MOCK_DEVICE_TOKEN = 'fcm_device_token_xyz_789';

    // Khởi tạo môi trường test
    beforeAll(async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_devices (
                user_token TEXT PRIMARY KEY,
                device_token TEXT NOT NULL,
                last_updated TIMESTAMP DEFAULT NOW()
            )
        `);
    });

    // Dọn dẹp sau khi test
    afterAll(async () => {
        await db.query("DELETE FROM user_devices WHERE user_token = $1", [VALID_USER_TOKEN]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Đăng ký Device Token lần đầu thành công', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_USER_TOKEN,
                    device_token: MOCK_DEVICE_TOKEN
                });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.message).toBe('OK');
            expect(res.body.data).toEqual([]); // Trả về mảng rỗng theo yêu cầu
        });

        it('TC-02: 1000 | OK - Cập nhật Device Token mới cho cùng một User', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_USER_TOKEN,
                    device_token: 'new_fcm_token_updated_456'
                });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            // Kiểm tra trong DB xem đã cập nhật chưa
            const dbCheck = await db.query('SELECT device_token FROM user_devices WHERE user_token = $1', [VALID_USER_TOKEN]);
            expect(dbCheck.rows[0].device_token).toBe('new_fcm_token_updated_456');
        });
    });

    describe('Kịch bản Lỗi Tham số & Xác thực (2xxx, 3xxx)', () => {
        it('TC-03: 2001 | Missing Param - Thiếu device_token trong request', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_USER_TOKEN
                    // Thiếu device_token
                });

            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-04: 3002 | Invalid Token - Token không hợp lệ hoặc sai định dạng', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: INVALID_TOKEN,
                    device_token: MOCK_DEVICE_TOKEN
                });

            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TOKEN); // Mã lỗi 3002
            expect(res.body.message).toBe('Invalid token');
        });

        it('TC-05: 3002 | Invalid Token - Gửi token rỗng hoặc null', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    token: "",
                    device_token: MOCK_DEVICE_TOKEN
                });

            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TOKEN);
        });
    });

    describe('Kịch bản Lỗi Hệ thống (9xxx)', () => {
        it('TC-06: 9902 | DB Query Failed - Lỗi khi thực hiện query lưu token', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Database connection lost');
            });

            const res = await request(app)
                .post(endpoint)
                .send({
                    token: VALID_USER_TOKEN,
                    device_token: MOCK_DEVICE_TOKEN
                });

            expect(res.body.code).toBe(RESPONSE_CODES.DB_QUERY_FAILED);
            spy.mockRestore();
        });
    });
});