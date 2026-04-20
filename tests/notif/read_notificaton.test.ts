import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API read_notification (Đánh dấu đã đọc)', () => {
    const endpoint = '/api/notif/read_notification';
    const VALID_USER_A_TOKEN = 'token_nguoi_dung_A_2026';
    const VALID_USER_B_TOKEN = 'token_nguoi_dung_B_2026';
    const EXPIRED_TOKEN = 'token_da_het_han_123';

    let notifIdA: string;
    let notifIdB: string;

    // Khởi tạo môi trường test: Tạo thông báo cho 2 người dùng khác nhau
    beforeAll(async () => {
        // Tạo thông báo cho người dùng A
        const resA = await db.query(
            "INSERT INTO notifications (user_token, title, content, is_read) VALUES ($1, $2, $3, $4) RETURNING notif_id",
            [VALID_USER_A_TOKEN, 'Thông báo A', 'Nội dung A', '0']
        );
        notifIdA = resA.rows[0].notif_id;

        // Tạo thông báo cho người dùng B
        const resB = await db.query(
            "INSERT INTO notifications (user_token, title, content, is_read) VALUES ($1, $2, $3, $4) RETURNING notif_id",
            [VALID_USER_B_TOKEN, 'Thông báo B', 'Nội dung B', '0']
        );
        notifIdB = resB.rows[0].notif_id;
    });

    // Dọn dẹp sau khi test
    afterAll(async () => {
        await db.query("DELETE FROM notifications WHERE user_token IN ($1, $2)", [VALID_USER_A_TOKEN, VALID_USER_B_TOKEN]);
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-01: 1000 | OK - Đánh dấu thông báo từ "Chưa đọc" sang "Đã đọc"', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('token', VALID_USER_A_TOKEN) // Token gửi qua Header
                .send({ notif_id: notifIdA }); // notif_id gửi trong Body

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toEqual([]); // Trả về mảng rỗng

            // Kiểm tra DB trạng thái is_read phải là '1' (hoặc true tùy cấu hình)
            const check = await db.query("SELECT is_read FROM notifications WHERE notif_id = $1", [notifIdA]);
            expect(check.rows[0].is_read).toBe('1');
        });

        it('TC-02: 1000 | OK - Giữ nguyên trạng thái nếu thông báo đã đọc từ trước', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('token', VALID_USER_A_TOKEN)
                .send({ notif_id: notifIdA });

            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS); // Không trả lỗi để tránh gián đoạn UX
        });
    });

    describe('Kịch bản Lỗi Tham số & Xác thực (2xxx, 3xxx)', () => {
        it('TC-03: 2001 | Missing Param - Bỏ trống notif_id trong body', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('token', VALID_USER_A_TOKEN)
                .send({ notif_id: "" });

            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM); // 2001
        });

        it('TC-04: 3002/3003 | Auth Error - Token hết hạn hoặc thiếu token', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('token', EXPIRED_TOKEN)
                .send({ notif_id: notifIdA });

            // Trả về 3002 hoặc 3003 tùy logic xử lý token
            expect([RESPONSE_CODES.TOKEN_EXPIRED, RESPONSE_CODES.USER_NOT_AUTHENTICATED]).toContain(res.body.code);
        });
    });

    describe('Kịch bản Bảo mật & Tồn tại (4xxx, 1xxx)', () => {
        it('TC-05: 4004 | Not Found - notif_id không tồn tại trong hệ thống', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('token', VALID_USER_A_TOKEN)
                .send({ notif_id: '999999' });

            expect(res.body.code).toBe(RESPONSE_CODES.NOTIFICATION_NOT_FOUND); // 4004
        });

        it('TC-06: 3101 | Permission Denied - Người dùng A cố ý đọc thông báo của người dùng B', async () => {
            const res = await request(app)
                .post(endpoint)
                .set('token', VALID_USER_A_TOKEN) // Token A
                .send({ notif_id: notifIdB }); // ID của B

            // Chặn thao tác truy cập chéo dữ liệu
            expect([RESPONSE_CODES.PERMISSION_DENIED, '1009']).toContain(res.body.code);
        });
    });

    describe('Kịch bản Lỗi Hệ thống (9xxx)', () => {
        it('TC-07: 9902 | DB Query Failed - Lỗi khi thực thi lệnh Update', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Update failed');
            });

            const res = await request(app)
                .post(endpoint)
                .set('token', VALID_USER_A_TOKEN)
                .send({ notif_id: notifIdA });

            expect(res.body.code).toBe(RESPONSE_CODES.DATABASE_QUERY_FAILED); // 9902
            spy.mockRestore();
        });
    });
});