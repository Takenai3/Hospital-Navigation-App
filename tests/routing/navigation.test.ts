import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Navigation Test Suite
 * APIs: get_steps, preview_path, get_eta, pass_node
 */
describe('Navigation API Tests', () => {
  const token = 'valid-token';
  const headers = { 'Authorization': `Bearer ${token}` };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/routing/get_steps', () => {
    const endpoint = '/api/routing/get_steps';

    it('Success - 1000: Should return instructional steps', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [
          { step: 1, instruction: 'Đi thẳng 20m' },
          { step: 2, instruction: 'Rẽ trái tại phòng khám nội' }
        ]
      }) as any);

      const res = await request(app)
        .get(endpoint)
        .set(headers)
        .query({ route_id: 'R123' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('instruction');
    });

    it('Validation - 2001: Missing route_id', async () => {
      const res = await request(app)
        .get(endpoint)
        .set(headers);
      expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
    });
  });

  describe('GET /api/routing/preview_path', () => {
    const endpoint = '/api/routing/preview_path';

    it('Success - 1000: Should return path preview data', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          route_id: 'R123',
          points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
          bounds: { minX: 10, minY: 20, maxX: 30, maxY: 40 }
        }]
      }) as any);

      const res = await request(app)
        .get(endpoint)
        .set(headers)
        .query({ route_id: 'R123' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('points');
    });
  });

  describe('POST /api/routing/get_eta', () => {
    const endpoint = '/api/routing/get_eta';

    it('Success - 1000: Should return estimated arrival time', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          route_id: 'R123',
          eta_seconds: 120,
          remaining_distance: 150
        }]
      }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', current_node: 'node_005' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data).toHaveProperty('eta_seconds');
    });

    it('System Error - 9002: Engine Timeout', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => {
        throw { code: RESPONSE_CODES.ENGINE_TIMEOUT };
      });

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', current_node: 'node_005' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.ENGINE_TIMEOUT);
    });
  });

  describe('POST /api/routing/pass_node', () => {
    const endpoint = '/api/routing/pass_node';

    it('Success - 1000: Correct path (is_deviated: false)', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          status: 'on_track',
          is_deviated: false,
          next_instruction: 'Tiếp tục đi thẳng'
        }]
      }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', node_id: 'node_002' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.is_deviated).toBe(false);
    });

    it('Success - 1000: Deviated path (is_deviated: true)', async () => {
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }] }) as any);
      jest.spyOn(db, 'query').mockImplementationOnce(() => Promise.resolve({
        rows: [{
          status: 'deviated',
          is_deviated: true,
          message: 'Bạn đã đi sai hướng, vui lòng quay lại'
        }]
      }) as any);

      const res = await request(app)
        .post(endpoint)
        .set(headers)
        .send({ route_id: 'R123', node_id: 'node_999' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
      expect(res.body.data.is_deviated).toBe(true);
    });

    it('Auth - 3003: Unauthenticated', async () => {
      const res = await request(app).post(endpoint).send({ route_id: 'R123' });
      expect(res.body.code).toBe(RESPONSE_CODES.UNAUTHENTICATED);
    });
  });
});
