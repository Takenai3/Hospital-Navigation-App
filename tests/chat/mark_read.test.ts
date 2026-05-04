import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Mark Read Integration Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let conversationAId: string;

  beforeAll(async () => {
    // Thiết lập dữ liệu giả lập cho User A và cuộc hội thoại của họ
    const userA = await db.query("INSERT INTO users (phone) VALUES ('0944000001') RETURNING id");
    const userB = await db.query("INSERT INTO users (phone) VALUES ('0944000002') RETURNING id");
    userAToken = 'token-' + userA.rows[0].id;
    userBToken = 'token-' + userB.rows[0].id;

    const conv = await db.query(
      "INSERT INTO conversations (token, topic) VALUES ($1, 'Hỗ trợ kỹ thuật') RETURNING id",
      [userAToken]
    );
    conversationAId = conv.rows[0].id.toString();

    // Thêm một tin nhắn chưa đọc từ phía "hệ thống/nhân viên" gửi cho User A
    await db.query(
      "INSERT INTO chat_messages (conversation_id, sender_token, content, is_read) VALUES ($1, 'staff-token', 'Chào bạn!', false)",
      [conversationAId]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM chat_messages WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM conversations WHERE id = $1", [conversationAId]);
    await db.query("DELETE FROM users WHERE phone IN ('0944000001', '0944000002')");
  });

  describe('POST /api/chat/mark_read', () => {
    const endpoint = '/api/chat/mark_read';

    it('TC-1: Đánh dấu đã đọc thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userAToken)
        .send({ conversation_id: conversationAId });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);

      // Kiểm tra lại DB xem unread_count đã về 0 chưa
      const check = await db.query("SELECT COUNT(*) FROM chat_messages WHERE conversation_id = $1 AND is_read = false", [conversationAId]);
      expect(parseInt(check.rows[0].count)).toBe(0);
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
        .send({ conversation_id: '999999' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: User B cố tình đánh dấu đọc cho User A (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', userBToken)
        .send({ conversation_id: conversationAId });

      expect(res.body.code).toBe('1009');
    });

    it('TC-6: Sai phương thức GET thay vì POST (2004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userAToken)
        .query({ conversation_id: conversationAId });

      expect(res.status).toBe(405);
      expect(res.body.code).toBe('2004');
    });
  });
});