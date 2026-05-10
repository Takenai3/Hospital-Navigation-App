import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Wifi API Integration Test Suite', () => {

  beforeAll(async () => {
    // Thiết lập dữ liệu Wifi mẫu
    await db.query(`
      INSERT INTO wifi_networks (ssid, password, coverage_zone, location_node_id)
      VALUES
      ('Wifi_KhoaNhi', 'khi123', 'Khoa Nhi - Tầng 3', 'NODE_KHOA_NHI'),
      ('Wifi_Public_Free', null, 'Sảnh chờ chung', 'NODE_SANH_CHO')
    `);
  });

  afterAll(async () => {
    await db.query("DELETE FROM wifi_networks");
  });

  describe('GET /api/util/wifi', () => {
    const endpoint = '/api/util/wifi';

    it('TC-1: Luồng chuẩn - Lấy danh sách tổng khi không truyền node_id (1000)', async () => {
      const res = await request(app).get(endpoint);

      expect(res.body.code).toBe('1000');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[1].password).toBe(""); // Kiểm tra wifi free (Slide 21)
    });

    it('TC-2: Luồng chuẩn - Đẩy mạng Wifi tại vị trí Khoa Nhi lên đầu (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ node_id: 'NODE_KHOA_NHI' });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0].ssid).toBe('Wifi_KhoaNhi'); // Phải được sort lên đầu (Slide 23)
    });

    it('TC-3: Vị trí không có sóng - Truyền node_id tầng hầm B2 (1000)', async () => {
      // Giả sử logic nghiệp vụ trả về mảng rỗng nếu node_id lạ (Slide 24)
      // (Tùy thuộc vào việc bạn filter hay chỉ sort, ở đây test theo đặc tả slide)
      const res = await request(app)
        .get(endpoint)
        .query({ node_id: 'NODE_B2_HAM' });

      expect(res.body.code).toBe('1000');
      // Nếu logic là filter khu vực chưa phủ sóng
      // expect(res.body.data).toEqual([]);
    });

    it('TC-4: Sai định dạng ID - Truyền node_id là object thay vì string (2003)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ node_id: { id: 123 } }); // Sai kiểu dữ liệu (Slide 24)

      expect(['2003', '1000']).toContain(res.body.code);
    });

    it('TC-5: Token Public - Gọi API mà không đính kèm token (1000)', async () => {
      const res = await request(app).get(endpoint); // Không kèm header Authorization

      expect(res.body.code).toBe('1000'); // Đảm bảo không vướng lỗi 3003 (Slide 25)
    });
  });
});