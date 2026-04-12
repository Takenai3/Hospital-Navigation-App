import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Auth Logout - Integration Test Suite (TDD)', () => {
  const endpoint = '/api/auth/logout';
  const testToken = 'valid_token_string_abc_123';

  // Setup/Teardown: Ví dụ quản lý session trong DB nếu cần
  beforeAll(async () => {
    // Xóa session rác
    await db.query('DELETE FROM sessions WHERE token = $1', [testToken]);
  });

  afterAll(async () => {
    await db.query('DELETE FROM sessions WHERE token = $1', [testToken]);
  });

  describe('Authorization Failures (Mã 3001, 3002)', () => {
    it('TC-1: Thiếu Token trong header (Bearer)', async () => {
      const res = await request(app).post(endpoint).send({}); // Không kèm header Authorization
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(3001); // Missing Token
    });

    it('TC-2: Header Authorization rỗng', async () => {
      const res = await request(app).post(endpoint).set('Authorization', '').send({});
      expect(res.body.code).toBe(3001);
    });

    it('TC-3: Token sai định dạng (không có Bearer prefix)', async () => {
      const res = await request(app).post(endpoint).set('Authorization', 'just_a_token').send({});
      expect(res.body.code).toBe(3002); // Invalid/Malformed Token
    });

    it('TC-4: Token rác / không hợp lệ', async () => {
      const res = await request(app).post(endpoint).set('Authorization', 'Bearer invalid_junk').send({});
      expect(res.body.code).toBe(3002); // Token invalid
    });

    it('TC-5: Token đã hết hạn (Expired)', async () => {
      // Giả sử có token expired chuẩn
      const expiredToken = 'expired_token_data';
      const res = await request(app).post(endpoint).set('Authorization', `Bearer ${expiredToken}`).send({});
      expect(res.body.code).toBe(3002);
    });
  });

  describe('Success Scenario (Mã 1000)', () => {
    it('TC-6: Đăng xuất thành công với Token hợp lệ', async () => {
      // Arrange: Nếu hệ thống lưu session vào DB để check logout
      await db.query('INSERT INTO sessions (token, is_active) VALUES ($1, $2)', [testToken, true]);

      // Act
      const res = await request(app).post(endpoint).set('Authorization', `Bearer ${testToken}`).send({});

      // Assert
      expect(res.body.code).toBe(1000); // Logout success

      // Optional: Check DB xem session đã inactive chưa
      const check = await db.query('SELECT is_active FROM sessions WHERE token = $1', [testToken]);
      if (check.rows.length > 0) {
        expect(check.rows[0].is_active).toBe(false);
      }
    });
  });
});
