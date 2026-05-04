import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('List Conversations Integration Test Suite', () => {
  let userToken: string;
  const TEST_PHONE = '0933000001';

  beforeAll(async () => {
    // Tạo user và một vài cuộc hội thoại mẫu
    const user = await db.query(
      "INSERT INTO users (phone, full_name) VALUES ($1, 'Inbox User') RETURNING id",
      [TEST_PHONE]
    );
    userToken = 'token-' + user.rows[0].id;

    // Tạo 2 cuộc hội thoại
    const c1 = await db.query(
      "INSERT INTO conversations (token, topic, updated_at) VALUES ($1, 'Hỏi đường', NOW()) RETURNING id",
      [userToken]
    );
    const c2 = await db.query(
      "INSERT INTO conversations (token, topic, updated_at) VALUES ($1, 'Đổi lịch', NOW() - INTERVAL '1 hour') RETURNING id",
      [userToken]
    );

    // Tạo tin nhắn cuối cho cuộc hội thoại 1
    await db.query(
      "INSERT INTO chat_messages (conversation_id, sender_token, content, is_read) VALUES ($1, 'staff-token', 'Chào bạn!', false)",
      [c1.rows[0].id]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM chat_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE token = $1)", [userToken]);
    await db.query("DELETE FROM conversations WHERE token = $1", [userToken]);
    await db.query("DELETE FROM users WHERE phone = $1", [TEST_PHONE]);
  });

  describe('GET /api/chat/list_conversations', () => {
    const endpoint = '/api/chat/list_conversations';

    it('TC-1: Lấy danh sách Inbox lần đầu thành công (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userToken)
        .query({ index: 0, count: 10 });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('unread_count');
      expect(res.body.data[0]).toHaveProperty('last_message');
    });

    it('TC-2 & TC-3: Trả về mảng rỗng khi không có dữ liệu hoặc index quá lớn (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userToken)
        .query({ index: 100, count: 10 });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
    });

    it('TC-4: Thất bại khi truyền tham số phân trang sai (2003)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userToken)
        .query({ index: -1, count: 0 });

      expect(res.body.code).toBe('2003');
    });

    it('TC-5: Thất bại khi token hết hạn hoặc thiếu token (3003/3002)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ index: 0, count: 10 });

      expect(res.body.code).toBe('3003');
    });
  });
});