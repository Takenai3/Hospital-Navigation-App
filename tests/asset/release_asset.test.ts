import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Release Asset Integration Test Suite', () => {
  const USER_A_TOKEN = 'user-a-token';
  const USER_B_TOKEN = 'user-b-token';
  const ASSET_ID = 'WL-RELEASE-01';
  const STATION_ID = 'STATION_HANOI';

  beforeAll(async () => {
    // Tạo trạm và thiết bị
    await db.query("INSERT INTO stations (id, name) VALUES ($1, 'Trạm A')", [STATION_ID]);
    await db.query("INSERT INTO assets (asset_id, status) VALUES ($1, 'In-use')", [ASSET_ID]);
    // Giả lập User A đang mượn xe này
    await db.query(
      "INSERT INTO bookings (asset_id, user_token, status) VALUES ($1, $2, 'Active')",
      [ASSET_ID, USER_A_TOKEN]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM bookings WHERE asset_id = $1", [ASSET_ID]);
    await db.query("DELETE FROM assets WHERE asset_id = $1", [ASSET_ID]);
    await db.query("DELETE FROM stations WHERE id = $1", [STATION_ID]);
  });

  describe('POST /api/asset/release_asset', () => {
    const endpoint = '/api/asset/release_asset';

    it('TC-1: Luồng chuẩn - Trả xe thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: ASSET_ID, station_id: STATION_ID });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);

      // Kiểm tra DB: trạng thái xe phải là Available
      const check = await db.query("SELECT status, current_node_id FROM assets WHERE asset_id = $1", [ASSET_ID]);
      expect(check.rows[0].status).toBe('Available');
      expect(check.rows[0].current_node_id).toBe(STATION_ID);
    });

    it('TC-2: Bảo mật chéo - User B trả hộ User A (1009)', async () => {
      // Giả lập xe đang bị User A mượn lại
      await db.query("UPDATE assets SET status = 'In-use' WHERE asset_id = $1", [ASSET_ID]);
      await db.query("UPDATE bookings SET status = 'Active' WHERE asset_id = $1", [ASSET_ID]);

      const res = await request(app)
        .post(endpoint)
        .set('token', USER_B_TOKEN)
        .send({ asset_id: ASSET_ID, station_id: STATION_ID });

      expect(res.body.code).toBe('1009');
    });

    it('TC-3: Trạm tập kết không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: ASSET_ID, station_id: 'INVALID_STATION' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: Thiếu tham số bắt buộc (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: ASSET_ID }); // Thiếu station_id

      expect(res.body.code).toBe('2001');
    });

    it('TC-6: Token hết hạn (3002)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', 'expired-token')
        .send({ asset_id: ASSET_ID, station_id: STATION_ID });

      expect(res.body.code).toBe('3002');
    });
  });
});