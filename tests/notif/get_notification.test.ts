import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API get_notification (Lấy danh sách thông báo)', () => {
    const endpoint = '/api/notif/get_notification';
    const VALID_TOKEN = 'user_access_token_ngan_2026';
    const NO_DATA_TOKEN = 'token_new_user_no_notif';

    // Khởi tạo môi trường test và dữ liệu mẫu
    beforeAll(async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                notif_id SERIAL PRIMARY KEY,
                user_token TEXT NOT NULL,
                title TEXT,
                content TEXT,
                type TEXT,
                is_read TEXT DEFAULT '0',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Insert 12 thông báo cho user để test phân trang (count=10)
        for (let i = 1; i <= 12; i++) {
            await db.query(
                "INSERT INTO notifications (user_token, title, content, type, created_at) VALUES ($1, $2, $3, $4, $5)",
                [VALID_TOKEN, `Thông báo ${i}`, `Nội dung ${i}`, 'medical', new Date(Date.now() + i * 1000)]
            );
        }
    });

    // Dọn dẹp dữ liệu sau khi test
    afterAll(async () => {
        await db.query("DELETE FROM notifications WHERE user_token IN ($1, $2)", [VALID_TOKEN, NO_DATA_TOKEN]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | SUCCESS - Lấy trang đầu tiên thành công (index=0, count=10)', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('token', VALID_TOKEN) // Gửi qua Header theo ảnh 2
                .query({ index: 0, count: 10 });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.message).toBe('OK');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(10);
            // Kiểm tra sắp xếp: Tin mới nhất (created_at lớn nhất) phải ở đầu
            const firstDate = new Date(res.body.data[0].created_at).getTime();
            const secondDate = new Date(res.body.data[1].created_at).getTime();
            expect(firstDate).toBeGreaterThan(secondDate);
        });

        it('TC-02: 1000 | SUCCESS - Trả về mảng rỗng khi đã tải hết dữ liệu (index=20)', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('token', VALID_TOKEN)
                .query({ index: 20, count: 10 });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toEqual([]); // Khớp yêu cầu ảnh 15
        });
    });

    describe('Kịch bản Lỗi Xác thực & Tham số (2xxx, 3xxx)', () => {
        it('TC-03: 3003 | User not authenticated - Không gửi Token trong Header', async () => {
            const res = await request(app)
                .get(endpoint)
                .query({ index: 0, count: 10 });

            expect(res.body.code).toBe(RESPONSE_CODES.USER_NOT_AUTHENTICATED); // 3003
            expect(res.body.message).toBe('User not authenticated');
        });

        it('TC-04: 2001 | Missing Param - Thiếu tham số count trong request', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('token', VALID_TOKEN)
                .query({ index: 0 }); // Thiếu count

            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM); // 2001
        });

        it('TC-05: 2003 | Invalid Value - Tham số index là số âm', async () => {
            const res = await request(app)
                .get(endpoint)
                .set('token', VALID_TOKEN)
                .query({ index: -1, count: 10 });

            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE); // 2003
        });
    });

    describe('Kịch bản Lỗi Hệ thống (9xxx)', () => {
        it('TC-06: 9901 | Database connection failed - Lỗi kết nối DB', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('connection refused');
            });

            const res = await request(app)
                .get(endpoint)
                .set('token', VALID_TOKEN)
                .query({ index: 0, count: 10 });

            expect(res.body.code).toBe(RESPONSE_CODES.DATABASE_CONNECTION_FAILED); // 9901
            spy.mockRestore();
        });

        it('TC-07: 9902 | Database query failed - Lỗi cú pháp SQL', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('syntax error at or near "SELECT"');
            });

            const res = await request(app)
                .get(endpoint)
                .set('token', VALID_TOKEN)
                .query({ index: 0, count: 10 });

            expect(res.body.code).toBe(RESPONSE_CODES.DATABASE_QUERY_FAILED); // 9902
            spy.mockRestore();
        });

        it('TC-08: 9999 | Unexpected exception - Lỗi code không xác định', async () => {
            // Giả lập lỗi parse JSON hoặc lỗi logic code
            const spy = jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
                throw new Error('Fatal error');
            });

            const res = await request(app)
                .get(endpoint)
                .set('token', VALID_TOKEN)
                .query({ index: 0, count: 10 });

            expect(res.body.code).toBe(RESPONSE_CODES.UNEXPECTED); // 9999
            spy.mockRestore();
        });
    });
});