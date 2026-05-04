import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Report Broken Asset Integration Test Suite', () => {
  const VALID_TOKEN = 'user-token-123';
  const ASSET_ID = 'WL-BROKEN-01';

  beforeAll(async () => {
    // Tạo thiết bị mẫu ở trạng thái Available
    await db.query("INSERT INTO assets (asset_id, status) VALUES ($1, 'Available')", [ASSET_ID]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM asset_reports WHERE asset_id = $1", [ASSET_ID]);
    await db.query("DELETE FROM assets WHERE asset_id = $1", [ASSET_ID]);
  });

  describe('POST /api/asset/report_broken_asset', () => {
    const endpoint = '/api/asset/report_broken_asset';

    it('TC-1: Luồng chuẩn - Có ảnh minh chứng (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({
          asset_id: ASSET_ID,
          reason: 'Bánh xe bên phải bị kẹt',
          image_url: 'http://cdn.hospital.com/img/broken_1.jpg'
        });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0]).toHaveProperty('report_id');

      // Kiểm tra DB: trạng thái xe phải chuyển sang broken
      const check = await db.query("SELECT status FROM assets WHERE asset_id = $1", [ASSET_ID]);
      expect(check.rows[0].status).toBe('broken');
    });

    it('TC-2: Luồng chuẩn - Không có ảnh (1000)', async () => {
      // Reset trạng thái xe về Available để test
      await db.query("UPDATE assets SET status = 'Available' WHERE asset_id = $1", [ASSET_ID]);

      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({
          asset_id: ASSET_ID,
          reason: 'Xịt lốp'
          // image_url bỏ trống
        });

      expect(res.body.code).toBe('1000');
    });

    it('TC-3: Lỗi tham số - Quên truyền reason (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('2001');
    });

    it('TC-4: Sai ID xe - Xe không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({ asset_id: 'NON-EXISTENT', reason: 'Hỏng linh tinh' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: Báo lỗi trùng lặp - Xe đã ở trạng thái broken (1000)', async () => {
      // Đảm bảo xe đang là broken
      await db.query("UPDATE assets SET status = 'broken' WHERE asset_id = $1", [ASSET_ID]);

      const res = await request(app)
        .post(endpoint)
        .set('token', VALID_TOKEN)
        .send({ asset_id: ASSET_ID, reason: 'Lại bị kẹt bánh' });

      expect(res.body.code).toBe('1000');
      expect(res.body.message).toContain('đã được ghi nhận');
    });

    it('TC-6: Lỗi xác thực - Token hết hạn (3002)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', 'expired-token')
        .send({ asset_id: ASSET_ID, reason: 'Lỗi' });

      expect(res.body.code).toBe('3002');
    });
  });
});