import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Route Planning Test Suite
 * APIs: route_ordered, route_unordered, re_calculate, get_modes
 */
describe('Route Planning API Tests', () => {
  const token = 'valid-token';
  const headers = { 'Authorization': `Bearer ${token}` };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/routing/route_ordered', () => {
    const endpoint = '/api/routing/route_ordered';
    const validBody = {
      start_node: 'node_001',
      target_nodes: ['node_002', 'node_003'],
      transport_mode: 'wheelchair'
    };

    it('Success - 1000: Should return ordered route', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1, full_name: 'Test User' }] }) as any); // Auth mock
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          route_id: 'R123',
          estimated_time: 300,
          path: ['node_001', 'node_002', 'node_003'],
          total_distance: 500
        }]
      }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('route_id');
      expect(res.body.data).toHaveProperty('path');
    });

    it('Validation - 2001: Missing start_node', async () => {
      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ target_nodes: ['node_002'], transport_mode: 'wheelchair' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });

    it('Auth - 3003: Missing token', async () => {
      const res = await request(app).post(endpoint).send(validBody);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.UNAUTHENTICATED);
    });

    it('System Error - 9001: Engine Unavailable', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('Engine crash')) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.ENGINE_UNAVAILABLE);
    });
  });

  describe('POST /api/routing/route_unordered', () => {
    const endpoint = '/api/routing/route_unordered';
    const validBody = {
      start_node: 'node_001',
      target_nodes: ['node_003', 'node_002'],
      transport_mode: 'stretcher'
    };

    it('Success - 1000: Should return optimized unordered route', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          route_id: 'R456',
          optimized_order: ['node_002', 'node_003'],
          estimated_time: 450
        }]
      }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('optimized_order');
    });

    it('Validation - 2003: target_nodes > 10 points', async () => {
      const manyNodes = Array.from({ length: 11 }, (_, i) => `node_${i}`);
      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ ...validBody, target_nodes: manyNodes });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.INVALID_VALUE);
    });

    it('Auth - 3001: Invalid token', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', 'Bearer invalid')
        .send(validBody);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.TOKEN_INVALID);
    });
  });

  describe('POST /api/routing/re_calculate', () => {
    const endpoint = '/api/routing/re_calculate';
    const validBody = {
      route_id: 'R123',
      current_node: 'node_005'
    };

    it('Success - 1000: Should recalculate route from current position', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          route_id: 'R123-NEW',
          new_path: ['node_005', 'node_006'],
          is_deviated: true
        }]
      }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('is_deviated', true);
    });

    it('Validation - 2001: Missing route_id', async () => {
      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ current_node: 'node_005' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('GET /api/routing/get_modes', () => {
    const endpoint = '/api/routing/get_modes';

    it('Success - 1000: Should return available transport modes', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [
          { mode: 'walking', description: 'Đi bộ' },
          { mode: 'wheelchair', description: 'Xe lăn' }
        ]
      }) as any);

      const res = await request(app)
        .get(endpoint)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('System Error - 9902: DB Query Failed', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.reject(new Error('DB error')) as any);

      const res = await request(app)
        .get(endpoint)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.DB_QUERY_FAILED);
    });
  });
});
