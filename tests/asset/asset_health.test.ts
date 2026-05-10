import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Asset Health Integration Test Suite', () => {
  const VALID_TOKEN = 'valid-token-health';
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

  describe('GET /api/asset/asset_health', () => {
    const endpoint = '/api/asset/asset_health';

    it('TC-1: Xe hoạt động tốt - Trả về status available (1000)', async () => {
      await db.query("UPDATE devices SET status = 'available' WHERE id = $1", [ASSET_ID]);
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('1000');
      expect(res.body.data.status).toBe('available');
    });

    it('TC-2: Xe bị hỏng - Trả về status maintenance (1000)', async () => {
      await db.query("UPDATE devices SET status = 'maintenance' WHERE id = $1", [ASSET_ID]);
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('1000');
      expect(res.body.data.status).toBe('maintenance');
    });

    it('TC-3: Xe đang bảo trì - Trả về status maintenance (1000)', async () => {
      await db.query("UPDATE devices SET status = 'maintenance' WHERE id = $1", [ASSET_ID]);
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('1000');
      expect(res.body.data.status).toBe('maintenance');
    });

    it('TC-4: Thiếu tham số - Bỏ trống asset_id (2001)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN);

      expect(res.body.code).toBe('2001');
    });

    it('TC-5: Mã xe ảo - ID không tồn tại hoặc ký tự đặc biệt (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: '999999' });

      expect(res.body.code).toBe('4004');
    });
  });
});
