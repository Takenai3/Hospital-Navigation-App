import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Asset Stations Integration Test Suite', () => {
  const VALID_TOKEN = 'valid-token-123';

  beforeAll(async () => {
    // Setup: Tạo trạm và thiết bị mẫu để test luồng chuẩn
    await db.query("INSERT INTO stations (id, name, node_id) VALUES ('ST-01', 'Trạm Sảnh A', 'NODE-001')");
    await db.query("INSERT INTO assets (asset_id, type, status, current_station_id) VALUES ('W-01', 'wheelchair', 'Available', 'ST-01')");
  });

  afterAll(async () => {
    await db.query("DELETE FROM assets");
    await db.query("DELETE FROM stations");
  });

  describe('GET /api/asset/asset_stations', () => {
    const endpoint = '/api/asset/asset_stations';

    it('TC-1: Luồng chuẩn - Lấy danh sách trạm thành công (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN);

      expect(res.body.code).toBe('1000');
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('available_wheelchairs');
      }
    });

    it('TC-2: Hệ thống mới - Trả về mảng rỗng nếu không có dữ liệu (1000)', async () => {
      // Tạm thời xóa dữ liệu để test
      await db.query("DELETE FROM assets");
      await db.query("DELETE FROM stations");

      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN);

      expect(res.body.code).toBe('1000');
      expect(res.body.data).toEqual([]);
    });

    it('TC-3: Lỗi phương thức - Sử dụng POST thay vì GET (2004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN);

      expect(res.status).toBe(405);
      expect(res.body.code).toBe('2004');
    });

    it('TC-4: Thiếu xác thực - Không đính kèm token (3003)', async () => {
      const res = await request(app)
        .get(endpoint); // Không set header token

      expect(res.body.code).toBe('3003');
    });

    it('TC-5: Tải trọng cao - Phản hồi nhanh dưới 200ms', async () => {
      const start = Date.now();
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN);
      const duration = Date.now() - start;

      expect(res.body.code).toBe('1000');
      expect(duration).toBeLessThan(200);
    });
  });
});