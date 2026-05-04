import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Book Asset Integration Test Suite', () => {
  const USER_TOKEN = 'user-token-99';
  const ASSET_AVAILABLE = 'WL-OK-01';
  const ASSET_BROKEN = 'WL-BROKEN-01';

  beforeAll(async () => {
    // Tạo dữ liệu xe sẵn sàng mượn
    await db.query("INSERT INTO assets (asset_id, status) VALUES ($1, 'Available')", [ASSET_AVAILABLE]);
    // Tạo dữ liệu xe hỏng
    await db.query("INSERT INTO assets (asset_id, status) VALUES ($1, 'Broken')", [ASSET_BROKEN]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM bookings WHERE user_token = $1", [USER_TOKEN]);
    await db.query("DELETE FROM assets WHERE asset_id IN ($1, $2)", [ASSET_AVAILABLE, ASSET_BROKEN]);
  });

  describe('POST /api/asset/book_asset', () => {
    const endpoint = '/api/asset/book_asset';

    it('TC-1: Luồng chuẩn - Đặt giữ xe thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_TOKEN)
        .send({ asset_id: ASSET_AVAILABLE });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data[0]).toHaveProperty('booking_id');

      // Kiểm tra trạng thái xe đã đổi sang In-use chưa
      const check = await db.query("SELECT status FROM assets WHERE asset_id = $1", [ASSET_AVAILABLE]);
      expect(check.rows[0].status).toBe('In-use');
    });

    it('TC-2 & TC-6: Cố tình mượn thêm xe thứ 2 (1010)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_TOKEN)
        .send({ asset_id: 'WL-ANY' });

      expect(res.body.code).toBe('1010');
    });

    it('TC-3: Mượn xe đang bị hỏng (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', 'other-user-token')
        .send({ asset_id: ASSET_BROKEN });

      expect(res.body.code).toBe('1009');
    });

    it('TC-4: Bỏ trống tham số asset_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_TOKEN)
        .send({});

      expect(res.body.code).toBe('2001');
    });

    it('TC-5: asset_id không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', 'new-token')
        .send({ asset_id: 'NON-EXIST' });

      expect(res.body.code).toBe('4004');
    });
  });
});