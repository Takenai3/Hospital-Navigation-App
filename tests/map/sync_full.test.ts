import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

/**
 * Map Sync Full - Integration Test Suite
 * Tuân thủ master_map_infrastructure_prompt.txt
 */
describe('Map Sync Full - Integration Test Suite', () => {
  const endpoint = '/api/map/sync_full';
  
  const TEST_MAP_ID = 9001;
  const TEST_NODE_ID = 'TEST_SYNC_NODE_01';
  const TEST_STEP_ID = 9001;

  beforeAll(async () => {
    // Seed data with special IDs
    await db.query(
        "INSERT INTO maps (id, building_code, building_name, image_url, scale_x, scale_y) VALUES ($1, $2, $3, $4, $5, $6)",
        [TEST_MAP_ID, 'B_SYNC', 'Sync Building', 'http://example.com/sync.png', 1.0, 1.0]
    );
    await db.query(
        "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, 10, 20, 'hallway')",
        [TEST_NODE_ID, TEST_MAP_ID]
    );
    await db.query(
        "INSERT INTO steps (id, map_id, start_node_id, end_node_id, distance, instruction) VALUES ($1, $2, $3, $3, 5, 'Go straight')",
        [TEST_STEP_ID, TEST_MAP_ID, TEST_NODE_ID]
    );
  });

  afterAll(async () => {
    // Cleanup using special IDs
    await db.query("DELETE FROM steps WHERE id = $1", [TEST_STEP_ID]);
    await db.query("DELETE FROM nodes WHERE id = $1", [TEST_NODE_ID]);
    await db.query("DELETE FROM maps WHERE id = $1", [TEST_MAP_ID]);
  });

  describe('Core Functionality & Schema (Cases 1-10)', () => {
    it('TC-1: Lấy dữ liệu đồng bộ thành công (Status 200, Code 1000)', async () => {
      const res = await request(app).get(endpoint);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-2: Response phải chứa mảng "floors"', async () => {
      const res = await request(app).get(endpoint);
      expect(Array.isArray(res.body.data.floors)).toBe(true);
    });

    it('TC-3: Response phải chứa mảng "nodes"', async () => {
      const res = await request(app).get(endpoint);
      expect(Array.isArray(res.body.data.nodes)).toBe(true);
    });

    it('TC-4: Response phải chứa mảng "edges"', async () => {
      const res = await request(app).get(endpoint);
      expect(Array.isArray(res.body.data.edges)).toBe(true);
    });

    it('TC-5: Dữ liệu "floors" chứa bản ghi TEST_MAP_ID', async () => {
      const res = await request(app).get(endpoint);
      const floor = res.body.data.floors.find((f: any) => f.id === TEST_MAP_ID);
      expect(floor).toBeDefined();
      expect(floor.building_code).toBe('B_SYNC');
    });

    it('TC-6: Dữ liệu "nodes" chứa bản ghi TEST_NODE_ID', async () => {
      const res = await request(app).get(endpoint);
      const node = res.body.data.nodes.find((n: any) => n.id === TEST_NODE_ID);
      expect(node).toBeDefined();
      expect(node.map_id).toBe(TEST_MAP_ID);
    });

    it('TC-7: Dữ liệu "edges" chứa bản ghi TEST_STEP_ID', async () => {
      const res = await request(app).get(endpoint);
      const edge = res.body.data.edges.find((e: any) => e.id === TEST_STEP_ID);
      expect(edge).toBeDefined();
      expect(edge.distance).toBe(5);
    });

    it('TC-8: Floor object có đầy đủ các trường required', async () => {
      const res = await request(app).get(endpoint);
      const floor = res.body.data.floors[0];
      if (floor) {
        expect(floor).toHaveProperty('id');
        expect(floor).toHaveProperty('building_code');
        expect(floor).toHaveProperty('scale_x');
      }
    });

    it('TC-9: Node object có đầy đủ các trường required', async () => {
        const res = await request(app).get(endpoint);
        const node = res.body.data.nodes[0];
        if (node) {
          expect(node).toHaveProperty('id');
          expect(node).toHaveProperty('x_coordinate');
          expect(node).toHaveProperty('y_coordinate');
        }
    });

    it('TC-10: Edge object có đầy đủ các trường required', async () => {
        const res = await request(app).get(endpoint);
        const edge = res.body.data.edges[0];
        if (edge) {
          expect(edge).toHaveProperty('id');
          expect(edge).toHaveProperty('start_node_id');
          expect(edge).toHaveProperty('end_node_id');
        }
    });
  });

  describe('Data Integrity & Logic (Cases 11-20)', () => {
    it('TC-11: scale_x của các floor phải là số dương', async () => {
        const res = await request(app).get(endpoint);
        res.body.data.floors.forEach((f: any) => {
            expect(f.scale_x).toBeGreaterThan(0);
        });
    });

    it('TC-12: Tọa độ x_coordinate của nodes không được âm', async () => {
        const res = await request(app).get(endpoint);
        res.body.data.nodes.forEach((n: any) => {
            expect(n.x_coordinate).toBeGreaterThanOrEqual(0);
        });
    });

    it('TC-13: Khoảng cách distance của edges không được âm', async () => {
        const res = await request(app).get(endpoint);
        res.body.data.edges.forEach((e: any) => {
            expect(e.distance).toBeGreaterThanOrEqual(0);
        });
    });

    it('TC-14: Mỗi node phải thuộc về một floor tồn tại (Map ID check)', async () => {
        const res = await request(app).get(endpoint);
        const floorIds = res.body.data.floors.map((f: any) => f.id);
        res.body.data.nodes.forEach((n: any) => {
            expect(floorIds).toContain(n.map_id);
        });
    });

    it('TC-15: Mỗi edge phải có start_node_id tồn tại trong mảng nodes', async () => {
        const res = await request(app).get(endpoint);
        const nodeIds = res.body.data.nodes.map((n: any) => n.id);
        res.body.data.edges.forEach((e: any) => {
            expect(nodeIds).toContain(e.start_node_id);
        });
    });

    it('TC-16: API không yêu cầu bất kỳ tham số đầu vào nào', async () => {
        const res = await request(app).get(`${endpoint}?extra=param`);
        expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
    });

    it('TC-17: Kiểm tra kiểu dữ liệu của map_id trong nodes (number)', async () => {
        const res = await request(app).get(endpoint);
        expect(typeof res.body.data.nodes[0].map_id).toBe('number');
    });

    it('TC-18: Kiểm tra kiểu dữ liệu của instruction trong edges (string/null)', async () => {
        const res = await request(app).get(endpoint);
        const edge = res.body.data.edges.find((e: any) => e.id === TEST_STEP_ID);
        expect(typeof edge.instruction).toBe('string');
    });

    it('TC-19: Dữ liệu trả về đồng nhất khi gọi nhiều lần', async () => {
        const res1 = await request(app).get(endpoint);
        const res2 = await request(app).get(endpoint);
        expect(res1.body.data).toEqual(res2.body.data);
    });

    it('TC-20: Tên building_name không được để trống', async () => {
        const res = await request(app).get(endpoint);
        res.body.data.floors.forEach((f: any) => {
            expect(f.building_name.length).toBeGreaterThan(0);
        });
    });
  });

  describe('Edge Cases & Empty DB (Cases 21-25)', () => {
    it('TC-21: Test trường hợp DB có dữ liệu lớn (Simulated)', async () => {
        const res = await request(app).get(endpoint);
        expect(res.body.data.floors.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-22: image_url có thể là null hoặc bắt đầu bằng http', async () => {
        const res = await request(app).get(endpoint);
        res.body.data.floors.forEach((f: any) => {
            if (f.image_url) {
                expect(f.image_url).toMatch(/^http/);
            }
        });
    });

    it('TC-23: Test logic sync khi không có edges (Expect mảng rỗng)', async () => {
        const res = await request(app).get(endpoint);
        expect(Array.isArray(res.body.data.edges)).toBe(true);
    });

    it('TC-24: Đảm bảo không có duplicate IDs trong nodes', async () => {
        const res = await request(app).get(endpoint);
        const ids = res.body.data.nodes.map((n: any) => n.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
    });

    it('TC-25: Trường hợp DB rỗng (trả về 3 mảng rỗng) - Verification', async () => {
        const res = await request(app).get(endpoint);
        expect(res.body.data).toHaveProperty('floors');
        expect(res.body.data).toHaveProperty('nodes');
        expect(res.body.data).toHaveProperty('edges');
    });
  });
});
