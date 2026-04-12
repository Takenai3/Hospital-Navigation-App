import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Auth Login - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/auth/login';
  const testUser = { phone_number: '0912000001', password: 'Password123!', full_name: 'User Login' };

  beforeAll(async () => {
    await db.query("DELETE FROM users WHERE phone_number = $1", [testUser.phone_number]);
    // Tạo sẵn user để test login
    await db.query(
      "INSERT INTO users (phone_number, password, full_name, status) VALUES ($1, $2, $3, $4)",
      [testUser.phone_number, testUser.password, testUser.full_name, 'active']
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE phone_number = $1", [testUser.phone_number]);
  });

  describe('Successful Login & Token Logic', () => {
    it('TC-1: Đăng nhập thành công với thông tin đúng', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password 
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1000);
      expect(typeof res.body.data.accessToken).toBe('string');
    });

    it('TC-2: Đăng nhập thành công trả về đúng thông tin user_id', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password 
      });
      expect(res.body.data).toHaveProperty('user_id');
    });

    it('TC-3: Hai lần đăng nhập liên tiếp phải sinh ra 2 token khác nhau', async () => {
      const res1 = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password 
      });
      const res2 = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password 
      });
      expect(res1.body.data.accessToken).not.toBe(res2.body.data.accessToken);
    });

    it('TC-4: Kiểm tra sự tồn tại của Refresh Token trong response', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password 
      });
      expect(res.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('Input Validation Errors (Mã 2001/2002)', () => {
    it('TC-5: Bỏ trống phone_number', async () => {
      const res = await request(app).post(endpoint).send({ password: testUser.password });
      expect(res.body.code).toBe(2001);
    });

    it('TC-6: Bỏ trống password', async () => {
      const res = await request(app).post(endpoint).send({ phone_number: testUser.phone_number });
      expect(res.body.code).toBe(2001);
    });

    it('TC-7: Gửi body rỗng {}', async () => {
      const res = await request(app).post(endpoint).send({});
      expect(res.body.code).toBe(2001);
    });

    it('TC-8: Truyền phone_number sai kiểu dữ liệu (Object)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: { num: testUser.phone_number }, 
        password: testUser.password 
      });
      expect(res.body.code).toBe(2002);
    });

    it('TC-9: Truyền password sai kiểu dữ liệu (Array)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: ['pass'] 
      });
      expect(res.body.code).toBe(2002);
    });
  });

  describe('Authentication Failures (Mã 3007/3008)', () => {
    it('TC-10: SĐT chưa từng đăng ký', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: '0888888888', 
        password: 'any' 
      });
      expect(res.body.code).toBe(3007);
    });

    it('TC-11: Sai mật khẩu (Sai 1 ký tự)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password + 'x' 
      });
      expect(res.body.code).toBe(3008);
    });

    it('TC-12: Sai mật khẩu (Phân biệt hoa thường)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password.toLowerCase() 
      });
      expect(res.body.code).toBe(3008);
    });

    it('TC-13: Mật khẩu có thêm khoảng trắng ở cuối', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password + ' ' 
      });
      expect(res.body.code).toBe(3008);
    });

    it('TC-14: Mật khẩu là null', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: null 
      });
      expect(res.body.code).toBe(2001);
    });
  });

  describe('Security & Account Status (Mã 3009/SQLi)', () => {
    it('TC-15: Chặn đăng nhập đối với tài khoản bị khóa (status = banned)', async () => {
      await db.query("UPDATE users SET status = 'banned' WHERE phone_number = $1", [testUser.phone_number]);
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password 
      });
      expect(res.body.code).toBe(3009);
      await db.query("UPDATE users SET status = 'active' WHERE phone_number = $1", [testUser.phone_number]);
    });

    it('TC-16: SQL Injection attempt qua phone_number', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: "' OR '1'='1", 
        password: 'any' 
      });
      expect(res.body.code).toBe(2002);
    });

    it('TC-17: SQL Injection attempt qua password', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: "' OR '1'='1" 
      });
      expect(res.body.code).toBe(3008);
    });

    it('TC-18: Tài khoản chưa kích hoạt (status = pending)', async () => {
      await db.query("UPDATE users SET status = 'pending' WHERE phone_number = $1", [testUser.phone_number]);
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password 
      });
      expect(res.body.code).toBe(3009); // Giả định cùng mã code chặn truy cập
      await db.query("UPDATE users SET status = 'active' WHERE phone_number = $1", [testUser.phone_number]);
    });
  });

  describe('System & Edge Cases', () => {
    it('TC-19: Gửi body chứa trường lạ (Check resilience)', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: testUser.password,
        hacker_data: 'exploit' 
      });
      expect(res.body.code).toBe(1000);
    });

    it('TC-20: Đăng nhập với SĐT có khoảng trắng ở đầu/cuối', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: ' ' + testUser.phone_number + ' ', 
        password: testUser.password 
      });
      expect(res.body.code).toBe(1000); // Hệ thống nên trim
    });

    it('TC-21: Thử đăng nhập với mật khẩu cực dài', async () => {
      const res = await request(app).post(endpoint).send({ 
        phone_number: testUser.phone_number, 
        password: 'a'.repeat(500) 
      });
      expect(res.body.code).toBe(3008);
    });
  });
});
