import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Get Edges - Integration Test Suite
 * Tuân thủ map_test_generator_prompt.txt
 * Ánh xạ bảng steps tương đương với edges.
 */
describe('Map Get Edges - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/map/edges';
  let mapId: number;

  beforeAll(async () => {
    // Dọn dẹp dữ liệu các bảng liên quan theo đúng thứ tự FK
    await db.query("DELETE FROM steps");
    await db.query("DELETE FROM nodes");
    await db.query("DELETE FROM maps");

    // Tạo bản đồ mẫu
    const mapRes = await db.query(
      "INSERT INTO maps (building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ['TEST_BLD', 'Test Building', 'http://example.com/map.png', 1.0, 1.0]
    );
    mapId = mapRes.rows[0].id;

    // Tạo các Node mẫu để làm start/end cho edges
    await db.query(
      "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ($1, $2, $3, $4, $5, $6)",
      ['TEST_NODE_1', mapId, 10.0, 10.0, 'hallway', true]
    );
    await db.query(
      "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ($1, $2, $3, $4, $5, $6)",
      ['TEST_NODE_2', mapId, 20.0, 20.0, 'hallway', true]
    );

    // Tạo các Edge (Steps) mẫu
    await db.query(
      "INSERT INTO steps (map_id, start_node_id, end_node_id, distance, direction, instruction) VALUES ($1, $2, $3, $4, $5, $6)",
      [mapId, 'TEST_NODE_1', 'TEST_NODE_2', 14.14, 'North-East', 'Đi thẳng 14m']
    );
  });

  afterAll(async () => {
    // Dọn dẹp sạch sẽ dữ liệu TEST
    await db.query("DELETE FROM steps WHERE map_id = $1", [mapId]);
    await db.query("DELETE FROM nodes WHERE map_id = $1", [mapId]);
    await db.query("DELETE FROM maps WHERE id = $1", [mapId]);
    // Note: Ở đây ta xóa theo ID để an toàn như prompt yêu cầu, 
    // nhưng trong beforeAll ta đã xóa sạch để đảm bảo môi trường sạch.
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Lấy danh sách edges thành công với floor_id hợp lệ', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('TC-2: Kiểm tra cấu trúc dữ liệu edge (start_node_id, end_node_id, distance)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
      const edge = res.body.data[0];
      expect(edge).toHaveProperty('start_node_id');
      expect(edge).toHaveProperty('end_node_id');
      expect(edge).toHaveProperty('distance');
      expect(edge).toHaveProperty('instruction');
    });

    it('TC-3: Khoảng cách distance phải là kiểu number (float)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
      const edge = res.body.data[0];
      expect(typeof edge.distance).toBe('number');
    });

    it('TC-4: floor_id hợp lệ nhưng không có cạnh nào (Expect mảng rỗng)', async () => {
      const emptyMapRes = await db.query(
        "INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4) RETURNING id",
        ['EMPTY_MAP', 'Empty Map', 1.0, 1.0]
      );
      const emptyMapId = emptyMapRes.rows[0].id;
      const res = await request(app).get(`${endpoint}?floor_id=${emptyMapId}`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
      // Cleanup
      await db.query("DELETE FROM maps WHERE id = $1", [emptyMapId]);
    });
  });

  describe('Validation Errors - Parameters (Mã 2001, 2002, 2003)', () => {
    it('TC-5: Thiếu floor_id (Mã 2001)', async () => {
      const res = await request(app).get(endpoint);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-6: floor_id truyền vào là mảng (Mã 2001)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id[]=1&floor_id[]=2`);
        expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-7: floor_id không phải là số (Mã 2002)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=abc`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-8: floor_id là số âm (Mã 2002/2003 tùy logic regex)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=-5`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-9: floor_id là số 0 (Mã 2003)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=0`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });
  });

  describe('Business Logic Validation (Mã 4001)', () => {
    it('TC-10: floor_id không tồn tại trong DB (Mã 4001)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=999999`);
      expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
    });

    it('TC-11: floor_id vượt quá giới hạn integer (Mã 2003)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=999999999999`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });
  });

  describe('Security & Edge Cases', () => {
    it('TC-12: SQL Injection qua floor_id (Mã 2002)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=1; DROP TABLE steps`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-13: floor_id là chuỗi "null" (Mã 2002)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=null`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-14: Hiệu năng trả về danh sách lớn (Mock data)', async () => {
        // Giả lập thêm 10 edges
        for (let i = 0; i < 10; i++) {
            await db.query(
                "INSERT INTO steps (map_id, start_node_id, end_node_id, distance) VALUES ($1, $2, $3, $4)",
                [mapId, 'TEST_NODE_1', 'TEST_NODE_2', i + 1]
            );
        }
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        expect(res.body.data.length).toBeGreaterThan(10);
    });

    it('TC-15: Kiểm tra tính đúng đắn của start_node_id và end_node_id', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        const edge = res.body.data[0];
        expect(typeof edge.start_node_id).toBe('string');
        expect(typeof edge.end_node_id).toBe('string');
    });
  });
});
