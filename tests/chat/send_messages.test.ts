import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';


describe('Send Messages Integration Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let conversationAId: string;
  const TEST_MAP_ID = 888;

  beforeAll(async () => {
    // Tạo 2 user để test truy cập chéo
    const userA = await db.query("INSERT INTO users (phone, full_name) VALUES ('0911000001', 'User A') RETURNING id");
    const userB = await db.query("INSERT INTO users (phone, full_name) VALUES ('0911000002', 'User B') RETURNING id");
    userAToken = 'token-' + userA.rows[0].id;
    userBToken = 'token-' + userB.rows[0].id;

    // Tạo cuộc hội thoại thuộc về User A
    const conv = await db.query(
      "INSERT INTO conversations (token, topic, status) VALUES ($1, 'Hỗ trợ viện phí', 'open') RETURNING id",
      [userAToken]
    );
    conversationAId = conv.rows[0].id.toString();
  });

  afterAll(async () => {
    await db.query("DELETE FROM chat_messages WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM conversations WHERE id = $1", [conversationAId]);
    await db.query("DELETE FROM users WHERE phone IN ('0911000001', '0911000002')");
  });

  describe('POST /api/chat/send_messages', () => {
    const endpoint = '/api/chat/send_messages';

    it('TC-1: Gửi tin nhắn văn bản thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({
          conversation_id: conversationAId,
          message: "Chào bác sĩ, tôi muốn hỏi...",
          type: "text"
        });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.message_id).toBeDefined();
      expect(res.body.data.created_at).toBeDefined();
    });

    it('TC-2: Gửi tin nhắn dạng hình ảnh thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({
          conversation_id: conversationAId,
          message: "https://hospital.com/uploads/img.jpg",
          type: "image"
        });

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