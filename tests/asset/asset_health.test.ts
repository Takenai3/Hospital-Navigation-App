import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';

describe('Asset Health Integration Test Suite', () => {
  const VALID_TOKEN = 'valid-token-health';
  const MOTOR_ASSET = 'E-WHEEL-01';
  const BROKEN_ASSET = 'B-WHEEL-02';
  const MAINT_ASSET = 'M-WHEEL-03';

  beforeAll(async () => {
    // Setup dữ liệu mẫu
    await db.query(`
      INSERT INTO assets (asset_id, status, is_motorized, battery_level, last_checked)
      VALUES
      ($1, 'normal', true, 85, NOW()),
      ($2, 'broken', false, 0, NOW()),
      ($3, 'maintenance', false, 0, NOW())
    `, [MOTOR_ASSET, BROKEN_ASSET, MAINT_ASSET]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM assets WHERE asset_id IN ($1, $2, $3)", [MOTOR_ASSET, BROKEN_ASSET, MAINT_ASSET]);
  });

  describe('GET /api/asset/asset_health', () => {
    const endpoint = '/api/asset/asset_health';

    it('TC-1: Xe hoạt động tốt - Trả về status normal và pin (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: MOTOR_ASSET });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0].condition).toBe('normal');
      expect(res.body.data[0].battery_level).toBe('85%');
    });

    it('TC-2: Xe bị hỏng - Trả về status broken (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: BROKEN_ASSET });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0].condition).toBe('broken');
    });

    it('TC-3: Xe đang bảo trì - Trả về status maintenance (1000)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: MAINT_ASSET });

      expect(res.body.code).toBe('1000');
      expect(res.body.data[0].condition).toBe('maintenance');
    });

    it('TC-4: Thiếu tham số - Bỏ trống asset_id (2001)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN);

      expect(res.body.code).toBe('2001');
    });

    it('TC-5: Mã xe ảo - ID không tồn tại hoặc ký tự đặc biệt (4004)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', VALID_TOKEN)
        .query({ asset_id: '!@#$%' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-6: Hết hạn Token - Token không hợp lệ (3002)', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('token', 'expired-token')
        .query({ asset_id: MOTOR_ASSET });

      expect(res.body.code).toBe('3002');
    });
  });
});