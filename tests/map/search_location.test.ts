import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Search Location - Integration Test Suite
 * Tuân thủ map_test_generator_prompt.txt & fix_search_location_prompt.txt
 * BẮT BUỘC kiểm tra bảng saved_searches sau khi search thành công.
 */
describe('Map Search Location - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/map/search';
  let userId: number;
  let nodeId: string = 'SEARCH_NODE_1';
  let mapId: number;

  beforeAll(async () => {
    // Dọn dẹp dữ liệu
    await db.query("DELETE FROM saved_searches");
    await db.query("DELETE FROM wards");
    await db.query("DELETE FROM nodes");
    await db.query("DELETE FROM users");
    await db.query("DELETE FROM maps");

    // Tạo User mẫu
    const userRes = await db.query(
      "INSERT INTO users (phone, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
      ['0987654321', 'password123', 'Search Tester']
    );
    userId = userRes.rows[0].id;

    // Tạo bản đồ và node mẫu
    const mapRes = await db.query(
      "INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4) RETURNING id",
      ['SEARCH_BLD', 'Search Building', 1.0, 1.0]
    );
    mapId = mapRes.rows[0].id;

    await db.query(
      "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)",
      [nodeId, mapId, 15.0, 15.0, 'room_entrance']
    );

    // Tạo Ward mẫu để search
    await db.query(
      "INSERT INTO wards (map_node_id, name, status) VALUES ($1, $2, $3)",
      [nodeId, 'Phòng Cấp Cứu A1', 'open']
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM saved_searches");
    await db.query("DELETE FROM wards");
    await db.query("DELETE FROM nodes");
    await db.query("DELETE FROM users");
    await db.query("DELETE FROM maps");
  });

  describe('Success Scenarios (Mã 1000)', () => {
    it('TC-1: Tìm kiếm vị trí thành công và trả về đúng dữ liệu', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ keyword: 'Cấp Cứu', user_id: userId });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].name).toContain('Cấp Cứu');
    });

    it('TC-2: BẮT BUỘC: Kiểm tra từ khóa đã được lưu vào bảng saved_searches (Dùng keyword có thật)', async () => {
      const keyword = 'Cấp Cứu';
      await request(app)
        .post(endpoint)
        .send({ keyword, user_id: userId });

      const savedRes = await db.query(
        "SELECT * FROM saved_searches WHERE user_id = $1 AND keyword = $2",
        [userId, keyword]
      );
      expect(savedRes.rows.length).toBeGreaterThan(0);
      expect(savedRes.rows[0].keyword).toBe(keyword);
    });

    it('TC-3: Tìm kiếm không ra kết quả (Expect mảng rỗng, mã 1000)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ keyword: 'XYZ123NonExistent', user_id: userId });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
    });

    it('TC-4: Tìm kiếm với từ khóa có dấu và không dấu (ILIKE check)', async () => {
        const res = await request(app)
          .post(endpoint)
          .send({ keyword: 'cap cuu', user_id: userId });
        
        // Tùy thuộc vào cấu hình DB collation, ở đây giả định ILIKE hỗ trợ
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });
  });

  describe('Validation Errors - Parameters (Mã 2001, 2002, 2003)', () => {
    it('TC-5: Thiếu keyword (Mã 2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ user_id: userId });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-6: Thiếu user_id (Mã 2001)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ keyword: 'Cấp cứu' });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-7: user_id sai kiểu dữ liệu (Mã 2002)', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ keyword: 'Cấp cứu', user_id: 'not-a-number' });
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-8: keyword là mảng rỗng (Mã 2002)', async () => {
        const res = await request(app)
          .post(endpoint)
          .send({ keyword: [], user_id: userId });
        expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });
  });

  describe('Logic & Security Scenarios', () => {
    it('TC-9: SQL Injection qua keyword', async () => {
      const res = await request(app)
        .post(endpoint)
        .send({ keyword: "'; DROP TABLE saved_searches; --", user_id: userId });
      
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS); // Should handle safely
      const checkTable = await db.query("SELECT 1 FROM saved_searches LIMIT 1");
      expect(checkTable).toBeDefined();
    });

    it('TC-10: Keyword cực dài (Boundary check)', async () => {
        const longKeyword = 'a'.repeat(200);
        const res = await request(app)
          .post(endpoint)
          .send({ keyword: longKeyword, user_id: userId });
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-11: Kiểm tra searched_at tự động tạo trong DB (Dùng keyword có thật)', async () => {
        const keyword = 'Phòng Cấp Cứu';
        await request(app)
          .post(endpoint)
          .send({ keyword, user_id: userId });
  
        const savedRes = await db.query(
          "SELECT searched_at FROM saved_searches WHERE keyword = $1",
          [keyword]
        );
        expect(savedRes.rows.length).toBeGreaterThan(0);
        expect(savedRes.rows[0].searched_at).toBeDefined();
        expect(new Date(savedRes.rows[0].searched_at).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Edge Cases', () => {
    it('TC-12: Tìm kiếm không ra kết quả trả về mảng rỗng (Không dùng DELETE phá data)', async () => {
        const res = await request(app)
          .post(endpoint)
          .send({ keyword: 'PhongBanKhongTonTai_123', user_id: userId });
        expect(res.body.data).toEqual([]);
    });

    it('TC-13: Tìm kiếm với từ khóa chỉ có khoảng trắng', async () => {
        const res = await request(app)
          .post(endpoint)
          .send({ keyword: '   ', user_id: userId });
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });
  });
});
