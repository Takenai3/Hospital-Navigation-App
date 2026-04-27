import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Admin Device Management Integration Test Suite
 * Tuân thủ admin_modular_prompt.txt & admin_spec.txt (Slide 33)
 */
describe('Admin Device Management Integration Test Suite', () => {
  let adminToken: string;
  let userToken: string;

  const PREFIX = 'D_TEST_';
  const TEST_ADMIN_PHONE = '0983000001';
  const TEST_USER_PHONE = '0973000001';
  const TEST_MAP_ID = 30001;
  const TEST_WARD_ID = 30001;
  const DUMMY_NODE_ID = PREFIX + 'DUMMY_WARD';
  const NODE_ID = PREFIX + 'NODE_01';
  let testDeviceId: number;

  beforeAll(async () => {
    // 1. Tạo Map cơ sở
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_DEV', 'Device Bldg', 1, 1)", [TEST_MAP_ID]);
    
    // 2. Tạo Node mồi cho Ward và Device
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, 0, 0, 'hallway'), ($3, $2, 0, 0, 'hallway')", [NODE_ID, TEST_MAP_ID, DUMMY_NODE_ID]);

    // 3. Tạo Ward cơ sở (BẮT BUỘC để tạo Staff)
    await db.query("INSERT INTO wards (id, map_node_id, name) VALUES ($1, $2, 'Khoa Test Device')", [TEST_WARD_ID, DUMMY_NODE_ID]);

    // 4. Tạo tài khoản Admin
    const adminUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'Admin Device', 'active') RETURNING id",
      [TEST_ADMIN_PHONE]
    );
    await db.query(
      "INSERT INTO staffs (user_id, ward_id, role, status) VALUES ($1, $2, 'admin', 'available')",
      [adminUser.rows[0].id, TEST_WARD_ID]
    );
    adminToken = 'token-admin-' + adminUser.rows[0].id;

    // 5. Tạo tài khoản User thường
    const regularUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'User Device', 'active') RETURNING id",
      [TEST_USER_PHONE]
    );
    userToken = 'token-user-' + regularUser.rows[0].id;
  });

  afterAll(async () => {
    // --- QUY TRÌNH DỌN DẸP BẤT KHẢ XÂM PHẠM ---
    await db.query("DELETE FROM staffs WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0983000%' OR phone LIKE '0973000%')");
    await db.query("DELETE FROM wards WHERE id = $1 OR map_node_id LIKE $2", [TEST_WARD_ID, PREFIX + '%']);
    await db.query("DELETE FROM steps WHERE map_id = $1 OR start_node_id LIKE $2 OR end_node_id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM devices WHERE current_node_id LIKE $1", [PREFIX + '%']);
    await db.query("DELETE FROM nodes WHERE map_id = $1 OR id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM users WHERE phone LIKE '0983000%' OR phone LIKE '0973000%'");
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
  });

  describe('admin_add_device API', () => {
    const endpoint = '/api/admin/admin_add_device';

    it('TC-1: Thêm thiết bị mới thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'wheelchair', status: 'available', current_node_id: NODE_ID });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      testDeviceId = res.body.data?.id;
    });

    it('TC-2: Không thể thêm thiết bị nếu là User thường (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'stretcher', status: 'available', current_node_id: NODE_ID });
      expect(res.body.code).toBe('1009');
    });

    it('TC-3: Thất bại khi status không thuộc ENUM (2003)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'wheelchair', status: 'broken', current_node_id: NODE_ID });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('TC-4: Thất bại khi thiếu current_node_id (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'wheelchair', status: 'available' });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('admin_edit_device API', () => {
    const endpoint = '/api/admin/admin_edit_device';

    it('TC-5: Cập nhật trạng thái thiết bị thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: testDeviceId, status: 'maintenance' });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-6: Thất bại khi cập nhật ID không tồn tại (4001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 999999, status: 'available' });
      expect(res.body.code).toBe('4001');
    });

    it('TC-7: Thất bại khi cập nhật status sai ENUM (2003)', async () => {
        const res = await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ id: testDeviceId, status: 'active' }); // 'active' is invalid per prompt rules
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });
  });

  describe('admin_del_device API', () => {
    const endpoint = '/api/admin/admin_del_device';

    it('TC-8: Xóa thiết bị thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: testDeviceId });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-9: Xóa thiết bị đã bị xóa (4001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: testDeviceId });
      expect(res.body.code).toBe('4001');
    });
  });
});
