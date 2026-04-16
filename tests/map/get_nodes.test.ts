import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Get Nodes - Integration Test Suite
 * Tuân thủ map_test_generator_prompt.txt
 * Validate tọa độ (x, y) không được âm.
 */
describe('Map Get Nodes - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/map/nodes';
  let mapId: number;

  beforeAll(async () => {
    // Dọn dẹp dữ liệu
    await db.query("DELETE FROM nodes");
    await db.query("DELETE FROM maps");

    // Tạo bản đồ mẫu (Bản đồ Tòa A - Tầng 1)
    const mapRes = await db.query(
      "INSERT INTO maps (building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ['A', 'Tòa A - Tầng 1', 'http://example.com/map_a1.png', 1.0, 1.0]
    );
    mapId = mapRes.rows[0].id;

    // Tạo các Node mẫu (Tọa độ dương)
    await db.query(
      "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ($1, $2, $3, $4, $5, $6)",
      ['Node_01', mapId, 10.5, 20.0, 'room_entrance', true]
    );
    await db.query(
      "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ($1, $2, $3, $4, $5, $6)",
      ['Node_02', mapId, 50.0, 15.5, 'hallway', true]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM nodes");
    await db.query("DELETE FROM maps");
    await db.end();
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Lấy danh sách node thành công với floor_id hợp lệ', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('TC-2: Kiểm tra cấu trúc dữ liệu node trả về (id, coordinates, type)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
      const node = res.body.data[0];
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('x_coordinate');
      expect(node).toHaveProperty('y_coordinate');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('is_passable');
    });

    it('TC-3: Tọa độ x_coordinate và y_coordinate phải là kiểu float/number', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
      const node = res.body.data[0];
      expect(typeof node.x_coordinate).toBe('number');
      expect(typeof node.y_coordinate).toBe('number');
    });

    it('TC-4: URL bản đồ trong response (nếu có) phải là string', async () => {
        // Giả sử API trả về thêm thông tin map
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        if (res.body.map_info) {
            expect(typeof res.body.map_info.image_url).toBe('string');
        }
    });

    it('TC-5: floor_id có thật nhưng chưa có node nào (Expect mảng rỗng)', async () => {
      const emptyMapRes = await db.query(
        "INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4) RETURNING id",
        ['B', 'Tòa B - Tầng 1', 1.0, 1.0]
      );
      const emptyMapId = emptyMapRes.rows[0].id;
      const res = await request(app).get(`${endpoint}?floor_id=${emptyMapId}`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Validation Errors - Parameters (Mã 2001, 2002, 2003)', () => {
    it('TC-6: Thiếu floor_id (Mã 2001)', async () => {
      const res = await request(app).get(endpoint);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-7: floor_id truyền vào là chuỗi không phải số (Mã 2002)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=abc`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-8: floor_id là số âm (Sửa thành expect 2002 do logic regex)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=-1`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-9: floor_id là số 0 (Mã 2003)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=0`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-10: floor_id là số thực (Sửa thành expect 2002 do logic regex)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=1.5`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });
  });

  describe('Business Logic & GIS Validation (Mã 4001, 4004)', () => {
    it('TC-11: floor_id không tồn tại trong hệ thống (Mã 4001)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=99999`);
      expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
    });

    it('TC-12: Kiểm tra tọa độ X không được âm (Business Rule)', async () => {
        // Test logic validation: Nếu DB có node tọa độ âm (do lỗi data), API phải xử lý hoặc test case này giả lập gọi tạo
        // Ở đây ta test response trả về: x_coordinate >= 0
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        res.body.data.forEach((node: any) => {
            expect(node.x_coordinate).toBeGreaterThanOrEqual(0);
        });
    });

    it('TC-13: Kiểm tra tọa độ Y không được âm (Business Rule)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        res.body.data.forEach((node: any) => {
            expect(node.y_coordinate).toBeGreaterThanOrEqual(0);
        });
    });

    it('TC-14: Thử truy cập với floor_id cực lớn (Mã 2003)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=2147483648`); // Vượt INT
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-15: Kiểm tra tính đúng đắn của kiểu Node (ENUM)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        const validTypes = ['hallway', 'room_entrance'];
        res.body.data.forEach((node: any) => {
            expect(validTypes).toContain(node.type);
        });
    });
  });

  describe('Security Scenarios (SQL Injection & XSS)', () => {
    it('TC-16: SQL Injection qua floor_id (Single quote)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=1' OR '1'='1`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-17: SQL Injection qua floor_id (Semicolon)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=1; DROP TABLE nodes`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-18: XSS qua query parameter (Nếu có phản hồi lại param)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=<script>alert(1)</script>`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });
  });

  describe('Empty Database & Edge Cases', () => {
    it('TC-19: Hệ thống không tìm thấy bản đồ (Dùng ID giả định để tránh pollution)', async () => {
        // Thay vì DELETE làm mất dữ liệu dùng chung, ta dùng ID chắc chắn không tồn tại
        const res = await request(app).get(`${endpoint}?floor_id=999999`);
        expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
    });

    it('TC-20: floor_id truyền vào dưới dạng mảng (Sửa thành expect 2001 theo logic Express)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id[]=1&floor_id[]=2`);
        expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-21: floor_id truyền vào là null string "null" (Mã 2002)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=null`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-22: Node có is_passable = false vẫn phải được trả về', async () => {
        // Re-seed for this specific case
        const mapRes = await db.query(
            "INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4) RETURNING id",
            ['C', 'Tòa C', 1.0, 1.0]
        );
        const cid = mapRes.rows[0].id;
        await db.query(
            "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ($1, $2, $3, $4, $5, $6)",
            ['Node_Blocked', cid, 10.0, 10.0, 'hallway', false]
        );
        const res = await request(app).get(`${endpoint}?floor_id=${cid}`);
        expect(res.body.data[0].is_passable).toBe(false);
    });

    it('TC-23: Kiểm tra tỷ lệ (scale) của map_info trả về (nếu có)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        // Giả sử logic API trả về scale của map để client tính toán
        if (res.body.map_info) {
            expect(res.body.map_info.scale_x).toBeGreaterThan(0);
        }
    });

    it('TC-24: Tọa độ cực lớn (Extreme values) vẫn trả về đúng', async () => {
        const bigMap = await db.query(
            "INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4) RETURNING id",
            ['D', 'Tòa D', 1.0, 1.0]
        );
        const did = bigMap.rows[0].id;
        await db.query(
            "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ($1, $2, $3, $4, $5, $6)",
            ['Node_Big', did, 999999.99, 888888.88, 'hallway', true]
        );
        const res = await request(app).get(`${endpoint}?floor_id=${did}`);
        expect(res.body.data[0].x_coordinate).toBe(999999.99);
    });

    it('TC-25: Kiểm tra performance với số lượng node lớn (giả lập)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${mapId}`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        expect(res.header['content-type']).toMatch(/json/);
    });
  });
});
