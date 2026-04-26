import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Auth Verify OTP - Real Database Test', () => {
  const endpoint = '/api/auth/verify_otp';
  const testPhone = '0988123456';
  const testUserId = 9999;
  const validOtp = '888888';

  beforeAll(async () => {
    await db.query('DELETE FROM otps WHERE phone = $1', [testPhone]);
    await db.query('DELETE FROM users WHERE phone = $1', [testPhone]);
    
    // Insert user
    await db.query(
        "INSERT INTO users (id, phone, password_hash, full_name, status) VALUES ($1, $2, 'hash', 'Test OTP User', 'inactive')",
        [testUserId, testPhone]
    );
    // Insert OTP vào bảng otps
    await db.query(
        "INSERT INTO otps (phone, user_id, otp_code, type, expires_at, is_used) VALUES ($1, $2, $3, 'register', NOW() + INTERVAL '10 minutes', false)",
        [testPhone, testUserId, validOtp]
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM otps WHERE phone = $1', [testPhone]);
    await db.query('DELETE FROM users WHERE phone = $1', [testPhone]);
  });

  describe('Validation Error', () => {
    it('TC-1: Thiếu tham số', async () => {
      const res = await request(app).post(endpoint).send({ otp_code: validOtp });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
    
    it('TC-2: Sai OTP hoặc OTP không tồn tại', async () => {
      const res = await request(app).post(endpoint).send({ phone: testPhone, otp_code: '000000' });
      expect(res.body.code).toBe('3005');
    });
  });

  describe('Business Logic', () => {
    it('TC-3: Xác thực thành công (Mã 1000) & Cập nhật Status', async () => {
      const res = await request(app).post(endpoint).send({ phone: testPhone, otp_code: validOtp });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);

      const dbCheckUser = await db.query('SELECT status FROM users WHERE phone = $1', [testPhone]);
      expect(dbCheckUser.rows[0].status).toBe('active');
      
      const dbCheckOtp = await db.query('SELECT is_used FROM otps WHERE phone = $1 AND otp_code = $2', [testPhone, validOtp]);
      expect(dbCheckOtp.rows[0].is_used).toBe(true);
    });

    it('TC-4: Lỗi 3005 khi request lại OTP đã sử dụng', async () => {
      const res = await request(app).post(endpoint).send({ phone: testPhone, otp_code: validOtp });
      expect(res.body.code).toBe('3005');
    });
  });
});
