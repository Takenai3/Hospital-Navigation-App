import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Find Wheelchair Integration Test Suite', () => {
  const VALID_TOKEN = 'valid-user-token';
  const CENTER_NODE = 'NODE_001';
  const ASSET_ID = 301;

  beforeAll(async () => {
    // Seed nodes
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, 1, 0, 0, 'hallway') ON CONFLICT DO NOTHING", [CENTER_NODE]);
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ('NODE_002', 1, 10, 10, 'hallway') ON CONFLICT DO NOTHING");

    // Tạo thiết bị mẫu
    await db.query(
      "INSERT INTO devices (id, current_node_id, type, status) VALUES ($1, 'NODE_002', 'wheelchair', 'available')", [ASSET_ID]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM devices WHERE id = $1", [ASSET_ID]);
    await db.query("DELETE FROM nodes WHERE id IN ($1, 'NODE_002')", [CENTER_NODE]);
  });

  describe('GET /api/asset/find_wheelchairs', () => {
    const endpoint = '/api/asset/find_wheelchairs';

    it('TC-1: Tìm thấy xe lăn trống xung quanh (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ node_id: CENTER_NODE });

      expect(res.body.code).toBe('1000');
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].asset_id).toBe(ASSET_ID.toString());
    });

    it('TC-3: Thiếu tham số node_id (2001)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN);

      expect(res.body.code).toBe('2001');
    });

    it('TC-4: node_id không tồn tại (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ node_id: 'INVALID_ID' });

      expect(res.body.code).toBe('4004');
    });
  });
});
