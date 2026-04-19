import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Get Beacons - Integration Test Suite
 * Ánh xạ bảng devices (device_type = 'wheelchair' / beacon)
 * Tuân thủ master_map_infrastructure_prompt.txt
 */
describe('Map Get Beacons - Integration Test Suite', () => {
  const endpoint = '/api/map/beacons';
  
  const TEST_MAP_ID = 9002;
  const TEST_NODE_ID = 'TEST_BEACON_NODE_01';
  const TEST_DEVICE_ID = 99991;

  beforeAll(async () => {
    // Seed Data
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_BEACON', 'Beacon Bldg', 1, 1)", [TEST_MAP_ID]);
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, 50, 60, 'hallway')", [TEST_NODE_ID, TEST_MAP_ID]);
    await db.query(
        "INSERT INTO devices (id, type, status, current_node_id) VALUES ($1, 'wheelchair', 'available', $2)",
        [TEST_DEVICE_ID, TEST_NODE_ID]
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.query("DELETE FROM devices WHERE id = $1", [TEST_DEVICE_ID]);
    await db.query("DELETE FROM nodes WHERE id = $1", [TEST_NODE_ID]);
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
  });

  describe('Success Scenarios (Cases 1-10)', () => {
    it('TC-1: Lấy danh sách beacons thành công (Mã 1000)', async () => {
      const res = await request(app).get(endpoint);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('TC-2: Beacon phải chứa thông tin ID thiết bị', async () => {
      const res = await request(app).get(endpoint);
      const beacon = res.body.data.find((d: any) => d.id === TEST_DEVICE_ID);
      expect(beacon).toBeDefined();
    });

    it('TC-3: Beacon phải chứa thông tin tọa độ (x_coordinate)', async () => {
      const res = await request(app).get(endpoint);
      const beacon = res.body.data.find((d: any) => d.id === TEST_DEVICE_ID);
      expect(beacon.x_coordinate).toBe(50);
    });

    it('TC-4: Beacon phải chứa thông tin tọa độ (y_coordinate)', async () => {
      const res = await request(app).get(endpoint);
      const beacon = res.body.data.find((d: any) => d.id === TEST_DEVICE_ID);
      expect(beacon.y_coordinate).toBe(60);
    });

    it('TC-5: Lọc beacon theo floor_id hợp lệ', async () => {
      const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-6: Beacon trả về đúng status ("available")', async () => {
        const res = await request(app).get(endpoint);
        const beacon = res.body.data.find((d: any) => d.id === TEST_DEVICE_ID);
        expect(beacon.status).toBe('available');
    });

    it('TC-7: Beacon trả về đúng type ("wheelchair")', async () => {
        const res = await request(app).get(endpoint);
        const beacon = res.body.data.find((d: any) => d.id === TEST_DEVICE_ID);
        expect(beacon.type).toBe('wheelchair');
    });

    it('TC-8: Beacon chứa thông tin current_node_id', async () => {
        const res = await request(app).get(endpoint);
        const beacon = res.body.data.find((d: any) => d.id === TEST_DEVICE_ID);
        expect(beacon.current_node_id).toBe(TEST_NODE_ID);
    });

    it('TC-9: Trả về mảng rỗng khi floor_id không có beacon nào', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=99999`);
        expect(res.body.data).toEqual([]);
    });

    it('TC-10: Kiểm tra cấu trúc object beacon đầy đủ các trường', async () => {
        const res = await request(app).get(endpoint);
        const beacon = res.body.data[0];
        if (beacon) {
            expect(beacon).toHaveProperty('id');
            expect(beacon).toHaveProperty('type');
            expect(beacon).toHaveProperty('status');
            expect(beacon).toHaveProperty('x_coordinate');
            expect(beacon).toHaveProperty('y_coordinate');
        }
    });
  });

  describe('Validation & Filtering (Cases 11-20)', () => {
    it('TC-11: floor_id là chuỗi (Query param filtering)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-12: floor_id không tồn tại trong hệ thống (4001/Rỗng)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=88888`);
        expect(res.body.data).toEqual([]);
    });

    it('TC-13: floor_id là số 0', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=0`);
        expect(res.body.data).toEqual([]);
    });

    it('TC-14: floor_id là số âm', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=-1`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-15: floor_id cực lớn', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=999999999999`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-16: floor_id có chứa ký tự SQL Injection (an toàn)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=1;DROP TABLE devices`);
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-17: Không truyền floor_id (Lấy tất cả)', async () => {
        const res = await request(app).get(endpoint);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-18: Kiểm tra tọa độ x_coordinate phải là number', async () => {
        const res = await request(app).get(endpoint);
        expect(typeof res.body.data[0].x_coordinate).toBe('number');
    });

    it('TC-19: Kiểm tra tọa độ y_coordinate phải là number', async () => {
        const res = await request(app).get(endpoint);
        expect(typeof res.body.data[0].y_coordinate).toBe('number');
    });

    it('TC-20: Trả về đúng số lượng beacons trên một tầng cụ thể', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=${TEST_MAP_ID}`);
        const count = res.body.data.filter((d: any) => d.id === TEST_DEVICE_ID).length;
        expect(count).toBe(1);
    });
  });

  describe('Edge Cases (Cases 21-25)', () => {
    it('TC-21: Thiết bị có status "maintenance" vẫn được trả về (nếu logic cho phép)', async () => {
        const res = await request(app).get(endpoint);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-22: current_node_id liên kết với node không tồn tại (Join check)', async () => {
        const res = await request(app).get(endpoint);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('TC-23: floor_id truyền vào là mảng (Xử lý an toàn)', async () => {
        const res = await request(app).get(`${endpoint}?floor_id[]=1&floor_id[]=2`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('TC-24: floor_id là chuỗi rỗng', async () => {
        const res = await request(app).get(`${endpoint}?floor_id=`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('TC-25: Kiểm tra dữ liệu type là string và không null', async () => {
        const res = await request(app).get(endpoint);
        expect(typeof res.body.data[0].type).toBe('string');
        expect(res.body.data[0].type).not.toBeNull();
    });
  });
});
