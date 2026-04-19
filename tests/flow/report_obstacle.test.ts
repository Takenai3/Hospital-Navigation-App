import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/config/database';
import { RESPONSE_CODES } from '../../src/constants/response-codes';

describe('Integration Test: API Report Obstacle', () => {
    const endpoint = '/api/flow/report_obstacle';

    const mockData = {
        token: 'valid_token_123',
        route_id: 'R_001',
        type: 'WET_FLOOR',
        x: 10.5,
        y: 20.7,
        description: 'Cảnh báo sàn ướt'
    };

    beforeAll(async () => {
        // Setup bảng routes và obstacles
        await db.query("CREATE TABLE IF NOT EXISTS routes (id SERIAL PRIMARY KEY, route_id TEXT UNIQUE)");
        await db.query(`CREATE TABLE IF NOT EXISTS obstacles (
            id SERIAL PRIMARY KEY,
            route_id TEXT,
            type TEXT,
            x_coordinate FLOAT,
            y_coordinate FLOAT,
            description TEXT,
            status TEXT
        )`);

        // Chèn route_id mẫu để vượt qua check 5003
        await db.query("INSERT INTO routes (route_id) VALUES ($1) ON CONFLICT DO NOTHING", [mockData.route_id]);
    });

    afterAll(async () => {
        // Dọn dẹp dữ liệu
        await db.query("DELETE FROM obstacles");
        await db.query("DELETE FROM routes");
    });

    describe('Thành công (1000)', () => {
        it('TC-01: 1000 | SUCCESS - Gửi báo cáo thành công với đầy đủ tham số', async () => {
            const res = await request(app).post(endpoint).send(mockData);
            expect(res.body.code).toBe(RESPONSE_CODES.SUCCESS);
            expect(res.body.message).toBe('OK');
        });
    });

    describe('Lỗi tham số (2001, 2002)', () => {
        it('TC-02: 2001 | MISSING_PARAM - Thiếu token', async () => {
            const { token, ...data } = mockData;
            const res = await request(app).post(endpoint).send(data);
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
            expect(res.body.message).toBe('Missing required parameter');
        });

        it('TC-03: 2001 | MISSING_PARAM - Thiếu tọa độ x hoặc y', async () => {
            const res = await request(app).post(endpoint).send({ ...mockData, x: undefined });
            expect(res.body.code).toBe(RESPONSE_CODES.MISSING_PARAM);
        });

        it('TC-04: 2002 | INVALID_TYPE - Tọa độ x không phải là number', async () => {
            const res = await request(app).post(endpoint).send({ ...mockData, x: "10.5" });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
            expect(res.body.message).toBe('Invalid parameter type');
        });

        it('TC-05: 2002 | INVALID_TYPE - Tham số route_id là mảng thay vì string', async () => {
            const res = await request(app).post(endpoint).send({ ...mockData, route_id: ['R1', 'R2'] });
            expect(res.body.code).toBe(RESPONSE_CODES.INVALID_TYPE);
        });
    });

    describe('Logic nghiệp vụ & Lỗi hệ thống', () => {
        it('TC-06: 5003 | PATH_NOT_FOUND - route_id không tồn tại trong hệ thống', async () => {
            const res = await request(app)
                .post(endpoint)
                .send({ ...mockData, route_id: 'NON_EXISTENT_ROUTE' });

            expect(res.body.code).toBe(RESPONSE_CODES.PATH_NOT_FOUND);
            expect(res.body.message).toBe('Path not found');
        });

        it('TC-07: Logic - Lưu đúng loại vật cản vào Database', async () => {
            const specialRoute = 'R_ELEV';
            await db.query("INSERT INTO routes (route_id) VALUES ($1) ON CONFLICT DO NOTHING", [specialRoute]);

            const specialData = { ...mockData, type: 'BROKEN_ELEVATOR', route_id: specialRoute };
            await request(app).post(endpoint).send(specialData);

            const result = await db.query("SELECT type FROM obstacles WHERE route_id = $1", [specialRoute]);
            expect(result.rows[0].type).toBe('BROKEN_ELEVATOR');
        });

        it('TC-08: 9902 | DB_QUERY_FAILED - Lỗi khi truy vấn SQL', async () => {
            const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Database query failed');
            });

            const res = await request(app).post(endpoint).send(mockData);

            expect(res.body.code).toBe(RESPONSE_CODES.DB_QUERY_FAILED);

            spy.mockRestore();
        });

        it('TC-09: 9901 | DB_CONNECTION_FAILED - Lỗi kết nối Database', async () => {
             // Giả lập lỗi kết nối nghiêm trọng
             const spy = jest.spyOn(db, 'query').mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const res = await request(app).post(endpoint).send(mockData);

            expect(res.body.code).toBe(RESPONSE_CODES.DB_CONNECTION_FAILED);

            spy.mockRestore();
        });
    });
});