import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';


describe('Create Chat Integration Test Suite', () => {
  let validToken: string;
  let userId: number;

  beforeAll(async () => {
    const user = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0926000001', 'Mock Name', 'mock_pass') RETURNING id");
    userId = user.rows[0].id;
    validToken = userId.toString();
  });

  afterAll(async () => {
    // Tìm các conversation đã tạo bởi userId này thông qua participants
    const convs = await db.query("SELECT conversation_id FROM participants WHERE user_id = $1", [userId]);
    for (const row of convs.rows) {
        await db.query("DELETE FROM messages WHERE conversation_id = $1", [row.conversation_id]);
        await db.query("DELETE FROM participants WHERE conversation_id = $1", [row.conversation_id]);
        await db.query("DELETE FROM conversations WHERE id = $1", [row.conversation_id]);
    }
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
  });

  describe('POST /api/chat/create_chat', () => {
    const endpoint = '/api/chat/create_chat';

    it('TC-1: Tạo cuộc hội thoại mới thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "Tư vấn sức khỏe nhi" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('conversation_id');
      expect(res.body.data).toHaveProperty('support_staff');
    });

    it('TC-2: Thất bại khi bỏ trống topic (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "" });

      expect(res.body.code).toBe('2001');
    });

    it('TC-3: Thất bại khi topic chứa ký tự đặc biệt không cho phép (2003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "Hỏi về @###" });

      expect(res.body.code).toBe('2003');
    });

    it('TC-4: Chặn tạo cuộc hội thoại liên tục (Spam) (2005)', async () => {
      // Gọi 10 lần thành công (hoặc đến giới hạn)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post(endpoint)
          .set('token', validToken)
          .send({ topic: `Topic ${i}` });
      }

      // Lần thứ 11 phải bị chặn
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ topic: "Spam topic" });

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
