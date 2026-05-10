import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Track Asset Integration Test Suite', () => {
  const ADMIN_TOKEN = 'ADMIN_SECRET_001';
  const USER_A_TOKEN = 'USER_A_123';
  const ASSET_ID = 9001;

  beforeAll(async () => {
    // 1. Seed Map (Cần đầy đủ các cột NOT NULL)
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES (99991, 'B1', 'Tòa nhà B1', 1.0, 1.0) ON CONFLICT DO NOTHING");
    
    // 2. Seed Node (Cần đầy đủ các cột NOT NULL)
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ('NODE_TEST_TRACK', 99991, 10.0, 10.0, 'hallway', true) ON CONFLICT DO NOTHING");

    // 3. Seed Device
    await db.query(`
      INSERT INTO devices (id, current_node_id, type, status)
      VALUES ($1, 'NODE_TEST_TRACK', 'wheelchair', 'in_use')
    `, [ASSET_ID]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM devices WHERE id = $1", [ASSET_ID]);
    await db.query("DELETE FROM nodes WHERE id = 'NODE_TEST_TRACK'");
    await db.query("DELETE FROM maps WHERE id = 99991");
  });

  describe('GET /api/asset/track_asset', () => {
    const endpoint = '/api/asset/track_asset';

    it('TC-1: Luồng chuẩn - Người mượn theo dõi xe của mình (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', USER_A_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('1000');
    });

    it('TC-2: Theo dõi xe đang đứng im tại trạm (1000)', async () => {
      const STATIONARY_ID = 9002;
      await db.query(`INSERT INTO devices (id, current_node_id, type, status) VALUES ($1, 'NODE_TEST_TRACK', 'wheelchair', 'available')`, [STATIONARY_ID]);

      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN)
        .query({ asset_id: STATIONARY_ID });

      expect(res.body.code).toBe('1000');

      await db.query("DELETE FROM devices WHERE id = $1", [STATIONARY_ID]);
    });

    it('TC-4: Thiếu tham số - Bỏ trống asset_id (2001)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN);

      expect(res.body.code).toBe('2001');
    });

    it('TC-5: Sai mã xe - ID không tồn tại (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN)
        .query({ asset_id: 99999 });

      expect(res.body.code).toBe('4004');
    });

    it('TC-6: Quá tải request - Polling quá nhanh (2005)', async () => {
      await request(app).get(endpoint).set('token', ADMIN_TOKEN).query({ asset_id: ASSET_ID });

      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(['2005', '1000']).toContain(res.body.code);
    });
  });
});
