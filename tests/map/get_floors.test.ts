import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Get Floors - Integration Test Suite
 * Tuân thủ map_test_generator_prompt.txt
 */
describe('Map Get Floors - Comprehensive Integration Test Suite', () => {
  const endpoint = '/api/map/floors';

  beforeAll(async () => {
    // Dọn dẹp dữ liệu bản đồ
    await db.query("DELETE FROM maps");

    // Tạo các tầng mẫu cho Tòa A
    await db.query(
      "INSERT INTO maps (building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5)",
      ['A', 'Tòa A - Tầng 1', 'http://example.com/a1.png', 1.0, 1.0]
    );
    await db.query(
      "INSERT INTO maps (building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5)",
      ['A', 'Tòa A - Tầng 2', 'http://example.com/a2.png', 1.0, 1.0]
    );
    // Tòa B
    await db.query(
      "INSERT INTO maps (building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5)",
      ['B', 'Tòa B - Tầng 1', 'http://example.com/b1.png', 0.5, 0.5]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM maps");
    await db.end();
  });

  describe('Nhóm Cơ bản (Mã 1000)', () => {
    it('TC-1: Lấy toàn bộ danh sách tầng thành công', async () => {
      const res = await request(app).get(endpoint);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('TC-2: Lấy danh sách tầng theo building_code hợp lệ (Tòa A)', async () => {
      const res = await request(app).get(`${endpoint}?building_code=A`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.every((f: any) => f.building_code === 'A')).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('TC-3: Kiểm tra cấu trúc dữ liệu tầng (id, name, scale)', async () => {
      const res = await request(app).get(endpoint);
      const floor = res.body.data[0];
      expect(floor).toHaveProperty('id');
      expect(floor).toHaveProperty('building_code');
      expect(floor).toHaveProperty('building_name');
      expect(floor).toHaveProperty('scale_x');
      expect(floor).toHaveProperty('scale_y');
    });

    it('TC-4: Các giá trị tỷ lệ (scale_x, scale_y) phải là kiểu number', async () => {
      const res = await request(app).get(endpoint);
      const floor = res.body.data[0];
      expect(typeof floor.scale_x).toBe('number');
      expect(typeof floor.scale_y).toBe('number');
    });

    it('TC-5: image_url trả về phải là một chuỗi URL hợp lệ (string)', async () => {
      const res = await request(app).get(endpoint);
      const floor = res.body.data.find((f: any) => f.image_url !== null);
      expect(typeof floor.image_url).toBe('string');
      expect(floor.image_url).toMatch(/^http/);
    });
  });

  describe('Nhóm Tham số & Validation (Mã 2002, 2003)', () => {
    it('TC-6: building_code truyền vào là chuỗi rỗng "" (Trả về toàn bộ)', async () => {
      const res = await request(app).get(`${endpoint}?building_code=`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-7: building_code không tồn tại trong hệ thống (Trả về mảng rỗng)', async () => {
      const res = await request(app).get(`${endpoint}?building_code=XYZ`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
    });

    it('TC-8: building_code chứa ký tự đặc biệt nguy hiểm (SQLi check)', async () => {
      const res = await request(app).get(`${endpoint}?building_code=A' OR '1'='1`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-9: building_code là mảng [] (Mã 1000)', async () => {
      const res = await request(app).get(`${endpoint}?building_code[]=A&building_code[]=B`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('TC-10: building_code cực dài (255 ký tự)', async () => {
      const res = await request(app).get(`${endpoint}?building_code=${'A'.repeat(255)}`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Nhóm Bảo mật (Mã 2002/SQLi)', () => {
    it('TC-11: Thử phá câu lệnh SQL bằng dấu chấm phẩy (Semicolon)', async () => {
      const res = await request(app).get(`${endpoint}?building_code=A; DROP TABLE maps`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-12: SQL Injection qua Union Select', async () => {
      const res = await request(app).get(`${endpoint}?building_code=A' UNION SELECT 1,2,3,4,5,6--`);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });

    it('TC-13: XSS Injection qua building_code query param (Mã 1000)', async () => {
      const res = await request(app).get(`${endpoint}?building_code=<script>alert(1)</script>`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Nhóm Database Rỗng & Edge Cases', () => {
    it('TC-14: Khi hệ thống chưa có bất kỳ dữ liệu tầng nào', async () => {
      await db.query("DELETE FROM maps");
      const res = await request(app).get(endpoint);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toEqual([]);
      // Re-seed for other tests
      await db.query("INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4)", ['A', 'Tòa A', 1.0, 1.0]);
    });

    it('TC-15: Lấy danh sách tầng khi building_code chỉ có 1 ký tự', async () => {
      const res = await request(app).get(`${endpoint}?building_code=A`);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('TC-16: building_code có chứa khoảng trắng ở giữa "Tòa A"', async () => {
        await db.query("INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4)", ['Tòa A', 'Tòa A - Tầng 1', 1.0, 1.0]);
        const res = await request(app).get(`${endpoint}?building_code=Tòa A`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        expect(res.body.data.length).toBe(1);
    });

    it('TC-17: Kiểm tra tỷ lệ scale_x bằng 0 (Dữ liệu lỗi trong DB)', async () => {
        await db.query("INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4)", ['ERR', 'Map Error', 0, 0]);
        const res = await request(app).get(`${endpoint}?building_code=ERR`);
        expect(res.body.data[0].scale_x).toBe(0);
    });

    it('TC-18: Kiểm tra tỷ lệ scale cực lớn (Infinity logic)', async () => {
        await db.query("INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4)", ['BIG', 'Map Big', 999999.99, 999999.99]);
        const res = await request(app).get(`${endpoint}?building_code=BIG`);
        expect(res.body.data[0].scale_x).toBe(999999.99);
    });
  });

  describe('Nhóm Logic & Hiệu năng', () => {
    it('TC-19: Kiểm tra thứ tự trả về (Mặc định theo ID)', async () => {
        const res = await request(app).get(endpoint);
        const ids = res.body.data.map((f: any) => f.id);
        const sortedIds = [...ids].sort((a, b) => a - b);
        expect(ids).toEqual(sortedIds);
    });

    it('TC-20: Gửi building_code chứa Emoji (Check UTF-8)', async () => {
        await db.query("INSERT INTO maps (building_code, building_name, scale_x, scale_y) VALUES ($1, $2, $3, $4)", ['🏢', 'Tòa Emoji', 1.0, 1.0]);
        const res = await request(app).get(`${endpoint}?building_code=🏢`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
        expect(res.body.data[0].building_code).toBe('🏢');
    });

    it('TC-21: Truyền thừa tham số lạ trong query string', async () => {
        const res = await request(app).get(`${endpoint}?building_code=A&hacker_param=123`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-22: Kiểm tra Content-Type của response luôn là JSON', async () => {
        const res = await request(app).get(endpoint);
        expect(res.header['content-type']).toMatch(/json/);
    });

    it('TC-23: building_code là số (Mã 2002 do logic check string)', async () => {
        const res = await request(app).get(`${endpoint}?building_code=123`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS); // PostgreSQL tự cast hoặc ko tìm thấy
        expect(res.body.data).toEqual([]);
    });

    it('TC-24: Kiểm tra tính đúng đắn của building_name (Phân biệt hoa thường)', async () => {
        const res = await request(app).get(`${endpoint}?building_code=a`);
        // Tùy logic DB (Postgres mặc định phân biệt hoa thường)
        expect(res.body.data.length).toBe(0);
    });

    it('TC-25: Kiểm tra hiệu năng khi DB có nhiều tầng (giả lập logic)', async () => {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
