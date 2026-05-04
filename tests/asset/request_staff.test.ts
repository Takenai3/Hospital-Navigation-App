import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Request Staff Integration Test Suite', () => {
  const USER_A_TOKEN = 'user-a-token';
  const USER_B_TOKEN = 'user-b-token';
  const ASSET_ID = 'WL-STAFF-01';
  const NODE_ID = 'ROOM-302';

  beforeAll(async () => {
    // Setup dữ liệu mẫu: Xe đang được User A mượn
    await db.query("INSERT INTO assets (asset_id, status) VALUES ($1, 'In-use')", [ASSET_ID]);
    await db.query(
      "INSERT INTO bookings (asset_id, user_token, status) VALUES ($1, $2, 'Active')",
      [ASSET_ID, USER_A_TOKEN]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM bookings WHERE asset_id = $1", [ASSET_ID]);
    await db.query("DELETE FROM assets WHERE asset_id = $1", [ASSET_ID]);
  });

  describe('POST /api/staff/request_staff', () => {
    const endpoint = '/api/staff/request_staff';

    it('TC-1: Luồng chuẩn - Gọi nhân viên thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({
          asset_id: ASSET_ID,
          node_id: NODE_ID,
          note: 'Bệnh nhân cần người đẩy giúp'
        });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.message).toContain('Đã điều phối nhân viên');
      expect(res.body.data[0]).toHaveProperty('request_id');
    });

    it('TC-2: Bỏ qua tùy chọn note vẫn thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({
          asset_id: ASSET_ID,
          node_id: NODE_ID
          // note bị bỏ trống
        });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-3: Lỗi vị trí - Quên truyền node_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: ASSET_ID });

      expect(res.body.code).toBe('2001');
    });

    it('TC-4: Sai ID xe - Xe không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_A_TOKEN)
        .send({ asset_id: 'INVALID_ID', node_id: NODE_ID });

      expect(res.body.code).toBe('4004');
    });

    it('TC-5: Bảo mật truy cập - User B gọi cho xe User A đang mượn (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', USER_B_TOKEN)
        .send({ asset_id: ASSET_ID, node_id: NODE_ID });

      expect(res.body.code).toBe('1009');
    });

    it('TC-6: Hết hạn phiên - Token không hợp lệ (3002)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', 'expired-token')
        .send({ asset_id: ASSET_ID, node_id: NODE_ID });

      expect(res.body.code).toBe('3002');
    });
  });
});