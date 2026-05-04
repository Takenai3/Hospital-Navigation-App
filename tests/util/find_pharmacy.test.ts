import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Find Pharmacy Integration Test Suite', () => {
  const VALID_NODE = 'LOBBY_NODE_01';
  const EXTERNAL_NODE = 'HOME_GPS_COORD';

  beforeAll(async () => {
    // Tạo dữ liệu bản đồ và nhà thuốc mẫu
    await db.query("INSERT INTO map_nodes (node_id, is_internal) VALUES ($1, true), ($2, false)", [VALID_NODE, EXTERNAL_NODE]);
    await db.query(`
      INSERT INTO pharmacies (pharmacy_id, name, location_id, opening_hours)
      VALUES ('PHAR_A', 'Nhà thuốc Khu A', 'NODE_A', '07:00 - 21:00'),
             ('PHAR_B', 'Nhà thuốc Khu B', 'NODE_B', '24/7')
    `);
  });

  afterAll(async () => {
    await db.query("DELETE FROM pharmacies");
    await db.query("DELETE FROM map_nodes");
  });

  describe('GET /api/util/find_pharmacy', () => {
    const endpoint = '/api/util/find_pharmacy';

    it('TC-1: Luồng chuẩn - Trả về danh sách nhà thuốc và đường đi (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ current_node_id: VALID_NODE });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0]).toHaveProperty('pharmacy_name');
      expect(res.body.data[0]).toHaveProperty('path'); //
    });

    it('TC-2: Thiếu tham số - Không truyền current_node_id (2001)', async () => {
      const res = await request(app).get(endpoint);

      expect(res.body.code).toBe('2001'); //
    });

    it('TC-3: Sai vị trí - ID ảo không tồn tại (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ current_node_id: 'GHOST_NODE' });

      expect(res.body.code).toBe('4004'); //
    });

    it('TC-5: Ngoài vùng phủ sóng - Bệnh nhân đang ở nhà (2003)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ current_node_id: EXTERNAL_NODE });

      expect(res.body.code).toBe('2003');
      expect(res.body.message).toContain('ngoài phạm vi'); //
    });
  });
});