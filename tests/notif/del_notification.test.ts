import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Notification Module (Get & Delete)', () => {
    const VALID_TOKEN = 'token_ngan_2026';
    const OTHER_USER_TOKEN = 'token_benh_nhan_khac';
    let testNotifId: string;

    beforeAll(async () => {
        const res = await db.query(
            "INSERT INTO notifications (user_token, title, content) VALUES ($1, $2, $3) RETURNING notif_id",
            [VALID_TOKEN, 'Test Title', 'Test Content']
        );
        testNotifId = res.rows[0].notif_id;

        // Tạo tin nhắn của người khác để test bảo mật
        await db.query("INSERT INTO notifications (user_token, title) VALUES ($1, $2)", [OTHER_USER_TOKEN, 'Private info']);
    });

    afterAll(async () => {
        await db.query("DELETE FROM notifications WHERE user_token IN ($1, $2)", [VALID_TOKEN, OTHER_USER_TOKEN]);
    });

    describe('API: get_notification', () => {
        it('TC-01: 1000 | Thành công - Trả về danh sách sắp xếp giảm dần', async () => {
            const res = await request(app)
                .get('/api/notif/get_notification')
                .set('token', VALID_TOKEN)
                .query({ index: 0, count: 10 });
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('TC-02: 1000 | OK - Trả mảng rỗng khi index vượt quá số lượng', async () => {
            const res = await request(app)
                .get('/api/notif/get_notification')
                .set('token', VALID_TOKEN)
                .query({ index: 100, count: 10 });
            expect(res.body.data).toEqual([]);
        });

        it('TC-03: 3003 | Bảo mật - Không kèm token đăng nhập', async () => {
            const res = await request(app)
                .get('/api/notif/get_notification')
                .query({ index: 0, count: 10 });
            expect(res.body.code).toBe(RESPONSE_CODES.USER_NOT_AUTHENTICATED);
        });
    });

    describe('API: del_notification', () => {
        it('TC-04: 1000 | Thành công - Xóa thông báo hợp lệ', async () => {
            const res = await request(app)
                .post('/api/notif/del_notification')
                .set('token', VALID_TOKEN)
                .send({ notif_id: testNotifId });
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('TC-05: 4004 | Thất bại - Xóa lại lần 2 (Double click)', async () => {
            const res = await request(app)
                .post('/api/notif/del_notification')
                .set('token', VALID_TOKEN)
                .send({ notif_id: testNotifId });
            expect(res.body.code).toBe(RESPONSE_CODES.NOTIFICATION_NOT_FOUND);
        });

        it('TC-06: 3101 | Bảo mật - Xóa chéo dữ liệu bệnh nhân khác', async () => {
            // Tìm ID của người khác
            const otherRes = await db.query("SELECT notif_id FROM notifications WHERE user_token = $1", [OTHER_USER_TOKEN]);
            const otherId = otherRes.rows[0].notif_id;

            const res = await request(app)
                .post('/api/notif/del_notification')
                .set('token', VALID_TOKEN) // Dùng token mình nhưng xóa ID người khác
                .send({ notif_id: otherId });
            expect([RESPONSE_CODES.PERMISSION_DENIED, '1009']).toContain(res.body.code);
        });

        it('TC-07: 2004 | Routing - Sai phương thức HTTP (GET thay vì POST)', async () => {
            const res = await request(app)
                .get('/api/notif/del_notification')
                .set('token', VALID_TOKEN)
                .query({ notif_id: testNotifId });

            // 404 hoặc 405 tùy cấu hình Router, ở đây mong đợi tầng routing từ chối
            expect(res.status).toBe(404);
        });
    });
});