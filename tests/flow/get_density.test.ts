import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: Flow Get Density', () => {
  const endpoint = '/api/flow/get_density';
  const VALID_ROUTE = 'ROUTE_001';

  beforeAll(async () => {
    // 1. Đảm bảo bảng routes tồn tại
    await db.query(`CREATE TABLE IF NOT EXISTS routes (id SERIAL PRIMARY KEY, route_id TEXT UNIQUE)`);
    await db.query("INSERT INTO routes (route_id) VALUES ($1) ON CONFLICT DO NOTHING", [VALID_ROUTE]);

    // 2. Khởi tạo dữ liệu mật độ
    await db.query(`
      CREATE TABLE IF NOT EXISTS route_density (
        route_id TEXT PRIMARY KEY,
        current_people INTEGER
      )
    `);
    await db.query(
      "INSERT INTO route_density (route_id, current_people) VALUES ($1, 25) ON CONFLICT (route_id) DO UPDATE SET current_people = 25",
      [VALID_ROUTE]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM route_density WHERE route_id = $1", [VALID_ROUTE]);
    await db.query("DELETE FROM routes WHERE route_id = $1", [VALID_ROUTE]);
  });

  describe('Kịch bản Thành công (1000)', () => {
    it('TC-01: 1000 | SUCCESS - Trả về số người thực tế thành công', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ route_id: VALID_ROUTE });

      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.message).toBe('OK');
      expect(res.body.data).toHaveProperty('current_people');
      expect(res.body.data.current_people).toBe(25);
    });
  });

  describe('Kịch bản Lỗi logic (5003)', () => {
    it('TC-02: 5003 | PATH_NOT_FOUND - route_id không tồn tại', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ route_id: 'UNKNOWN_ROUTE' });

      expect(res.body.code).toBe(RESPONSE_CODES.PATH_NOT_FOUND);
      expect(res.body.message).toBe('Path not found');
    });
  });

  describe('Lỗi tham số (2001, 2002)', () => {
    it('TC-03: 2001 | MISSING_PARAM - Không truyền route_id', async () => {
      const res = await request(app).get(endpoint);

      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
      expect(res.body.message).toBe('Missing required parameter');
    });

    it('TC-04: 2001 | MISSING_PARAM - route_id chỉ chứa khoảng trắng', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ route_id: '   ' });

      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('TC-05: 2002 | INVALID_TYPE - SQL Injection', async () => {
      const res = await request(app)
        .get(endpoint)
        .query({ route_id: "'; DROP TABLE route_density;--" });

      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
      expect(res.body.message).toBe('Invalid parameter type');
    });

    it('TC-06: 2002 | INVALID_TYPE - Truyền route_id dưới dạng mảng', async () => {
      const res = await request(app)
        .get(`${endpoint}?route_id=R1&route_id=R2`);

      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
    });
  });

  describe('Lỗi hệ thống (9901, 9999)', () => {
    it('TC-07: 9901 | DB_CONNECTION_FAILED - Lỗi kết nối Database', async () => {
      const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const res = await request(app)
        .get(endpoint)
        .query({ route_id: VALID_ROUTE });

      expect(res.body.code).toBe(RESPONSE_CODES.DB_CONNECTION_FAILED);

      spy.mockRestore();
    });

    it('TC-08: 9999 | UNEXPECTED - Lỗi không xác định', async () => {
      const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
        throw new Error('Something went wrong');
      });

      const res = await request(app)
        .get(endpoint)
        .query({ route_id: VALID_ROUTE });

      expect(res.body.code).toBe(RESPONSE_CODES.UNEXPECTED);
      expect(res.body.message).toBe('Unexpected exception');

      spy.mockRestore();
    });
  });
});