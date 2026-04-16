import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Auth Login - Integration Test Suite
 * Tuân thủ 100% master_test_generator_prompt.txt
 */
describe('Auth Login - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/auth/login';
  const testUser = { 
    phone: '0981222222', 
    password: 'Password123!', 
    full_name: 'Login Test User' 
  };

  beforeAll(async () => {
    // Dọn dẹp và tạo user thật cho các kịch bản đăng nhập
    await db.query("DELETE FROM users WHERE phone = $1", [testUser.phone]);
    // Sử dụng cột 'password_hash' theo đúng schema
    await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, $2, $3, $4)",
      [testUser.phone, testUser.password, testUser.full_name, 'active']
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE phone = $1", [testUser.phone]);
    await db.end();
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Đăng nhập thành công với thông tin đúng', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password 
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.message).toMatch(/thành công/i);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('TC-2: Đăng nhập thành công trả về đúng thông tin user_id', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password 
      });
      expect(res.body.data).toHaveProperty('user_id');
    });

    it('TC-3: Hai lần đăng nhập liên tiếp sinh ra token khác nhau', async () => {
      const res1 = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password 
      });
      const res2 = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password 
      });
      expect(res1.body.data.accessToken).not.toBe(res2.body.data.accessToken);
    });

    it('TC-4: Đăng nhập thành công với SĐT có khoảng trắng', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: '  ' + testUser.phone + '  ', 
        password: testUser.password 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });
  });

  describe('Nhóm Validation (Mã 2001/2002)', () => {
    it('TC-5: Bỏ trống phone', async () => {
      const res = await request(app).post(endpoint).send({ password: testUser.password });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
      expect(res.body.message).toMatch(/thiếu/i);
    });

    it('TC-6: Bỏ trống password', async () => {
      const res = await request(app).post(endpoint).send({ phone: testUser.phone });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-7: Gửi body rỗng {}', async () => {
      const res = await request(app).post(endpoint).send({});
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-8: Truyền phone sai kiểu dữ liệu (Array)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: [testUser.phone], 
        password: testUser.password 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-9: SQL Injection qua phone', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: "' OR '1'='1", 
        password: 'any' 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });
  });

  describe('Nhóm Authentication Failures (Mã 3007/3008)', () => {
    it('TC-10: SĐT chưa từng đăng ký', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: '0981999999', 
        password: 'any' 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.USER_NOT_FOUND);
      expect(res.body.message).toMatch(/không tồn tại|không tìm thấy/i);
    });

    it('TC-11: Sai mật khẩu (Sai 1 ký tự)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password + 'x' 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.PASSWORD_INCORRECT);
      expect(res.body.message).toMatch(/mật khẩu/i);
    });

    it('TC-12: Sai mật khẩu (Phân biệt hoa thường)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password.toLowerCase() 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.PASSWORD_INCORRECT);
    });

    it('TC-13: Mật khẩu là null', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: null 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('Nhóm Security & Account Status (Mã 3101/Banned)', () => {
    it('TC-14: Chặn đăng nhập đối với tài khoản bị khóa (banned)', async () => {
      // Cập nhật trạng thái trong DB thật
      await db.query("UPDATE users SET status = 'banned' WHERE phone = $1", [testUser.phone]);
      
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password 
      });
      
      expect(res.body.code).toBe(RESPONSE_CODES.PERMISSION_DENIED);
      expect(res.body.message).toMatch(/khóa|truy cập/i);
      
      // Hoàn tác trạng thái
      await db.query("UPDATE users SET status = 'active' WHERE phone = $1", [testUser.phone]);
    });

    it('TC-15: Chặn đăng nhập đối với tài khoản chưa kích hoạt (inactive)', async () => {
      await db.query("UPDATE users SET status = 'inactive' WHERE phone = $1", [testUser.phone]);
      
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password 
      });
      
      expect(res.body.code).toBe(RESPONSE_CODES.PERMISSION_DENIED);
      
      await db.query("UPDATE users SET status = 'active' WHERE phone = $1", [testUser.phone]);
    });
  });

  describe('Edge Cases & System Resilience', () => {
    it('TC-16: Gửi body chứa trường dư thừa', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password,
        extra_field: 'hacker'
      });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-17: Đăng nhập với mật khẩu cực dài', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: 'A'.repeat(1000) 
      });
      expect(res.body.code).toBe(RESPONSE_CODES.PASSWORD_INCORRECT);
    });

    it('TC-18: Kiểm tra Refresh Token trong response', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone: testUser.phone, 
        password: testUser.password 
      });
      expect(res.body.data).toHaveProperty('refreshToken');
    });
  });
});
