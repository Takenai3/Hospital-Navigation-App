import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Auth Verify OTP - Integration Test Suite (TDD)', () => {
  const endpoint = '/api/auth/verify_otp';
  const testPhone = '0988123456';
  const validOtp = '123456';

  beforeAll(async () => {
    // Dọn dẹp dữ liệu cũ cho số điện thoại test
    await db.query('DELETE FROM otps WHERE phone_number = $1', [testPhone]);
  });

  afterAll(async () => {
    // Dọn dẹp sau khi kết thúc bộ test
    await db.query('DELETE FROM otps WHERE phone_number = $1', [testPhone]);
  });

  describe('Validation & Parameter Errors (Mã 2001, 2003)', () => {
    it('TC-1: Thiếu phone_number trong request', async () => {
      const res = await request(app).post(endpoint).send({ otp_code: validOtp });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(2001);
    });

    it('TC-2: Thiếu otp_code trong request', async () => {
      const res = await request(app).post(endpoint).send({ phone_number: testPhone });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(2001);
    });

    it('TC-3: Request body rỗng {}', async () => {
      const res = await request(app).post(endpoint).send({});
      expect(res.body.code).toBe(2001);
    });

    it('TC-4: OTP sai định dạng (chứa chữ cái)', async () => {
      const res = await request(app).post(endpoint).send({ phone_number: testPhone, otp_code: '123A56' });
      expect(res.body.code).toBe(2003);
    });

    it('TC-5: OTP quá ngắn (dưới 6 số)', async () => {
      const res = await request(app).post(endpoint).send({ phone_number: testPhone, otp_code: '12345' });
      expect(res.body.code).toBe(2003);
    });

    it('TC-6: OTP quá dài (trên 6 số)', async () => {
      const res = await request(app).post(endpoint).send({ phone_number: testPhone, otp_code: '1234567' });
      expect(res.body.code).toBe(2003);
    });
  });

  describe('Business Logic & Database Integration (Mã 3005, 1000)', () => {
    it('TC-7: Trả về lỗi 3005 khi OTP đã hết hạn (Check SQL Real)', async () => {
      // Arrange: Chọc thẳng vào DB để tạo 1 OTP đã hết hạn từ hôm qua
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await db.query(
        'INSERT INTO otps (phone_number, otp_code, expires_at, is_used) VALUES ($1, $2, $3, $4)',
        [testPhone, '654321', yesterday, false]
      );

      // Act
      const res = await request(app).post(endpoint).send({ phone_number: testPhone, otp_code: '654321' });

      // Assert
      expect(res.body.code).toBe(3005); // OTP expired
    });

    it('TC-8: Trả về lỗi khi OTP không tồn tại hoặc sai mã', async () => {
      const res = await request(app).post(endpoint).send({ phone_number: testPhone, otp_code: '000000' });
      expect(res.body.code).toBe(3005); // Hoặc mã lỗi tương đương cho "Invalid OTP"
    });

    it('TC-9: Xác thực thành công (Mã 1000) và kiểm tra trạng thái IS_USED trong DB', async () => {
      // Arrange: Tạo OTP hợp lệ (hết hạn sau 5 phút)
      const future = new Date();
      future.setMinutes(future.getMinutes() + 5);
      const successOtp = '888888';
      
      await db.query(
        'INSERT INTO otps (phone_number, otp_code, expires_at, is_used) VALUES ($1, $2, $3, $4)',
        [testPhone, successOtp, future, false]
      );

      // Act
      const res = await request(app).post(endpoint).send({ phone_number: testPhone, otp_code: successOtp });

      // Assert API
      expect(res.body.code).toBe(1000);

      // Assert Database: Chọc vào DB kiểm tra is_used đã thành TRUE chưa
      const dbCheck = await db.query('SELECT is_used FROM otps WHERE phone_number = $1 AND otp_code = $2', [testPhone, successOtp]);
      expect(dbCheck.rows[0].is_used).toBe(true);
    });

    it('TC-10: Không cho phép sử dụng lại OTP đã xác thực thành công', async () => {
      // SĐT testPhone với OTP 888888 đã is_used = true ở TC-9
      const res = await request(app).post(endpoint).send({ phone_number: testPhone, otp_code: '888888' });
      expect(res.body.code).toBe(3005); // Coi như không hợp lệ vì đã dùng
    });
  });
});
