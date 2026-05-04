import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';


describe('SOS Request Integration Test Suite', () => {
  let validToken: string;
  const PREFIX = 'SOS_T_';
  const TEST_MAP_ID = 999;
  const VALID_NODE_ID = PREFIX + 'NODE_01';

  beforeAll(async () => {
    // Tạo Map và Node giả lập để test vị trí
    await db.query("INSERT INTO maps (id, building_code) VALUES ($1, 'SOS_BLDG')", [TEST_MAP_ID]);
    await db.query("INSERT INTO nodes (id, map_id, type) VALUES ($1, $2, 'hallway')", [VALID_NODE_ID, TEST_MAP_ID]);

    // Tạo User để lấy token
    const user = await db.query("INSERT INTO users (phone, full_name) VALUES ('0911911911', 'SOS User') RETURNING id");
    validToken = 'token-' + user.rows[0].id;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await db.query("DELETE FROM sos_requests WHERE node_id LIKE $1", [PREFIX + '%']);
    await db.query("DELETE FROM nodes WHERE id LIKE $1", [PREFIX + '%']);
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
    await db.query("DELETE FROM users WHERE phone = '0911911911'");
  });

  describe('POST /api/help/sos_requests', () => {
    const endpoint = '/api/help/sos_requests';

    it('TC-1: Gửi SOS thành công với đầy đủ thông tin (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ node_id: VALID_NODE_ID, note: "Bệnh nhân khó thở" });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.message).toContain("Nhân viên đang đến");
      expect(res.body.data.status).toBe('received');
    });

    it('TC-2: Gửi SOS thành công khi bỏ trống trường note (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ node_id: VALID_NODE_ID });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-3: Thất bại khi gửi node_id không tồn tại (4004)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ node_id: 'NODE_AO_MA_123' });

      expect(res.body.code).toBe('4004');
    });

    it('TC-4: Thất bại khi thiếu node_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ note: "Cấp cứu!" });

      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-5: Chặn gửi SOS liên tục trong thời gian ngắn (2005)', async () => {
      // Gửi lần 1
      await request(app).post(endpoint).set('token', validToken).send({ node_id: VALID_NODE_ID });
      // Gửi lần 2 ngay lập tức
      const res = await request(app)
        .post(endpoint)
        .set('token', validToken)
        .send({ node_id: VALID_NODE_ID });

      expect(res.body.code).toBe('2005');
    });

    it('TC-6: Thất bại khi không có token (3003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ node_id: VALID_NODE_ID });

      expect(res.body.code).toBe('3003');
    });
  });
});