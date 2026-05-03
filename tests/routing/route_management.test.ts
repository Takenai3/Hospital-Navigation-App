import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Route Management Test Suite
 * APIs: get_active, cancel_route, share_route, rate_path
 */
describe('Route Management API Tests', () => {
  const token = 'valid-token';
  const headers = { 'Authorization': `Bearer ${token}` };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/routing/get_active', () => {
    const endpoint = '/api/routing/get_active';

    it('Success - 1000: Should return active route for user', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          route_id: 'R123',
          status: 'ongoing',
          start_time: '2026-05-04T10:00:00Z'
        }]
      }) as any);

      const res = await request(app)
        .get(endpoint)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('route_id');
    });

    it('Auth - 3001: Token invalid', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('Authorization', 'Bearer bad-token');
      expect(res.body.code).toBe(RESPONSE_CODES.TOKEN_INVALID);
    });
  });

  describe('POST /api/routing/cancel_route', () => {
    const endpoint = '/api/routing/cancel_route';

    it('Success - 1000: Should cancel the specified route', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [] }) as any); // Mock delete/update success

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', reason: 'User cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('Validation - 2001: Missing route_id', async () => {
      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ reason: 'No ID' });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('POST /api/routing/share_route', () => {
    const endpoint = '/api/routing/share_route';

    it('Success - 1000: Should share route with another user', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ share_link: 'http://hospital.app/share/R123' }] }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', recipient_phone: '0987654321' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('share_link');
    });

    it('Validation - 2001: Missing recipient_phone', async () => {
      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123' });
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('POST /api/routing/rate_path', () => {
    const endpoint = '/api/routing/rate_path';

    it('Success - 1000: Should submit rating for the path', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [] }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', rating: 5, comment: 'Very fast!' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('Validation - 2003: Rating = 0 (Invalid range)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', rating: 0 });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('Validation - 2003: Rating = 6 (Invalid range)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', rating: 6 });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('System Error - 9902: DB error', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Internal DB Error')) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', rating: 4 });

      expect(res.body.code).toBe(RESPONSE_CODES.DB_QUERY_FAILED);
    });
  });
});
