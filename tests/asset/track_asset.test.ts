import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Track Asset Integration Test Suite', () => {
  const ADMIN_TOKEN = 'ADMIN_SECRET_001';
  const USER_A_TOKEN = 'USER_A_123';
  const USER_B_TOKEN = 'USER_B_456';
  const ASSET_ID = 'ID_001';

  beforeAll(async () => {
    // Setup: Tạo xe đang được USER_A mượn
    await db.query(`
      INSERT INTO assets (asset_id, pos_x, pos_y, floor, current_node_id, moving_status, borrower_id, status)
      VALUES ($1, '12.5', '45.0', '1', 'NODE_001', 'moving', $2, 'in_use')
    `, [ASSET_ID, USER_A_TOKEN]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM assets WHERE asset_id = $1", [ASSET_ID]);
  });

  describe('GET /api/asset/track_asset', () => {
    const endpoint = '/api/asset/track_asset';

    it('TC-1: Luồng chuẩn - Người mượn theo dõi xe của mình (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', USER_A_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0].moving_status).toBe('moving');
    });

    it('TC-2: Theo dõi xe đang đứng im tại trạm (1000)', async () => {
      const STATIONARY_ID = 'ID_STATIONARY';
      await db.query(`INSERT INTO assets (asset_id, moving_status, status) VALUES ($1, 'stationary', 'Available')`, [STATIONARY_ID]);

      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN) // Admin có quyền xem mọi xe
        .query({ asset_id: STATIONARY_ID });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0].moving_status).toBe('stationary');

      await db.query("DELETE FROM assets WHERE asset_id = $1", [STATIONARY_ID]);
    });

    it('TC-3: Bảo mật truy cập chéo - USER_B cố tình theo dõi xe của USER_A (1009)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', USER_B_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('1009');
    });

    it('TC-4: Thiếu tham số - Bỏ trống asset_id (2001)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN);

      expect(res.body.code).toBe('2001');
    });

    it('TC-5: Sai mã xe - ID không tồn tại (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN)
        .query({ asset_id: 'NON_EXISTENT' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-6: Quá tải request - Polling quá nhanh (2005)', async () => {
      // Gọi lần 1 thành công
      await request(app).get(endpoint).set('token', ADMIN_TOKEN).query({ asset_id: ASSET_ID });

      // Gọi lần 2 ngay lập tức (dưới 3 giây)
      const res = await request(app)
        .get(endpoint)
        .set('token', ADMIN_TOKEN)
        .query({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('2005');
    });
  });
});