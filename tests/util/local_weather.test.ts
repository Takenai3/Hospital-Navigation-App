import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Local Weather Integration Test Suite', () => {

  beforeAll(async () => {
    // Khởi tạo các cấu hình cần thiết cho môi trường test
    // Ví dụ: Đảm bảo bảng ghi log hoạt động (nếu có)
  });

  afterAll(async () => {
    // Dọn dẹp các dữ liệu phát sinh trong quá trình test (nếu có)
  });

  describe('GET /api/util/local_weather', () => {
    const endpoint = '/api/util/local_weather';

    it('TC-1: Lấy thời tiết tại bệnh viện thành công (1000)', async () => {
      const res = await request(app)
        .get(endpoint);

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('condition');
      expect(res.body.data).toHaveProperty('temperature');
      expect(res.body.data).toHaveProperty('humidity');
      expect(res.body.data).toHaveProperty('icon_url');
      // alert_msg có thể là string hoặc null tùy thời tiết lúc test
    });

    it('TC-2: Phớt lờ các tham số vị trí thừa - Idempotent (1000)', async () => {
      // Người dùng cố tình truyền tọa độ khác (ví dụ: HCM)
      const res = await request(app)
        .get(endpoint)
        .query({ lat: '10.7626', lng: '106.6602', location: 'hcm' });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      // Kết quả vẫn phải trả về dữ liệu dựa trên tọa độ fix cứng của bệnh viện (Hà Nội)
      expect(res.body.data).toBeDefined();
    });

    it('TC-3: Sai phương thức POST thay vì GET (2004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({});

      expect(res.body.code).toBe('2004'); // Method not allowed
    });

    /**
     * Lưu ý: TC-4 về lỗi kết nối bên thứ ba (5000) thường được test bằng cách
     * giả lập ngắt mạng hoặc dùng Mock thư viện axios để trả về lỗi 5xx.
     */
    it('TC-4: Xử lý lỗi khi dịch vụ thời tiết bên thứ ba không phản hồi (5000)', async () => {
      // Giả lập một lỗi hệ thống hoặc lỗi kết nối mạng (nếu có môi trường mock)
    });

    it('TC-5: Kiểm tra hiệu năng phản hồi nhanh (Load Test nhẹ)', async () => {
      const start = Date.now();
      const res = await request(app).get(endpoint);
      const duration = Date.now() - start;

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      // Thời tiết không đổi từng giây nên API cần phản hồi nhanh (thường < 200ms nếu có cache)
      expect(duration).toBeLessThan(500);
    });
  });
});