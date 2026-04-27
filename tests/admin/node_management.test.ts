import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Admin Node Management Integration Test Suite
 * Tuân thủ admin_modular_prompt.txt & admin_spec.txt (Slide 5)
 */
describe('Admin Node Management Integration Test Suite', () => {
  let adminToken: string;
  let userToken: string;

  const PREFIX = 'N_TEST_';
  const TEST_ADMIN_PHONE = '0981000001';
  const TEST_USER_PHONE = '0971000001';
  const TEST_MAP_ID = 10001;
  const TEST_WARD_ID = 10001;
  const DUMMY_NODE_ID = PREFIX + 'DUMMY_WARD';
  const TEST_NOTE_ID = PREFIX + 'NODE_01';

  beforeAll(async () => {
    // 1. Tạo Map cơ sở
    await db.query("INSERT INTO maps (id, building_code, building_name, scale_x, scale_y) VALUES ($1, 'B_NODE', 'Node Bldg', 1, 1)", [TEST_MAP_ID]);
    
    // 2. Tạo Node mồi cho Ward
    await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, 0, 0, 'hallway')", [DUMMY_NODE_ID, TEST_MAP_ID]);

    // 3. Tạo Ward cơ sở (BẮT BUỘC để tạo Staff)
    await db.query("INSERT INTO wards (id, map_node_id, name) VALUES ($1, $2, 'Khoa Test Node')", [TEST_WARD_ID, DUMMY_NODE_ID]);

    // 4. Tạo tài khoản Admin
    const adminUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'Admin Node', 'active') RETURNING id",
      [TEST_ADMIN_PHONE]
    );
    await db.query(
      "INSERT INTO staffs (user_id, ward_id, role, status) VALUES ($1, $2, 'admin', 'available')",
      [adminUser.rows[0].id, TEST_WARD_ID]
    );
    adminToken = 'token-admin-' + adminUser.rows[0].id;

    // 5. Tạo tài khoản User thường
    const regularUser = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, 'hash', 'User Node', 'active') RETURNING id",
      [TEST_USER_PHONE]
    );
    userToken = 'token-user-' + regularUser.rows[0].id;
  });

  afterAll(async () => {
    // --- QUY TRÌNH DỌN DẸP BẤT KHẢ XÂM PHẠM ---
    await db.query("DELETE FROM staffs WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0981000%' OR phone LIKE '0971000%')");
    await db.query("DELETE FROM wards WHERE id = $1 OR map_node_id LIKE $2", [TEST_WARD_ID, PREFIX + '%']);
    await db.query("DELETE FROM steps WHERE map_id = $1 OR start_node_id LIKE $2 OR end_node_id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM devices WHERE current_node_id LIKE $1", [PREFIX + '%']);
    await db.query("DELETE FROM nodes WHERE map_id = $1 OR id LIKE $2", [TEST_MAP_ID, PREFIX + '%']);
    await db.query("DELETE FROM users WHERE phone LIKE '0981000%' OR phone LIKE '0971000%'");
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
  });

  describe('admin_add_note API', () => {
    const endpoint = '/api/admin/admin_add_note';

    it('TC-1: Thêm mới node thành công với quyền Admin (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: TEST_NOTE_ID, map_id: TEST_MAP_ID, x: 10, y: 10, type: 'hallway', name: 'Phòng Cấp Cứu' });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-2: Không thể thêm node nếu là User thường (1009)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'NOTE_FAIL', map_id: TEST_MAP_ID, x: 20, y: 20, name: 'Fail' });
      expect(res.body.code).toBe('1009');
    });

    it('TC-3: Thất bại khi thiếu name (2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 'NOTE_MISSING', map_id: TEST_MAP_ID, x: 10, y: 10 });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-4: Thất bại khi sai kiểu dữ liệu ID (2002)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 12345, map_id: TEST_MAP_ID, x: 10, y: 10, name: 'Wrong Type' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });
  });

  describe('admin_edit_note API', () => {
    const endpoint = '/api/admin/admin_edit_note';

    it('TC-5: Cập nhật tọa độ và tên node thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: TEST_NOTE_ID, x: 20, y: 20, name: 'Phòng Cấp Cứu Mới' });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-6: Chỉnh sửa node không tồn tại (4001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 'NON_EXISTENT', x: 30 });
      expect(res.body.code).toBe('4001');
    });

    it('TC-7: Thiếu ID khi chỉnh sửa (2001)', async () => {
        const res = await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ x: 30 });
        expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
      });
  });

  describe('admin_del_note API', () => {
    const endpoint = '/api/admin/admin_del_note';

    it('TC-8: Xóa node thành công (1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: TEST_NOTE_ID });
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-9: Xóa node đã bị xóa hoặc không tồn tại (4001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: TEST_NOTE_ID });
      expect(res.body.code).toBe('4001');
    });
  });
});
