import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('API faq_list Test Suite', () => {
  const endpoint = '/api/util/faq_list';

  beforeAll(async () => {
    await db.connect();
    // Tạo dữ liệu mẫu để đảm bảo luôn có kết quả khi test TC-1 và TC-2
    await db.query(`
      INSERT INTO faqs (category, question, answer)
      VALUES ('app_guide', '[TEST] Làm sao quét mã?', '<b>HD:</b> Dùng camera quét mã QR tại phòng.')
    `);
  });

  afterAll(async () => {
    await db.query("DELETE FROM faqs WHERE question LIKE '[TEST]%'");
  });

  it('TC-1: Luồng chuẩn - Lấy toàn bộ danh sách FAQ (1000)', async () => {
    const res = await request(app).get(endpoint);

    expect(res.body.code).toBe('1000');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('faq_id'); //
  });

  it('TC-2: Lọc theo category thành công (1000)', async () => {
    const res = await request(app)
      .get(endpoint)
      .query({ category: 'app_guide' });

    expect(res.body.code).toBe('1000');
    // Kiểm tra xem mọi item trả về có đúng format không
    res.body.data.forEach((item: any) => {
      expect(typeof item.answer).toBe('string'); // Định dạng HTML
    });
  });

  it('TC-3: Trả về mảng rỗng khi category không tồn tại (1000)', async () => {
    const res = await request(app)
      .get(endpoint)
      .query({ category: 'khong_ton_tai' });

    expect(res.body.code).toBe('1000');
    expect(res.body.data).toEqual([]); //
  });

  it('TC-5: Trả lỗi 2004 khi dùng sai phương thức POST (2004)', async () => {
    const res = await request(app).post(endpoint);

    expect(res.body.code).toBe('2004'); //
    expect(res.body.message).toContain('Method not allowed');
  });
});