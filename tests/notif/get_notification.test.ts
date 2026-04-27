import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API get_notification (Lấy danh sách thông báo)', () => {
    const endpoint = '/api/notif/get_notification';
    const VALID_USER_ID = 1005;
    const VALID_TOKEN = '1005'; // Đổi token thành số string để DB không crash
    const NO_DATA_USER_ID = 1006;
    const NO_DATA_TOKEN = '1006';

    beforeAll(async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY, user_id INT NOT NULL, title TEXT, body TEXT, type TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query("INSERT INTO users (id, phone, password_hash, full_name) VALUES ($1, $2, 'hash', 'User A') ON CONFLICT DO NOTHING", [VALID_USER_ID, VALID_TOKEN]);
        await db.query("INSERT INTO users (id, phone, password_hash, full_name) VALUES ($1, $2, 'hash', 'User B') ON CONFLICT DO NOTHING", [NO_DATA_USER_ID, NO_DATA_TOKEN]);
        await db.query("DELETE FROM notifications WHERE user_id IN ($1, $2)", [VALID_USER_ID, NO_DATA_USER_ID]);

        for (let i = 1; i <= 15; i++) {
            await db.query("INSERT INTO notifications (user_id, title, body, type, is_read) VALUES ($1, $2, $3, $4, $5)", [VALID_USER_ID, `Title ${i}`, `Body ${i}`, i % 2 === 0 ? 'system' : 'alert', false]);
        }
    });

    describe('Kịch bản Lỗi Client & Tham số (2xxx, 3xxx)', () => {
        it('TC-01: 3003/2001 | Unauthenticated - Không truyền token', async () => {
            const res = await request(app).get(endpoint).query({ index: 0, count: 10 });
            expect([RESPONSE_CODES.UNAUTHENTICATED, RESPONSE_CODES.MISSING_PARAM]).toContain(res.body.code); 
        });

        it('TC-02: 2001 | Missing Param - Không truyền count', async () => {
            const res = await request(app).get(endpoint).set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).query({ index: 0, user_id: VALID_USER_ID });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-03: 2003 | Invalid Value - index là số âm', async () => {
            const res = await request(app).get(endpoint).set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).query({ index: -1, count: 10, user_id: VALID_USER_ID });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
        });
    });

    describe('Kịch bản Thành công (1000)', () => {
        it('TC-04: 1000 | OK - Lấy danh sách phân trang', async () => {
            const res = await request(app).get(endpoint).set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).query({ index: 0, count: 10, user_id: VALID_USER_ID });
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('TC-05: 1000 | OK - Trả về mảng rỗng nếu không có thông báo', async () => {
            const res = await request(app).get(endpoint).set('token', NO_DATA_TOKEN).set('user_id', NO_DATA_TOKEN).query({ index: 0, count: 10, user_id: NO_DATA_USER_ID });
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.data).toEqual([]);
        });
    });

    describe('Kịch bản Lỗi Hệ thống (9xxx)', () => {
        it('TC-07: 9902 | Database query failed - Lỗi cú pháp SQL', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => { throw new Error('syntax error'); });
            const res = await request(app).get(endpoint).set('token', VALID_TOKEN).set('user_id', VALID_TOKEN).query({ index: 0, count: 10, user_id: VALID_USER_ID });
            expect([RESPONSE_CODES.DB_QUERY_FAILED, '5000']).toContain(res.body.code);
            spy.mockRestore();
        });
    });
});