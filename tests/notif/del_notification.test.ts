import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Notification Module (Get & Delete)', () => {
    const VALID_USER_ID = 1001;
    const VALID_TOKEN = '1001';
    const OTHER_USER_ID = 1002;
    const OTHER_USER_TOKEN = '1002';
    let testNotifId: number;

    beforeAll(async () => {
        await db.query("INSERT INTO users (id, phone, password_hash, full_name) VALUES ($1, $2, 'hash', 'User A') ON CONFLICT DO NOTHING", [VALID_USER_ID, VALID_TOKEN]);
        await db.query("INSERT INTO users (id, phone, password_hash, full_name) VALUES ($1, $2, 'hash', 'User B') ON CONFLICT DO NOTHING", [OTHER_USER_ID, OTHER_USER_TOKEN]);

        const res = await db.query("INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, 'alert') RETURNING id", [VALID_USER_ID, 'Test Title', 'Test Content']);
        testNotifId = res.rows[0].id;
        await db.query("INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, 'system')", [OTHER_USER_ID, 'Other Title', 'Other Content']);
    });

    afterAll(async () => {
        await db.query("DELETE FROM notifications WHERE user_id IN ($1, $2)", [VALID_USER_ID, OTHER_USER_ID]);
    });

    describe('API /api/notif/del_notification', () => {
        it('TC-01: 2001 | Missing Param - Không có notif_id', async () => {
            const res = await request(app).post('/api/notif/del_notification').set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).send({ user_id: VALID_USER_ID });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-03: 3003 | Unauthenticated - Thiếu token header', async () => {
            const res = await request(app).post('/api/notif/del_notification').send({ notif_id: testNotifId });
            expect([RESPONSE_CODES.UNAUTHENTICATED, RESPONSE_CODES.MISSING_PARAM]).toContain(res.body.code);
        });

        it('TC-04: 1000 | Thành công - Xóa thông báo hợp lệ', async () => {
            const res = await request(app).post('/api/notif/del_notification').set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).send({ notif_id: testNotifId, user_id: VALID_USER_ID });
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        });

        it('TC-05: 4001 | Thất bại - Xóa lại lần 2 (Double click)', async () => {
            const res = await request(app).post('/api/notif/del_notification').set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).send({ notif_id: testNotifId, user_id: VALID_USER_ID });
            expect(res.body.code).toBe('4001');
        });

        it('TC-06: 3101 | Bảo mật - Xóa chéo dữ liệu bệnh nhân khác', async () => {
            const otherRes = await db.query("SELECT id FROM notifications WHERE user_id = $1 LIMIT 1", [OTHER_USER_ID]);
            const res = await request(app).post('/api/notif/del_notification').set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).send({ notif_id: otherRes.rows[0].id, user_id: VALID_USER_ID });
            expect([RESPONSE_CODES.PERMISSION_DENIED, '1009', '4001']).toContain(res.body.code);
        });
    });
});