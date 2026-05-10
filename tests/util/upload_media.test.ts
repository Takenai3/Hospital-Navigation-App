import request from 'supertest';
import app from '../../src/app';

describe('API upload_media Test Suite', () => {
  const endpoint = '/api/util/upload_media';
  const mockToken = 'Bearer VALID_TOKEN_123';

  // TC-1: Luồng chuẩn - File hợp lệ
  it('TC-1: Upload ảnh .jpg 2MB thành công (1000)', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .field('folder', 'report')
      .attach('file', Buffer.from('dummy image data'), 'sample_image.jpg');

    expect(res.body.code).toBe('1000');
    expect(res.body.data).toHaveProperty('url');
    expect(res.body.data.url).toContain('https://');
  });

  // TC-2: Định dạng không hỗ trợ
  it('TC-2: Từ chối file .exe để đảm bảo an ninh (2003)', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .attach('file', Buffer.from('virus content'), 'virus.exe');

    expect(res.body.code).toBe('2003');
  });

  // TC-3: Vượt quá dung lượng
  it('TC-3: Trả lỗi khi file video vượt quá giới hạn cấu hình (2006)', async () => {
    // Tạo Buffer giả dung lượng 6MB (Vượt quá limit 5MB của cấu hình Multer)
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
    
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .attach('file', largeBuffer, 'large_video.mp4');

    expect(res.body.code).toBe('2006');
  });

  // TC-4: Thiếu tệp tin
  it('TC-4: Gọi API nhưng không đính kèm file (2001)', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', mockToken)
      .field('folder', 'avatar');

    expect(res.body.code).toBe('2001');
  });

  // TC-5: Lỗi xác thực
  it('TC-5: Không truyền token trong Header (3003)', async () => {
    const res = await request(app)
      .post(endpoint)
      .attach('file', Buffer.from('dummy image data'), 'sample_image.jpg');

    expect(res.body.code).toBe('3003');
  });
});
