import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('List Conversations Integration Test Suite', () => {
  let userToken: string;
  let userId: number;
  const convIds: number[] = [];

  beforeAll(async () => {
    // 1. Tạo user
    const user = await db.query("INSERT INTO users (phone, full_name, password_hash) VALUES ('0925000001', 'Mock Name', 'mock_pass') RETURNING id");
    userId = user.rows[0].id;
    userToken = userId.toString();

    // 2. Tạo 15 cuộc hội thoại và mồi participants cho user này
    for (let i = 1; i <= 15; i++) {
      const conv = await db.query("INSERT INTO conversations (type) VALUES ('direct') RETURNING id");
      const cid = conv.rows[0].id;
      convIds.push(cid);
      await db.query("INSERT INTO participants (conversation_id, user_id) VALUES ($1, $2)", [cid, userId]);
    }
  });

  afterAll(async () => {
    for (const cid of convIds) {
      await db.query("DELETE FROM participants WHERE conversation_id = $1", [cid]);
      await db.query("DELETE FROM conversations WHERE id = $1", [cid]);
    }
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
  });

  describe('GET /api/chat/list_conversations', () => {
    const endpoint = '/api/chat/list_conversations';

    it('TC-1: Lấy danh sách Inbox lần đầu thành công (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userToken)
        .query({ index: 0, count: 10 });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.length).toBe(10);
    });

    it('TC-2 & TC-3: Trả về mảng rỗng khi index quá lớn (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', userToken)
        .query({ index: 50, count: 10 });

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

    it('TC-5: Thất bại khi token hết hạn hoặc thiếu token (3003)', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ index: 0, count: 10 });

      expect(res.body.code).toBe('3003');
    });
  });
});
