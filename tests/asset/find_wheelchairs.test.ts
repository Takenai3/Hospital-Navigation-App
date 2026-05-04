import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Find Wheelchair Integration Test Suite', () => {
  const VALID_TOKEN = 'valid-user-token';
  const CENTER_NODE = 'NODE_001';

  beforeAll(async () => {
    // Tạo node bản đồ
    await db.query("INSERT INTO map_nodes (id, name, floor) VALUES ($1, 'Sảnh chính', 'G')", [CENTER_NODE]);
    await db.query("INSERT INTO map_nodes (id, name, floor) VALUES ('NODE_002', 'Phòng cấp cứu', 'G')");

    // Tạo khoảng cách (50m)
    await db.query("INSERT INTO node_distances (from_node, to_node, distance) VALUES ($1, 'NODE_002', 50)", [CENTER_NODE]);

    // Tạo thiết bị mẫu
    await db.query(
      "INSERT INTO assets (asset_id, type, status, current_node_id, battery_level) VALUES ('WL-A01', 'wheelchair', 'Available', 'NODE_002', 85)"
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM assets WHERE asset_id = 'WL-A01'");
    await db.query("DELETE FROM node_distances WHERE from_node = $1", [CENTER_NODE]);
    await db.query("DELETE FROM map_nodes WHERE id IN ($1, 'NODE_002')", [CENTER_NODE]);
  });

  describe('GET /api/asset/find_wheelchairs', () => {
    const endpoint = '/api/asset/find_wheelchairs';

    it('TC-1: Tìm thấy xe lăn trống xung quanh (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ node_id: CENTER_NODE, radius: 100 });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].asset_id).toBe('WL-A01');
    });

    it('TC-2: Không có xe nào trống trong khu vực (1000 - data [])', async () => {
      // Giả lập tìm ở một node hẻo lánh không có xe
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ node_id: CENTER_NODE, radius: 10 }); // Bán kính quá nhỏ

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
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

    it('TC-6: Token hết hạn (3002)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', 'expired-token')
        .query({ node_id: CENTER_NODE });

      expect(res.body.code).toBe('3002');
    });
  });
});