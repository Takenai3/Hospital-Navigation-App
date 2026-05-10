import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Release Asset Integration Test Suite', () => {
  const USER_A_TOKEN = 'user-a-token';
  const ASSET_ID = 401;

  beforeAll(async () => {
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ('NODE_001', 1, 0, 0, 'hallway') ON CONFLICT DO NOTHING");
    await db.query("INSERT INTO devices (id, current_node_id, type, status) VALUES ($1, 'NODE_001', 'wheelchair', 'in_use')", [ASSET_ID]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM devices WHERE id = $1", [ASSET_ID]);
  });

  describe('POST /api/asset/release_asset', () => {
    const endpoint = '/api/asset/release_asset';

    it('TC-1: Luồng chuẩn - Trả xe thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('1000');

      const check = await db.query("SELECT status FROM devices WHERE id = $1", [ASSET_ID]);
      expect(check.rows[0].status).toBe('available');
    });

    it('TC-5: Thiếu tham số bắt buộc (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({});

      expect(res.body.code).toBe('2001');
    });

    it('TC-4: asset_id không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: 999999 });

      expect(res.body.code).toBe('4004');
    });
  });
});
