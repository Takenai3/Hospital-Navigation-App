import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';


describe('Create Chat Integration Test Suite', () => {
  let validToken: string;
  const TEST_PHONE = '0985000001';
  const PREFIX = 'CHAT_T_';

  beforeAll(async () => {
    // Tạo user giả lập
    const user = await db.query(
      "INSERT INTO users (phone, full_name, status) VALUES ($1, 'Chat User', 'active') RETURNING id",
      [TEST_PHONE]
    );
    validToken = 'token-' + user.rows[0].id;
  });

  afterAll(async () => {
    // Dọn dẹp database
    await db.query("DELETE FROM conversations WHERE token = $1", [validToken]);
    await db.query("DELETE FROM users WHERE phone = $1", [TEST_PHONE]);
  });

  describe('POST /api/chat/create_chat', () => {
    const endpoint = '/api/chat/create_chat';

    it('TC-1: Tạo mới cuộc hội thoại thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "Hỗ trợ nộp viện phí" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.conversation_id).toBeDefined();
      expect(res.body.data.support_staff).not.toBeNull();
    });

    it('TC-2: Thất bại khi bỏ trống tham số topic (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "" });

      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-3: Thất bại khi topic chứa ký tự đặc biệt hoặc quá dài (2003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "Hỗ trợ @ khẩn cấp!!!" });

      expect(res.body.code).toBe('2003');
    });

    it('TC-4: Chặn tạo cuộc hội thoại liên tục (Spam) (2005)', async () => {
      // Giả lập gọi API 11 lần liên tiếp
      for (let i = 0; i < 10; i++) {
        await request(app).post(endpoint).set('token', validToken).send({ topic: "Spam topic" });
      }

      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "Spam topic 11" });

      expect(res.body.code).toBe('2005');
    });

    it('TC-5: Thất bại khi token không hợp lệ hoặc thiếu token (3003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ topic: "Hỏi về lịch khám" });

      expect(res.body.code).toBe('3003');
    });
  });
});