import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Parking API Integration Test Suite', () => {

  // Thiết lập dữ liệu mẫu trước khi chạy test
  beforeAll(async () => {
    // Xóa dữ liệu cũ nếu có để tránh trùng lặp
    await db.query("DELETE FROM parking_lots");

    // Thêm dữ liệu giả lập cho các trường hợp: Bình thường và Đã đầy
    await db.query(`
      INSERT INTO parking_lots (parking_id, name, type, total_slots, available_slots, location_node_id)
      VALUES
      ('P_CAR_01', 'Bãi ô tô cổng chính', 'car', 100, 50, 'GATE_01'),
      ('P_BIKE_01', 'Bãi xe máy khu B', 'motorbike', 500, 0, 'GATE_02')
    `);
  });

  // Dọn dẹp dữ liệu sau khi test xong
  afterAll(async () => {
    await db.query("DELETE FROM parking_lots");
    await db.end();
  });

  describe('GET /api/util/parking', () => {
    const endpoint = '/api/util/parking';

    /**
     * TC-1: Luồng chuẩn - Gọi API trong điều kiện bình thường
     * Kết quả mong đợi: Mã 1000, trả về danh sách bãi xe realtime.
     */
    it('TC-1: Luồng chuẩn - Lấy danh sách bãi xe thành công (1000)', async () => {
      const res = await request(app).get(endpoint);

      expect(res.body.code).toBe('1000');
      expect(res.body.message).toBe('OK');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      // Kiểm tra cấu trúc dữ liệu theo Slide 16
      expect(res.body.data[0]).toHaveProperty('parking_id');
      expect(res.body.data[0]).toHaveProperty('available_slots');
    });

    /**
     * TC-2: Bãi xe đã đầy
     * Kết quả mong đợi: available_slots = 0, App sẽ hiển thị nhãn "Hết chỗ".
     */
    it('TC-2: Bãi xe đã đầy - available_slots trả về 0 (1000)', async () => {
      const res = await request(app).get(endpoint);

      const bikePark = res.body.data.find((p: any) => p.type === 'motorbike');
      expect(bikePark.available_slots).toBe(0);
    });

    /**
     * TC-3: Lỗi kết nối phần cứng (Hardware timeout)
     * Kết quả mong đợi: Mã 5000, trả về thông báo lỗi thân thiện hướng dẫn người dùng.
     */
    it('TC-3: Lỗi kết nối phần cứng - Trả về thông báo hướng dẫn (5000)', async () => {
      // Mock (giả lập) hàm checkHardwareStatus để trả về false (mất kết nối)
      const spy = jest.spyOn(require('../../src/app'), 'checkHardwareStatus');
      if (spy) spy.mockResolvedValueOnce(false);

      const res = await request(app).get(endpoint);

      expect(res.body.code).toBe('5000');
      // Kiểm tra nội dung thông báo thân thiện đã sửa
      expect(res.body.message).toContain('bảo trì');
      expect(res.body.message).toContain('nhân viên điều phối');

      if (spy) spy.mockRestore();
    });

    /**
     * TC-4: Kiểm thử tải (Load Testing)
     * Kết quả mong đợi: Phản hồi nhanh dưới 200ms nhờ cơ chế Cache.
     */
    it('TC-4: Kiểm thử tải - Đảm bảo phản hồi nhanh dưới 200ms nhờ Cache', async () => {
      // Gọi lần 1 để hệ thống lưu vào cache
      await request(app).get(endpoint);

      // Gọi lần 2 để đo tốc độ phản hồi từ cache
      const start = Date.now();
      const res = await request(app).get(endpoint);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
      expect(res.body.code).toBe('1000');
    });

    /**
     * TC-5: Kiểm thử bảo mật (SQL Injection)
     * Kết quả mong đợi: Mã 2003, hệ thống lọc bỏ ký tự đặc biệt.
     */
    it('TC-5: Bảo mật - Chặn tấn công SQL Injection qua tham số URL (2003)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ sort: "1; DROP TABLE parking_lots" });

      expect(res.body.code).toBe('2003');
      expect(res.body.message).toContain('không hợp lệ');
    });
  });
});