import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';


describe('Chatbot Assistant Integration Test Suite', () => {
  let validToken: string;
  const PREFIX = 'C_TEST_';
  const TEST_PHONE = '0984000001';

  // --- QUY TRÌNH THIẾT LẬP MÔI TRƯỜNG ---
  beforeAll(async () => {
    // Tạo tài khoản test để lấy token hợp lệ
    const user = await db.query(
      "INSERT INTO users (phone, password_hash, full_name) VALUES ($1, 'mock_pass', 'Mock Name') RETURNING id",
      [TEST_PHONE]
    );
    validToken = user.rows[0].id.toString();
  });

  // --- QUY TRÌNH DỌN DẸP SAU KHI TEST ---
  afterAll(async () => {
    await db.query("DELETE FROM users WHERE phone = $1", [TEST_PHONE]);
  });

  describe('chatbot_query API', () => {
    const endpoint = '/api/chat/chatbot_query';

    it('TC-1: (Hỏi đáp thông thường) Trả về giờ làm việc bệnh viện (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ message: "Bệnh viện mở cửa lúc mấy giờ?" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.answer_text).toContain("7:30");
    });

    it('TC-2: (Hỏi đường đi) Trả về reply kèm suggested_nodes để điều hướng (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ message: "Phòng X-quang nằm ở đâu?" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.suggested_nodes).toContain("ID_XQuang");
      expect(res.body.data.target_room_id).toBe("ROOM_XQ_01");
    });

    it('TC-3: (Fallback) Trả về kịch bản dự phòng khi câu hỏi vô nghĩa (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ message: "asdfghjkl" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.answer_text).toContain("chưa hiểu ý bạn");
    });

    it('TC-4: Thất bại khi gửi message là chuỗi rỗng (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ message: "   " });

      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-5: (Bảo mật Injection) Hệ thống làm sạch dữ liệu và không bị ảnh hưởng (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ message: "DROP TABLE users;" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      // Đảm bảo bot xử lý như text bình thường, không thực thi lệnh
      expect(res.body.data.answer_text).toBeDefined();
    });

    it('TC-6: Thất bại khi gọi API bằng phương thức GET (404)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', validToken);

      expect(res.status).toBe(404);
    });
  });
});