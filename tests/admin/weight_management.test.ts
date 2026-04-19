import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Admin Weight Management Integration Test Suite
 * Tuân thủ admin_modular_prompt.txt & admin_spec.txt (Slide 30)
 */
describe('Admin Weight Management Integration Test Suite', () => {
  let adminToken: string;
  let userToken: string;

  const PREFIX = 'W_TEST_';
  const TEST_ADMIN_PHONE = '0984000001';
  const TEST_USER_PHONE = '0974000001';
  const TEST_MAP_ID = 40001;
  const TEST_WARD_ID = 40001;
  const DUMMY_NODE_ID = PREFIX + 'DUMMY_WARD';
  const NODE_A = PREFIX + 'NODE_A';
  const NODE_B = PREFIX + 'NODE_B';
  let testEdgeId: number;

  beforeAll(async () => {
    // 1. Tạo Map cơ sở
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_WEIGHT', 'Weight Bldg', 1, 1)", [TEST_MAP_ID]);
    
    // 2. Tạo Node mồi cho Ward và Edge
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, 0, 0, 'hallway'), ($3, $2, 10, 10, 'hallway'), ($4, $2, 0, 0, 'hallway')", [NODE_A, TEST_MAP_ID, NODE_B, DUMMY_NODE_ID]);

    // 3. Tạo Ward cơ sở (BẮT BUỘC để tạo Staff)
    await db.query("INSERT INTO wards (id, map_node_id, name) VALUES ($1, $2, 'Khoa Test Weight')", [TEST_WARD_ID, DUMMY_NODE_ID]);

    const edgeRes = await db.query(
        "INSERT INTO steps (map_id, start_node_id, end_node_id, distance) VALUES ($1, $2, $3, 1.0) RETURNING id",
        [TEST_MAP_ID, NODE_A, NODE_B]
    );
    testEdgeId = edgeRes.rows[0].id;

    // 4. Tạo tài khoản Admin
    const adminUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'Admin Weight', 'active') RETURNING id",
      [TEST_ADMIN_PHONE]
    );
    await db.query(
      "INSERT INTO staffs (user_id, ward_id, role, status) VALUES ($1, $2, 'admin', 'available')",
      [adminUser.rows[0].id, TEST_WARD_ID]
    );
    adminToken = 'token-admin-' + adminUser.rows[0].id;

    // 5. Tạo tài khoản User thường
    const regularUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'User Weight', 'active') RETURNING id",
      [TEST_USER_PHONE]
    );
    userToken = 'token-user-' + regularUser.rows[0].id;
  });

  afterAll(async () => {
    // --- QUY TRÌNH DỌN DẸP BẤT KHẢ XÂM PHẠM ---
    await db.query("DELETE FROM staffs WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0984000%' OR phone LIKE '0974000%')");
    await db.query("DELETE FROM wards WHERE id = $1 OR map_node_id LIKE $2", [TEST_WARD_ID, PREFIX + '%']);
    await db.query("DELETE FROM steps WHERE map_id = $1 OR start_node_id LIKE $2 OR end_node_id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM devices WHERE current_node_id LIKE $1", [PREFIX + '%']);
    await db.query("DELETE FROM nodes WHERE map_id = $1 OR id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM users WHERE phone LIKE '0984000%' OR phone LIKE '0974000%'");
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
  });

  describe('set_weight API', () => {
    const endpoint = '/api/admin/set_weight';

    it('TC-1: Cập nhật trọng số thành công với quyền Admin (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ edge_id: testEdgeId, weight: 2.5 });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-2: Không thể cập nhật trọng số nếu là User thường (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ edge_id: testEdgeId, weight: 3.0 });
      expect(res.body.code).toBe('1009');
    });

    it('TC-3: Thất bại khi trọng số <= 0 (2003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ edge_id: testEdgeId, weight: 0 });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-4: Thất bại khi trọng số là số âm (2003)', async () => {
        const res = await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ edge_id: testEdgeId, weight: -5.5 });
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
      });

    it('TC-5: Thất bại khi thiếu edge_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ weight: 5 });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-6: Cập nhật cho edge không tồn tại (4001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ edge_id: 999999, weight: 10 });
      expect(res.body.code).toBe('4001');
    });

    it('TC-7: Sai kiểu dữ liệu trọng số (2002)', async () => {
        const res = await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ edge_id: testEdgeId, weight: "heavy" });
        // Note: Backend using Number(weight) will get NaN which triggers 2002 or 2003
        expect([RESPONSE_CODES.INVALID_TYPE, RESPONSE_CODES.INVALID_VALUE]).toContain(res.body.code);
    });
  });
});
