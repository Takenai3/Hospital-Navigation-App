import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Canteen API Integration Test Suite', () => {

  beforeAll(async () => {
    // Setup: Tạo dữ liệu mẫu cho các khu vực khác nhau
    await db.query(`
      INSERT INTO canteens (canteen_id, name, location_node_id, open_time, close_time, zone_id, menu_url)
      VALUES
      ('CAN_01', 'Căn tin Khu A', 'NODE_A_01', '06:00', '21:00', 'Khu A', 'http://hosp.vn/menu_a.jpg'),
      ('CAN_03', 'Căn tin Khu C', 'NODE_C_05', '07:00', '20:00', 'Khu C', 'http://hosp.vn/menu_c.jpg')
    `);
  });

  afterAll(async () => {
    await db.query("DELETE FROM canteens WHERE canteen_id IN ('CAN_01', 'CAN_03')");
  });

  describe('GET /api/util/canteen', () => {
    const endpoint = '/api/util/canteen';

    it('TC-1: Luồng chuẩn - Lấy toàn bộ danh sách căn tin (1000)', async () => {
      const res = await request(app).get(endpoint);

      expect(res.body.code).toBe('1000');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0]).toHaveProperty('status');
    });

    it('TC-2: Luồng chuẩn - Lọc theo zone_id = "Khu C" (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ zone_id: 'Khu C' });

      expect(res.body.code).toBe('1000');
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Căn tin Khu C');
    });

    it('TC-3: Sai khu vực - Truyền zone_id không tồn tại (Mảng rỗng)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ zone_id: 'Khu_Vuc_Ao' });

      expect(res.body.code).toBe('1000');
      expect(res.body.data).toEqual([]); // Đúng theo đặc tả Slide 14
    });

    it('TC-5: Sai phương thức - Gọi POST thay vì GET (2004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ zone_id: 'Khu A' });

      expect(res.status).toBe(405);
      expect(res.body.code).toBe('2004');
    });
  });

  // Lưu ý: TC-4 về giờ hoạt động nên được test bằng cách mock thời gian hệ thống
});