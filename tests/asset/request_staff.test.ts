import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Request Staff Integration Test Suite', () => {
  const USER_A_TOKEN = 'user-a-token';
  const ASSET_ID = 501;
  const NODE_ID = 'ROOM-302';

  beforeAll(async () => {
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ('NODE_001', 1, 0, 0, 'hallway') ON CONFLICT DO NOTHING");
    await db.query("INSERT INTO devices (id, current_node_id, type, status) VALUES ($1, 'NODE_001', 'wheelchair', 'in_use')", [ASSET_ID]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM devices WHERE id = $1", [ASSET_ID]);
  });

  describe('POST /api/staff/request_staff', () => {
    const endpoint = '/api/staff/request_staff';

    it('TC-1: Luồng chuẩn - Gọi nhân viên thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({
          asset_id: ASSET_ID,
          node_id: NODE_ID,
          note: 'Bệnh nhân cần người đẩy giúp'
        });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0]).toHaveProperty('request_id');
    });

    it('TC-2: Bỏ qua tùy chọn note vẫn thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({
          asset_id: ASSET_ID,
          node_id: NODE_ID
        });

      expect(res.body.code).toBe('1000');
    });

    it('TC-3: Lỗi vị trí - Quên truyền node_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('2001');
    });

    it('TC-4: Sai ID xe - Xe không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: 999999, node_id: NODE_ID });

      expect(res.body.code).toBe('4004');
    });
  });
});
