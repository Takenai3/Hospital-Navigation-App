import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Find Pharmacy Integration Test Suite', () => {
  const VALID_NODE = 'LOBBY_NODE_01';
  const EXTERNAL_NODE = 'HOME_GPS_COORD';

  beforeAll(async () => {
    // 1. Seed Map (Đầy đủ các cột NOT NULL)
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES (999, 'B1', 'Tòa nhà B1', 1.0, 1.0) ON CONFLICT DO NOTHING");
    
    // 2. Seed Nodes (Sử dụng bảng nodes thay vì map_nodes)
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) VALUES ($1, 999, 10.0, 10.0, 'hallway', true), ($2, 999, 20.0, 20.0, 'hallway', false)", [VALID_NODE, EXTERNAL_NODE]);
    
    // 3. Seed Pharmacies (Dùng Integer ID)
    await db.query(`
      INSERT INTO pharmacies (pharmacy_id, name, location_id, opening_hours)
      VALUES (301, 'Nhà thuốc Khu A', 'NODE_A', '07:00 - 21:00'),
             (302, 'Nhà thuốc Khu B', 'NODE_B', '24/7')
      ON CONFLICT DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.query("DELETE FROM pharmacies");
    await db.query("DELETE FROM nodes WHERE map_id = 999");
    await db.query("DELETE FROM maps WHERE id = 999");
  });

  describe('GET /api/util/find_pharmacy', () => {
    const endpoint = '/api/util/find_pharmacy';

    it('TC-1: Luồng chuẩn - Trả về danh sách nhà thuốc thành công (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ current_node_id: VALID_NODE });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0]).toHaveProperty('pharmacy_name');
    });

    it('TC-2: Thiếu tham số - Không truyền current_node_id (2001)', async () => {
      const res = await request(app).get(endpoint);

      expect(res.body.code).toBe('2001');
    });

    it('TC-3: Sai vị trí - ID ảo không tồn tại (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ current_node_id: 'GHOST_NODE' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: Lỗi hệ thống khi query fail (9999)', async () => {
      // Mock db query error
      const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
          throw new Error('DB Error');
      });

      const res = await request(app)
        .get(endpoint)
        .query({ current_node_id: VALID_NODE });

      expect(res.body.code).toBe('9999');
      spy.mockRestore();
    });
  });
});
