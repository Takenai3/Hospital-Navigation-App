import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API read_notification', () => {
    const endpoint = '/api/notif/read_notification';
    const VALID_USER_A_ID = 1003;
    const VALID_USER_A_TOKEN = '1003';
    const VALID_USER_B_ID = 1004;
    const VALID_USER_B_TOKEN = '1004';
    let notifIdA: number; let notifIdB: number;

    beforeAll(async () => {
        await db.query("INSERT INTO users (id, phone, password_hash, full_name) VALUES ($1, $2, 'hash', 'User A') ON CONFLICT DO NOTHING", [VALID_USER_A_ID, VALID_USER_A_TOKEN]);
        await db.query("INSERT INTO users (id, phone, password_hash, full_name) VALUES ($1, $2, 'hash', 'User B') ON CONFLICT DO NOTHING", [VALID_USER_B_ID, VALID_USER_B_TOKEN]);

        let res = await db.query("INSERT INTO notifications (user_id, title, body, type, is_read) VALUES ($1, 'A', 'A', 'system', false) RETURNING id", [VALID_USER_A_ID]);
        notifIdA = res.rows[0].id;
        res = await db.query("INSERT INTO notifications (user_id, title, body, type, is_read) VALUES ($1, 'B', 'B', 'alert', false) RETURNING id", [VALID_USER_B_ID]);
        notifIdB = res.rows[0].id;
    });

    afterAll(async () => {
        await db.query("DELETE FROM notifications WHERE user_id IN ($1, $2)", [VALID_USER_A_ID, VALID_USER_B_ID]);
    });

    describe('Kịch bản Lỗi Client & Auth', () => {
        it('TC-01: Không gửi header token', async () => {
            const res = await request(app).post(endpoint).send({ notif_id: notifIdA });
            expect([RESPONSE_CODES.UNAUTHENTICATED, RESPONSE_CODES.MISSING_PARAM]).toContain(res.body.code);
        });

        it('TC-02: Không gửi notif_id', async () => {
            const res = await request(app).post(endpoint).set('token', VALID_USER_A_TOKEN).set('user_id', VALID_USER_A_TOKEN).send({ user_id: VALID_USER_A_ID });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });
    });

    describe('Kịch bản Bảo mật & Tồn tại', () => {
        it('TC-05: 4001 | Not Found', async () => {
            const res = await request(app).post(endpoint).set('token', VALID_USER_A_TOKEN).set('user_id', VALID_USER_A_TOKEN).send({ notif_id: 999999, user_id: VALID_USER_A_ID });
            expect(res.body.code).toBe('4001');
        });

        it('TC-06: Đọc chéo', async () => {
            const res = await request(app).post(endpoint).set('token', VALID_USER_A_TOKEN).set('user_id', VALID_USER_A_TOKEN).send({ notif_id: notifIdB, user_id: VALID_USER_A_ID });
            expect([RESPONSE_CODES.PERMISSION_DENIED, '1009', '4001']).toContain(res.body.code);
        });
    });
});