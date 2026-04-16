import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Auth Signup - Integration Test Suite
 * Tuân thủ 100% master_test_generator_prompt.txt
 */
describe('Auth Signup - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/auth/signup';
  const validBase = { 
    phone: '0981000001', 
    password: 'Password123!', 
    full_name: 'Nguyen Van Test',
    gender: 1 
  };

  // Dọn dẹp dữ liệu trước và sau khi test bằng các đầu số Viettel (098, 097, 032) và prefix +84
  const cleanup = async () => {
    await db.query("DELETE FROM users WHERE phone LIKE '098%' OR phone LIKE '097%' OR phone LIKE '032%' OR phone LIKE '+84%'");
  };

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await db.end(); // Đóng kết nối DB sau khi hoàn tất test suite
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Đăng ký thành công với đầy đủ thông tin hợp lệ (098)', async () => {
      const phone = '0981111111';
      const res = await request(app).post(endpoint).send({ ...validBase, phone });
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.message).toMatch(/thành công/i);

      // KIỂM TRA KÉP: Truy vấn trực tiếp DB để xác nhận user đã được tạo
      const dbRes = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
      expect(dbRes.rows.length).toBe(1);
      expect(dbRes.rows[0].full_name).toBe(validBase.full_name);
    });

    it('TC-2: Đăng ký thành công với đầu số Viettel 097', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: '0971000001' });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.message).toMatch(/thành công/i);
    });

    it('TC-3: Đăng ký thành công với đầu số Viettel 032', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: '0321000001' });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-4: Đăng ký thành công với SĐT có tiền tố +84', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: '+84981000002' });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });
  });

  describe('Nhóm Validation - Missing/Empty Params (Mã 2001)', () => {
    it('TC-5: Gửi body rỗng {}', async () => {
      const res = await request(app).post(endpoint).send({});
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
      expect(res.body.message).toMatch(/thiếu/i);
    });

    it('TC-6: Thiếu trường phone', async () => {
      const { phone, ...rest } = validBase;
      const res = await request(app).post(endpoint).send(rest);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
      expect(res.body.message).toMatch(/phone/i);
    });

    it('TC-7: Thiếu trường password', async () => {
      const { password, ...rest } = validBase;
      const res = await request(app).post(endpoint).send(rest);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
      expect(res.body.message).toMatch(/password/i);
    });

    it('TC-8: phone truyền vào là null', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: null });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-9: password truyền vào là chuỗi rỗng ""', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: "" });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-10: full_name chỉ chứa khoảng trắng', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: "   " });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('Nhóm Validation - Data Type (Mã 2002)', () => {
    it('TC-11: phone truyền vào là Object', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: { val: '0981' } });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
      expect(res.body.message).toMatch(/kiểu dữ liệu/i);
    });

    it('TC-12: phone chứa ký tự chữ cái (Expect 2003 vì sai regex)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: '0981abc123' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-13: phone chứa ký tự đặc biệt (Expect 2003 vì sai regex)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: '0981#123*' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });
  });

  describe('Nhóm Validation - Invalid Value & Boundaries (Mã 2003)', () => {
    it('TC-14: SĐT quá ngắn (dưới 10 số)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: '098123' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-15: SĐT quá dài (trên 12 số)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, phone: '09812345678901' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-16: full_name cực dài (255 ký tự) - Expect 2003 vì vượt quá VARCHAR(100)', async () => {
      const longName = 'A'.repeat(255);
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: longName, phone: '0981234444' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-17: password thiếu chữ hoa', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: 'password123!' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-18: password thiếu số', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, password: 'Password!' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });
  });

  describe('Nhóm Security & Logic (Mã 3006 / SQLi / XSS)', () => {
    it('TC-19: Đăng ký trùng số điện thoại đã tồn tại', async () => {
      const phone = '0982222222';
      // Đăng ký lần đầu
      await request(app).post(endpoint).send({ ...validBase, phone });
      // Đăng ký lần hai
      const res = await request(app).post(endpoint).send({ ...validBase, phone });
      
      expect(res.body.code).toBe(RESPONSE_CODES.USER_EXISTS);
      expect(res.body.message).toMatch(/tồn tại/i);
    });

    it('TC-20: SQL Injection qua full_name', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: "' OR 1=1 --" });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-21: XSS Injection qua full_name', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: "<script>alert(1)</script>" });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-22: Tên chứa ký tự số (Logic validation)', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: 'Nguyen 123' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-23: Logic tái đăng ký sau khi xóa tài khoản', async () => {
      const phone = '0983333333';
      await request(app).post(endpoint).send({ ...validBase, phone });
      // Xóa trực tiếp từ DB
      await db.query("DELETE FROM users WHERE phone = $1", [phone]);
      // Đăng ký lại
      const res = await request(app).post(endpoint).send({ ...validBase, phone });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-24: Đăng ký với tên có Emoji', async () => {
      const res = await request(app).post(endpoint).send({ ...validBase, full_name: 'Nguyen 😀 A', phone: '0981110006' });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-25: Kiểm tra trạng thái mặc định của user mới (active)', async () => {
      const phone = '0984444444';
      await request(app).post(endpoint).send({ ...validBase, phone });
      
      const dbRes = await db.query("SELECT status FROM users WHERE phone = $1", [phone]);
      expect(dbRes.rows[0].status).toBe('active');
    });
  });
});
