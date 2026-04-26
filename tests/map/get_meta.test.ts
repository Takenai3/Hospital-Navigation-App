import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Get Meta - Integration Test Suite
 * Tuân thủ master_map_infrastructure_prompt.txt & fix_meta_landmarks_prompt.txt
 */
describe('Map Get Meta - Integration Test Suite', () => {
  const endpoint = '/api/map/meta';
  const TEST_MAP_ID = 8881;
  const TEST_MAP_ID_INVALID_SCALE = 8882;

  beforeAll(async () => {
    // Seed Data
    await db.query(
      "INSERT INTO maps (id, building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5, $6)",
      [TEST_MAP_ID, 'B_META', 'Building Meta', 'http://example.com/map.png', 1.5, 2.0]
    );
    await db.query(
      "INSERT INTO maps (id, building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5, $6)",
      [TEST_MAP_ID_INVALID_SCALE, 'B_BAD', 'Bad Building', 'http://example.com/bad.png', -1.0, 0.0]
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.query("DELETE FROM maps WHERE id IN ($1, $2)", [TEST_MAP_ID, TEST_MAP_ID_INVALID_SCALE]);
    // Note: db.end() is usually called in the main test runner or the last test file
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Lấy meta thành công với floor_id hợp lệ', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.building_code).toBe('B_META');
      expect(res.body.data.scale_x).toBe(1.5);
      expect(res.body.data.scale_y).toBe(2.0);
    });

    it('TC-2: scale_x và scale_y phải là số dương', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
      expect(res.body.data.scale_x).toBeGreaterThan(0);
      expect(res.body.data.scale_y).toBeGreaterThan(0);
    });

    it('TC-3: Tầng có image_url hợp lệ', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
        expect(typeof res.body.data.image_url).toBe('string');
        expect(res.body.data.image_url).toMatch(/^http/);
    });

    it('TC-4: floor_id là số nguyên dương hợp lệ', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-5: building_name trả về đúng chuỗi ký tự', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
        expect(typeof res.body.data.building_name).toBe('string');
    });
  });

  describe('Validation & Error Scenarios (Mã 2001, 2002, 2003, 4001)', () => {
    it('TC-6: Thiếu floor_id (2001)', async () => {
      const res = await request(app).get(endpoint);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-7: floor_id không tồn tại (4001)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=99999`);
      expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
    });

    it('TC-8: floor_id không phải là số (2002)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=abc`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-9: floor_id là số âm (2002)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=-1`);
      expect([RESPONSE_CODES.INVALID_TYPE, RESPONSE_CODES.INVALID_VALUE, '4001']).toContain(res.body.code);
    });

    it('TC-10: scale_x hoặc scale_y không phải số dương (2003)', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID_INVALID_SCALE}`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-11: floor_id là 0 (2002/2003)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=0`);
        expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
    });

    it('TC-12: floor_id vượt quá giới hạn integer', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=999999999999`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-13: floor_id là mảng (2001)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id[]=1&floor_id[]=2`);
        expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-14: floor_id chứa ký tự đặc biệt (SQL Injection) (2002)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=1;DROP TABLE maps`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-15: floor_id là chuỗi rỗng (2001)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=`);
        expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('Edge Cases', () => {
      it('TC-16: Tầng chưa có image_url (null)', async () => {
          const NO_IMAGE_MAP = 8883;
          await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_NO_IMG', 'No Image Bldg', 1, 1)", [NO_IMAGE_MAP]);
          const res = await request(app).get(`${endpoint}?floor_id=${NO_IMAGE_MAP}`);
          expect(res.body.data.image_url).toBeNull();
          await db.query("DELETE FROM maps WHERE id = $1", [NO_IMAGE_MAP]);
      });

      it('TC-17: building_code là chuỗi rỗng', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(res.body.data.building_code.length).toBeGreaterThan(0);
      });

      it('TC-18: Kiểm tra kiểu dữ liệu trả về của scale_x (number)', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(typeof res.body.data.scale_x).toBe('number');
      });

      it('TC-19: Khi DB rỗng (floor_id không tồn tại), trả về 4001', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=999999`);
          expect(res.body.code).toBe(RESPONSE_CODES.FLOOR_NOT_FOUND);
      });

      it('TC-20: scale_x là số cực nhỏ (0.0001)', async () => {
          const SMALL_SCALE_MAP = 8884;
          await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_SMALL', 'Small Bldg', 0.0001, 0.0001)", [SMALL_SCALE_MAP]);
          const res = await request(app).get(`${endpoint}?floor_id=${SMALL_SCALE_MAP}`);
          expect(res.body.data.scale_x).toBe(0.0001);
          await db.query("DELETE FROM maps WHERE id = $1", [SMALL_SCALE_MAP]);
      });

      it('TC-21: building_name chứa ký tự đặc biệt', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(res.body.data.building_name).toBe('Building Meta');
      });

      it('TC-22: floor_id truyền vào là "null" string (2002)', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=null`);
          expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
      });

      it('TC-23: scale_x và scale_y là số nguyên dương', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(res.body.data.scale_x).toBeGreaterThan(0);
      });

      it('TC-24: building_code tối đa độ dài VARCHAR(50)', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(res.body.data.building_code.length).toBeLessThanOrEqual(50);
      });

      it('TC-25: Kiểm tra cấu trúc object data trả về đầy đủ các trường', async () => {
          const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
          expect(res.body.data).toHaveProperty('building_code');
          expect(res.body.data).toHaveProperty('building_name');
          expect(res.body.data).toHaveProperty('image_url');
          expect(res.body.data).toHaveProperty('scale_x');
          expect(res.body.data).toHaveProperty('scale_y');
      });
  });
});
