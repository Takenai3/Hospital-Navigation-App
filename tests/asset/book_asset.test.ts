import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Book Asset Integration Test Suite', () => {
  const USER_TOKEN = 'user-token-99';
  const ASSET_AVAILABLE = 201;
  const ASSET_BROKEN = 202;

  beforeAll(async () => {
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ('NODE_001', 1, 0, 0, 'hallway') ON CONFLICT DO NOTHING");
    // Tạo dữ liệu xe sẵn sàng mượn
    await db.query("INSERT INTO devices (id, current_node_id, type, status) VALUES ($1, 'NODE_001', 'wheelchair', 'available')", [ASSET_AVAILABLE]);
    // Tạo dữ liệu xe hỏng
    await db.query("INSERT INTO devices (id, current_node_id, type, status) VALUES ($1, 'NODE_001', 'wheelchair', 'maintenance')", [ASSET_BROKEN]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM devices WHERE id IN ($1, $2)", [ASSET_AVAILABLE, ASSET_BROKEN]);
  });

  describe('POST /api/asset/book_asset', () => {
    const endpoint = '/api/asset/book_asset';

    it('TC-1: Luồng chuẩn - Đặt giữ xe thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_TOKEN)
        .send({ asset_id: ASSET_AVAILABLE });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0]).toHaveProperty('booking_id');

      const check = await db.query("SELECT status FROM devices WHERE id = $1", [ASSET_AVAILABLE]);
      expect(check.rows[0].status).toBe('in_use');
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
        .send({ asset_id: 999999 });

      expect(res.body.code).toBe('4004');
    });
  });
});
