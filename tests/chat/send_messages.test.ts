import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Send Messages Integration Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let conversationAId: string;

  beforeAll(async () => {
    // 1. Tạo User A và B
    const userA = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0923000001', 'Mock Name', 'mock_pass') RETURNING id");
    const userB = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0923000002', 'Mock Name', 'mock_pass') RETURNING id");
    userAToken = userA.rows[0].id.toString();
    userBToken = userB.rows[0].id.toString();

    // 2. Tạo cuộc hội thoại cho User A
    const conv = await db.query("INSERT INTO conversations (type) VALUES ('direct') RETURNING id");
    conversationAId = conv.rows[0].id.toString();

    // 3. Mồi participants cho User A
    await db.query("INSERT INTO participants (conversation_id, user_id) VALUES ($1, $2)", [conversationAId, userA.rows[0].id]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM messages WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM participants WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM conversations WHERE id = $1", [conversationAId]);
    await db.query("DELETE FROM users WHERE phone IN ('0923000001', '0923000002')");
  });

  describe('POST /api/chat/send_messages', () => {
    const endpoint = '/api/chat/send_messages';

    it('TC-1: Gửi tin nhắn văn bản thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: conversationAId, message: "Hello world", type: "text" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('message_id');
    });

    it('TC-2: Gửi tin nhắn dạng hình ảnh thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: conversationAId, message: "http://img.vn/1.jpg", type: "image" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-3: Thất bại khi gửi vào conversation_id không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: '999999', message: "Test", type: "text" });

      expect(res.body.code).toBe('4004');
    });

    it('TC-4: Bảo mật - Thất bại khi User B gửi tin nhắn vào cuộc hội thoại của User A (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userBToken)
        .send({ conversation_id: conversationAId, message: "Hack chat", type: "text" });

      expect(res.body.code).toBe('1009');
      expect(res.body.message).toContain("Not access");
    });

    it('TC-5: Thất bại khi nội dung tin nhắn rỗng (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: conversationAId, message: "   ", type: "text" });

      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-6: Thất bại khi sai định dạng loại tin nhắn (2003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: conversationAId, message: "Video test", type: "video" });

      expect(res.body.code).toBe('2003');
    });
  });
});
