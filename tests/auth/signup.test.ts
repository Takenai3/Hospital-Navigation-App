import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Auth Signup - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/auth/signup';
  const validBase = { 
    phone_number: '0123000001', 
    password: 'Password123!', 
    full_name: 'Nguyen Van A',
    gender: 1 
  };

  // Dọn dẹp dữ liệu trước và sau khi chạy bộ test
  beforeAll(async () => {
    await db.query("DELETE FROM users WHERE phone_number LIKE '0123%' OR phone_number LIKE '0912%'");
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE phone_number LIKE '0123%' OR phone_number LIKE '0912%'");
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Đăng ký thành công với đầy đủ thông tin hợp lệ', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '0123000001' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1000);
    });

    it('TC-2: Đăng ký thành công với SĐT 11 số (Đầu số cũ)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '01230000011' });
      expect(res.body.code).toBe(1000);
    });

    it('TC-3: Logic tái đăng ký: Đăng ký -> Xóa -> Đăng ký lại cùng SĐT', async () => {
      const phone = '0123999999';
      await request(app).post(endpoint).send({ ...validBase, phone_number: phone });
      await db.query('DELETE FROM users WHERE phone_number = $1', [phone]);
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: phone });
      expect(res.body.code).toBe(1000);
    });

    it('TC-4: Đăng ký với SĐT bắt đầu bằng +84', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '+84912345678' });
      expect(res.body.code).toBe(1000);
    });
  });

  describe('Validation Errors - Missing/Empty Params (Mã 2001)', () => {
    it('TC-5: Gửi body rỗng {}', async () => {
      const res = await request(app).post(endpoint).send({});
      expect(res.body.code).toBe(2001);
    });

    it('TC-6: Thiếu trường phone_number', async () => {
      const { phone_number, ...rest } = validBase;
      const res = await request(app).post(endpoint).send(rest);
      expect(res.body.code).toBe(2001);
    });

    it('TC-7: Thiếu trường password', async () => {
      const { password, ...rest } = validBase;
      const res = await request(app).post(endpoint).send(rest);
      expect(res.body.code).toBe(2001);
    });

    it('TC-8: phone_number là null', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: null });
      expect(res.body.code).toBe(2001);
    });

    it('TC-9: password là chuỗi rỗng ""', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: "" });
      expect(res.body.code).toBe(2001);
    });

    it('TC-10: full_name chỉ chứa khoảng trắng "   "', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: "   " });
      expect(res.body.code).toBe(2001);
    });

    it('TC-11: phone_number là undefined', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: undefined });
      expect(res.body.code).toBe(2001);
    });
  });

  describe('Data Type & Formatting (Mã 2002)', () => {
    it('TC-12: phone_number truyền vào là mảng [0123]', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: ['0123456789'] });
      expect(res.body.code).toBe(2002);
    });

    it('TC-13: SĐT chứa ký tự đặc biệt (0123#456*)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '0123#456*' });
      expect(res.body.code).toBe(2002);
    });

    it('TC-14: SĐT chứa chữ cái (0123abc789)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '0123abc789' });
      expect(res.body.code).toBe(2002);
    });

    it('TC-15: SĐT bắt đầu bằng số không hợp lệ (Số 1)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '1234567890' });
      expect(res.body.code).toBe(2002);
    });
  });

  describe('Boundary Values - Phone & Name (Mã 2002/2003)', () => {
    it('TC-16: SĐT quá ngắn (9 số)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '012345678' });
      expect(res.body.code).toBe(2002);
    });

    it('TC-17: SĐT quá dài (12 số)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '012345678901' });
      expect(res.body.code).toBe(2002);
    });

    it('TC-18: Tên chỉ có 1 ký tự', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: 'A' });
      expect(res.body.code).toBe(2003);
    });

    it('TC-19: Tên cực dài (255 ký tự)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: 'A'.repeat(255), phone_number: '0123111005' });
      expect(res.body.code).toBe(1000);
    });

    it('TC-20: Tên chứa Emoji (😀)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: 'Nguyen 😀 A', phone_number: '0123111006' });
      expect(res.body.code).toBe(1000);
    });

    it('TC-21: Tên chứa ký tự số', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: 'Nguyen 123 A' });
      expect(res.body.code).toBe(2003);
    });
  });

  describe('Password Policies (Mã 2003)', () => {
    it('TC-22: Password đúng biên dưới (8 ký tự)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: 'Pass123!', phone_number: '0123111001' });
      expect(res.body.code).toBe(1000);
    });

    it('TC-23: Password đúng biên trên (100 ký tự)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: 'A'.repeat(99) + '!', phone_number: '0123111002' });
      expect(res.body.code).toBe(1000);
    });

    it('TC-24: Password thiếu chữ hoa', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: 'password123!' });
      expect(res.body.code).toBe(2003);
    });

    it('TC-25: Password thiếu số', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: 'Password!' });
      expect(res.body.code).toBe(2003);
    });

    it('TC-26: Password có khoảng trắng ở giữa', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: 'Pass word123!' });
      expect(res.body.code).toBe(2003);
    });

    it('TC-27: Password có khoảng trắng ở đầu/cuối', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: ' Password123! ', phone_number: '0123111007' });
      expect(res.body.code).toBe(1000);
    });
  });

  describe('Security Rules (Mã 2003)', () => {
    it('TC-28: SQL Injection attempt qua full_name', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: "' OR 1=1 --" });
      expect(res.body.code).toBe(2003);
    });

    it('TC-29: XSS Injection attempt qua full_name', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: "<script>alert(1)</script>" });
      expect(res.body.code).toBe(2003);
    });
  });

  describe('Business Logic Errors (Mã 3006)', () => {
    it('TC-30: Đăng ký trùng số điện thoại đã tồn tại', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone_number: '0123000001' });
      expect(res.body.code).toBe(3006);
    });
  });
});
