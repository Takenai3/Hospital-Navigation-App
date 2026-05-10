import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Get Messages Integration Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let conversationAId: string;

  beforeAll(async () => {
    // 1. Tạo User A và B
    const userA = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0922000001', 'Mock Name', 'mock_pass') RETURNING id");
    const userB = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0922000002', 'Mock Name', 'mock_pass') RETURNING id");
    userAToken = userA.rows[0].id.toString();
    userBToken = userB.rows[0].id.toString();

    // 2. Tạo cuộc hội thoại cho User A
    const conv = await db.query(
      "INSERT INTO conversations (type) VALUES ('direct') RETURNING id"
    );
    conversationAId = conv.rows[0].id.toString();

    // 3. Mồi participants (QUAN TRỌNG)
    await db.query("INSERT INTO participants (conversation_id, user_id) VALUES ($1, $2)", [conversationAId, userA.rows[0].id]);

    // 4. Tạo 5 tin nhắn mẫu
    for(let i = 1; i <= 5; i++) {
      await db.query(
        "INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)",
        [conversationAId, userA.rows[0].id, `Message ${i}`]
      );
    }
  });

  afterAll(async () => {
    await db.query("DELETE FROM messages WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM participants WHERE conversation_id = $1", [conversationAId]);
    await db.query("DELETE FROM conversations WHERE id = $1", [conversationAId]);
    await db.query("DELETE FROM users WHERE phone IN ('0922000001', '0922000002')");
  });

  describe('GET /api/chat/get_messages', () => {
    const endpoint = '/api/chat/get_messages';

    it('TC-1: Lấy trang đầu tiên thành công (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userAToken)
        .query({ conversation_id: conversationAId, index: 0, count: 20 });

      expect(res.body.code).toBe('1000');
      expect(res.body.data.length).toBe(5);
      expect(res.body.data[0]).toHaveProperty('is_mine', '1');
    });

    it('TC-2: Phân trang vượt quá số lượng - trả về mảng rỗng (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userAToken)
        .query({ conversation_id: conversationAId, index: 20, count: 10 });

      expect(res.body.code).toBe('1000');
      expect(res.body.data).toEqual([]);
    });

    it('TC-3: Thất bại khi truyền tham số âm (2003)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userAToken)
        .query({ conversation_id: conversationAId, index: -1, count: -5 });

      expect(res.body.code).toBe('2003');
    });

    it('TC-4: Thất bại khi conversation_id không tồn tại (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userAToken)
        .query({ conversation_id: '99999', index: 0, count: 10 });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: Bảo mật - User B không được phép đọc chat của User A (1009)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userBToken)
        .query({ conversation_id: conversationAId, index: 0, count: 10 });

      expect(res.body.code).toBe('1009');
    });
  });
});
