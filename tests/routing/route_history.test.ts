import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Route History Test Suite
 * APIs: get_history, clear_history
 */
describe('Route History API Tests', () => {
  const token = 'valid-token';
  const headers = { 'Authorization': `Bearer ${token}` };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/routing/get_history', () => {
    const endpoint = '/api/routing/get_history';

    it('Success - 1000: Should return route history for user', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [
          { route_id: 'R111', destination: 'Phòng khám A', date: '2026-05-01' },
          { route_id: 'R222', destination: 'Nhà thuốc B', date: '2026-05-02' }
        ]
      }) as any);

      const res = await request(app)
        .get(endpoint)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('Auth - 3003: Unauthenticated', async () => {
      const res = await request(app).get(endpoint);
      expect(res.body.code).toBe(RESPONSE_CODES.UNAUTHENTICATED);
    });
  });

  describe('DELETE /api/routing/clear_history', () => {
    const endpoint = '/api/routing/clear_history';

    it('Success - 1000: Should clear all route history for user', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rowCount: 5 }) as any);

      const res = await request(app)
        .delete(endpoint)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.message).toMatch(/xóa|thành công/i);
    });

    it('System Error - 9901: DB Connection Failed', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Connection failed')) as any);

      const res = await request(app)
        .delete(endpoint)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.DB_CONNECTION_FAILED);
    });
  });
});
