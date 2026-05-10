import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Report Broken Asset Integration Test Suite', () => {
  const VALID_TOKEN = 'user-token-123';
  const ASSET_ID = 101;

  beforeAll(async () => {
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES (99991, 'B1', 'Tòa nhà B1', 1.0, 1.0) ON CONFLICT DO NOTHING");
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ('NODE_TEST_1', 99991, 10.0, 10.0, 'hallway', true) ON CONFLICT DO NOTHING");
    await db.query("INSERT INTO devices (id, current_node_id, type, status) VALUES (101, 'NODE_TEST_1', 'wheelchair', 'available') ON CONFLICT DO NOTHING");
  });

  afterAll(async () => {
    await db.query("DELETE FROM devices WHERE id = 101");
    await db.query("DELETE FROM nodes WHERE id = 'NODE_TEST_1'");
    await db.query("DELETE FROM maps WHERE id = 99991");
  });

  describe('POST /api/asset/report_broken_asset', () => {
    const endpoint = '/api/asset/report_broken_asset';

    it('TC-1: Luồng chuẩn - Thành công (1000)', async () => {
      // Reset status to available
      await db.query("UPDATE devices SET status = 'available' WHERE id = $1", [ASSET_ID]);
      
      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({
          asset_id: ASSET_ID,
          reason: 'Bánh xe bị kẹt'
        });

      expect(res.body.code).toBe('1000');
      // Kiểm tra DB
      const check = await db.query("SELECT status FROM devices WHERE id = $1", [ASSET_ID]);
      expect(check.rows[0].status).toBe('maintenance');
    });

    it('TC-3: Lỗi tham số - Quên truyền reason (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('2001');
    });

    it('TC-4: Sai ID xe - Xe không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({ asset_id: 99999, reason: 'Hỏng' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: Báo lỗi trùng lặp - Xe đã ở trạng thái maintenance (1000)', async () => {
      await db.query("UPDATE devices SET status = 'maintenance' WHERE id = $1", [ASSET_ID]);

      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({ asset_id: ASSET_ID, reason: 'Lại bị hỏng' });

      expect(res.body.code).toBe('1000');
      expect(res.body.message).toContain('đã được báo hỏng');
    });
  });
});
