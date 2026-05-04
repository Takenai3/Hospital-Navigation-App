import request from 'supertest';
import app from '../../src/app';

describe('API app_feedback Test Suite', () => {
  const endpoint = '/api/util/app_feedback';
  const mockToken = 'Bearer NGO_THANH_NGAN_TOKEN';

  // TC-1: Luồng chuẩn - Đầy đủ thông tin
  it('TC-1: Gửi feedback đầy đủ ảnh minh chứng thành công (1000)', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .send({
        rating: 5,
        content: "Bản đồ chỉ đường rất chính xác",
        attached_images: ["https://medipath.vn/media/map_check.jpg"]
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toContain('Cảm ơn bạn');
  });

  // TC-2: Luồng chuẩn - Tối thiểu (Không ảnh)
  it('TC-2: Gửi feedback khi bỏ trống mảng ảnh vẫn thành công (1000)', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .send({
        rating: 4,
        content: "App dùng ổn",
        attached_images: []
      });

    expect(res.body.code).toBe('1000');
  });

  // TC-3: Lỗi logic tham số (Rating ngoài khoảng 1-5)
  it('TC-3: Trả lỗi khi rating = 6 (2003)', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .send({
        rating: 6,
        content: "Nội dung hợp lệ"
      });

    expect(res.body.code).toBe('2003');
  });

  // TC-4: Thiếu nội dung
  it('TC-4: Trả lỗi khi để trống nội dung góp ý (2001)', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .send({
        rating: 3,
        content: ""
      });

    expect(res.body.code).toBe('2001');
  });

  // TC-5: Spam phản hồi (Rate Limit)
  it('TC-5: Kích hoạt Rate Limit khi gửi liên tục (2005)', async () => {
    // Giả lập gọi API 21 lần liên tiếp
    for (let i = 0; i < 20; i++) {
      await request(app).post(endpoint).set('Authorization', mockToken).send({ rating: 5, content: "Spam" });
    }

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .send({ rating: 5, content: "Request thứ 21" });

    expect(res.body.code).toBe('2005');
  });
});