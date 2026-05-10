import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Mark Read Integration Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let conversationAId: string;

  beforeAll(async () => {
    // 1. Tạo User A và B
    const userA = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0924000001', 'Mock Name', 'mock_pass') RETURNING id");
    const userB = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0924000002', 'Mock Name', 'mock_pass') RETURNING id");
    userAToken = userA.rows[0].id.toString();
    userBToken = userB.rows[0].id.toString();

    // 2. Tạo cuộc hội thoại
    const conv = await db.query("INSERT INTO conversations (type) VALUES ('direct') RETURNING id");
    conversationAId = conv.rows[0].id.toString();

    // 3. Mồi participants
    await db.query("INSERT INTO participants (conversation_id, user_id) VALUES ($1, $2)", [conversationAId, userA.rows[0].id]);
    await db.query("INSERT INTO participants (conversation_id, user_id) VALUES ($1, $2)", [conversationAId, userB.rows[0].id]);

    // 4. Mồi tin nhắn chưa đọc từ User B gửi cho User A
    await db.query("INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)", [conversationAId, userB.rows[0].id, "Tin nhắn chưa đọc"]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM messages WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM participants WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM conversations WHERE id = $1", [conversationAId]);
    await db.query("DELETE FROM users WHERE phone IN ('0924000001', '0924000002')");
  });

  describe('POST /api/chat/mark_read', () => {
    const endpoint = '/api/chat/mark_read';

    it('TC-1: Đánh dấu đã đọc thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: conversationAId });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-2: Gọi lại lần nữa khi đã đọc hết - Idempotent (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: conversationAId });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-3: Thiếu conversation_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({});

      expect(res.body.code).toBe('2001');
    });

    it('TC-4: conversation_id không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: 999999 });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: User B cố tình đánh dấu đọc cho cuộc hội thoại anh ta không tham gia (nhưng trong test này anh ta có tham gia, nên mồi 1 conv khác)', async () => {
       const convOther = await db.query("INSERT INTO conversations (type) VALUES ('direct') RETURNING id");
       const convOtherId = convOther.rows[0].id;
       // User B không join convOther
       
       const res = await request(app)
        .post(endpoint)
        .set('token', userBToken)
        .send({ conversation_id: convOtherId });

      expect(res.body.code).toBe('1009');
      
      await db.query("DELETE FROM conversations WHERE id = $1", [convOtherId]);
    });

    it('TC-6: Sai phương thức GET thay vì POST (404)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userAToken)
        .query({ conversation_id: conversationAId });

      expect(res.status).toBe(404);
    });
  });
});
