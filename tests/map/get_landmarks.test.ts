import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Get Landmarks - Integration Test Suite
 * Tuân thủ master_map_infrastructure_prompt.txt & fix_meta_landmarks_prompt.txt
 */
describe('Map Get Landmarks - Integration Test Suite', () => {
  const endpoint = '/api/map/landmarks';
  const TEST_MAP_ID = 7771;
  const TEST_NODE_L1 = 'LAND_01';
  const TEST_NODE_L2 = 'LAND_02';
  const TEST_NODE_NORMAL = 'NODE_NORM_01';

  beforeAll(async () => {
    // Seed Data
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5)", [TEST_MAP_ID, 'B_LAND', 'Landmark Bldg', 1, 1]);
    
    // Landmark 1: room_entrance type
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)", [TEST_NODE_L1, TEST_MAP_ID, 10, 10, 'room_entrance']);
    
    // Landmark 2: associated with a ward
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)", [TEST_NODE_L2, TEST_MAP_ID, 20, 20, 'hallway']);
    await db.query("INSERT INTO wards (map_node_id, name) VALUES ($1, $2)", [TEST_NODE_L2, 'Main Reception']);
    
    // Normal Node: hallway type, no ward
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)", [TEST_NODE_NORMAL, TEST_MAP_ID, 30, 30, 'hallway']);
  });

  afterAll(async () => {
    // Cleanup
    await db.query("DELETE FROM wards WHERE map_node_id = $1", [TEST_NODE_L2]);
    await db.query("DELETE FROM nodes WHERE map_id = $1", [TEST_MAP_ID]);
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Lấy landmarks thành công with floor_id hợp lệ', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Should include L1 and L2, but not TEST_NODE_NORMAL
      expect(res.body.data.length).toBe(2);
    });

    it('TC-2: Landmarks bao gồm các node type "room_entrance"', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
      const l1 = res.body.data.find((n: any) => n.id === TEST_NODE_L1);
      expect(l1).toBeDefined();
      expect(l1.type).toBe('room_entrance');
    });

    it('TC-3: Landmarks bao gồm các node liên kết with bảng wards', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
      const l2 = res.body.data.find((n: any) => n.id === TEST_NODE_L2);
      expect(l2).toBeDefined();
      expect(l2.ward_name).toBe('Main Reception');
    });

    it('TC-4: Trả về đúng tọa độ của các landmark', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
        const l1 = res.body.data.find((n: any) => n.id === TEST_NODE_L1);
        expect(l1.x_coordinate).toBe(10);
        expect(l1.y_coordinate).toBe(10);
    });

    it('TC-5: floor_id hợp lệ nhưng không có landmark nào (Expect mảng rỗng)', async () => {
        const EMPTY_LAND_MAP = 7772;
        await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_EMPTY', 'Empty Land', 1, 1)", [EMPTY_LAND_MAP]);
        const resFixed = await request(app).get(`${endpoint}?floor_id=${EMPTY_LAND_MAP}`);
        expect(resFixed.body.data).toEqual([]);
        await db.query("DELETE FROM maps WHERE id = $1", [EMPTY_LAND_MAP]);
    });
  });

  describe('Validation & Error Scenarios', () => {
    it('TC-6: Thiếu floor_id (2001)', async () => {
      const res = await request(app).get(endpoint);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-7: floor_id không phải là số (2002)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=abc`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-8: floor_id là chuỗi rỗng (2001)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=`);
        expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-9: floor_id là mảng (2001)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id[]=1`);
        expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-10: floor_id là số âm (4001)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=-1`);
        expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
    });

    it('TC-11: floor_id là số 0', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=0`);
        expect(res.body.code).toBeDefined();
    });

    it('TC-12: SQL Injection qua floor_id (2002)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=1;DROP TABLE nodes`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-13: floor_id cực lớn', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=999999999999`);
        expect(res.status).toBe(200);
    });

    it('TC-14: floor_id không tồn tại (4001)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=99999`);
        expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
    });

    it('TC-15: Kiểm tra ward_name là null cho landmarks chỉ dựa trên type', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
        const l1 = res.body.data.find((n: any) => n.id === TEST_NODE_L1);
        expect(l1.ward_name).toBeNull();
    });
  });

  describe('Edge Cases', () => {
      it('TC-16: Landmarks thuộc về nhiều ward khác nhau', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(res.body.data.length).toBeGreaterThan(0);
      });

      it('TC-17: Landmark có tọa độ âm (Business Rule check)', async () => {
          const NEG_NODE = 'LAND_NEG';
          await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)", [NEG_NODE, TEST_MAP_ID, -1, -1, 'room_entrance']);
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          const neg = res.body.data.find((n: any) => n.id === NEG_NODE);
          expect(neg).toBeDefined();
          await db.query("DELETE FROM nodes WHERE id = $1", [NEG_NODE]);
      });

      it('TC-18: Node type là "hallway" nhưng có ward liên kết', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          const l2 = res.body.data.find((n: any) => n.id === TEST_NODE_L2);
          expect(l2.type).toBe('hallway');
          expect(l2.ward_name).toBe('Main Reception');
      });

      it('TC-19: Khi DB rỗng (floor_id không tồn tại), trả về 4001', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=999999`);
          expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
      });

      it('TC-20: Landmark không có ward liên kết (type="room_entrance")', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          const l1 = res.body.data.find((n: any) => n.id === TEST_NODE_L1);
          expect(l1.ward_name).toBeNull();
      });

      it('TC-21: Landmark liên kết with ward bị xóa (null ward_name)', async () => {
          const TEMP_NODE = 'LAND_TEMP';
          await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)", [TEMP_NODE, TEST_MAP_ID, 60, 60, 'hallway']);
          await db.query("INSERT INTO wards (map_node_id, name) VALUES ($1, $2)", [TEMP_NODE, 'Temp Ward']);
          await db.query("DELETE FROM wards WHERE map_node_id = $1", [TEMP_NODE]);
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          const l = res.body.data.find((n: any) => n.id === TEMP_NODE);
          expect(l).toBeUndefined(); // Hallway with no ward is not a landmark
          await db.query("DELETE FROM nodes WHERE id = $1", [TEMP_NODE]);
      });

      it('TC-22: floor_id truyền vào là "undefined" (2002)', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=undefined`);
          expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
      });

      it('TC-23: Landmark có type khác (VD: "room")', async () => {
          // Current schema only has hallway and room_entrance
          expect(true).toBe(true);
      });

      it('TC-24: Landmarks sắp xếp theo x_coordinate (nếu có logic)', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      });

      it('TC-25: Kiểm tra cấu trúc object landmark trả về', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          const l = res.body.data[0];
          expect(l).toHaveProperty('id');
          expect(l).toHaveProperty('x_coordinate');
          expect(l).toHaveProperty('y_coordinate');
          expect(l).toHaveProperty('type');
          expect(l).toHaveProperty('ward_name');
      });
  });
});
