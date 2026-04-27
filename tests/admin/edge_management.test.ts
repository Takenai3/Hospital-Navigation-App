import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Admin Edge Management Integration Test Suite
 * Tuân thủ admin_modular_prompt.txt & admin_spec.txt (Slide 20)
 */
describe('Admin Edge Management Integration Test Suite', () => {
  let adminToken: string;
  let userToken: string;

  const PREFIX = 'E_TEST_';
  const TEST_ADMIN_PHONE = '0982000001';
  const TEST_USER_PHONE = '0972000001';
  const TEST_MAP_ID = 20001;
  const TEST_WARD_ID = 20001;
  const DUMMY_NODE_ID = PREFIX + 'DUMMY_WARD';
  const NODE_A = PREFIX + 'NODE_A';
  const NODE_B = PREFIX + 'NODE_B';
  let testEdgeId: number;

  beforeAll(async () => {
    // 1. Tạo Map cơ sở
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_EDGE', 'Edge Bldg', 1, 1)", [TEST_MAP_ID]);
    
    // 2. Tạo Node mồi cho Ward và Edge
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate) VALUES ($1, $2, 0, 0), ($3, $2, 10, 10), ($4, $2, 0, 0)", [NODE_A, TEST_MAP_ID, NODE_B, DUMMY_NODE_ID]);

    // 3. Tạo Ward cơ sở (BẮT BUỘC để tạo Staff)
    await db.query("INSERT INTO wards (id, map_node_id, name) VALUES ($1, $2, 'Khoa Test Edge')", [TEST_WARD_ID, DUMMY_NODE_ID]);

    // 4. Tạo tài khoản Admin
    const adminUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'Admin Edge', 'active') RETURNING id",
      [TEST_ADMIN_PHONE]
    );
    await db.query(
      "INSERT INTO staffs (user_id, ward_id, role, status) VALUES ($1, $2, 'admin', 'available')",
      [adminUser.rows[0].id, TEST_WARD_ID]
    );
    adminToken = 'token-admin-' + adminUser.rows[0].id;

    // 5. Tạo tài khoản User thường
    const regularUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'User Edge', 'active') RETURNING id",
      [TEST_USER_PHONE]
    );
    userToken = 'token-user-' + regularUser.rows[0].id;
  });

  afterAll(async () => {
    // --- QUY TRÌNH DỌN DẸP BẤT KHẢ XÂM PHẠM ---
    await db.query("DELETE FROM staffs WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0982000%' OR phone LIKE '0972000%')");
    await db.query("DELETE FROM wards WHERE id = $1 OR map_node_id LIKE $2", [TEST_WARD_ID, PREFIX + '%']);
    await db.query("DELETE FROM steps WHERE map_id = $1 OR start_node_id LIKE $2 OR end_node_id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM devices WHERE current_node_id LIKE $1", [PREFIX + '%']);
    await db.query("DELETE FROM nodes WHERE map_id = $1 OR id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM users WHERE phone LIKE '0982000%' OR phone LIKE '0972000%'");
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
  });

  describe('admin_add_edge API', () => {
    const endpoint = '/api/admin/admin_add_edge';

    it('TC-1: Tạo đường nối thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ map_id: TEST_MAP_ID, start_node: NODE_A, end_node: NODE_B, distance: 5.5 });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      testEdgeId = res.body.data?.id;
    });

    it('TC-2: Không thể tạo edge nếu là User thường (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ map_id: TEST_MAP_ID, start_node: NODE_A, end_node: NODE_B, distance: 10 });
      expect(res.body.code).toBe('1009');
    });

    it('TC-3: Thất bại khi distance <= 0 (2003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ map_id: TEST_MAP_ID, start_node: NODE_A, end_node: NODE_B, distance: 0 });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-4: Thất bại khi thiếu map_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ start_node: NODE_A, end_node: NODE_B, distance: 5 });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('admin_edit_edge API', () => {
    const endpoint = '/api/admin/admin_edit_edge';

    it('TC-5: Cập nhật khoảng cách thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: testEdgeId, distance: 12.3 });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-6: Thất bại khi sửa ID không tồn tại (4001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 999999, distance: 10 });
      expect(res.body.code).toBe('4001');
    });

    it('TC-7: Thất bại khi distance mới <= 0 (2003)', async () => {
        const res = await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ id: testEdgeId, distance: -1 });
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
      });
  });

  describe('admin_del_edge API', () => {
    const endpoint = '/api/admin/admin_del_edge';

    it('TC-8: Xóa đường nối thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: testEdgeId });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-9: Xóa ID đã bị xóa (4001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: testEdgeId });
      expect(res.body.code).toBe('4001');
    });
  });
});
