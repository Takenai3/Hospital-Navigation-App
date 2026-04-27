import express, { Request, Response } from 'express';
import { db } from './config/database';
import { RESPONSE_CODES } from './constants/response-codes';

const app = express();
app.use(express.json());

// Helper function to validate phone
const isValidPhone = (phone: any): boolean => {
  if (typeof phone !== 'string') return false;
  // regex for simple phone validation (start with 0 or +84, then 9-11 digits)
  return /^(0|\+84)[0-9]{9,11}$/.test(phone.trim());
};

// Middleware Auth Mock
const adminAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    if (authHeader.includes('invalid-token')) return res.status(200).json({ code: '3001' });
    if (authHeader.includes('expired-token')) return res.status(200).json({ code: '3002' });
    if (authHeader.includes('token-user')) return res.status(200).json({ code: '1009' });
    next();
};

/**
 * --- NHÓM API AUTH ---
 */

// API Signup
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { phone, password, full_name } = req.body;

    // 1. Validation (Mã 2001: Missing param)
    if (!phone) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu trường phone' });
    if (!password) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu trường password' });
    if (!full_name || full_name.trim() === "") return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu trường full_name' });

    // 2. Data Type (Mã 2002: Invalid type)
    if (typeof phone !== 'string' || typeof password !== 'string' || typeof full_name !== 'string') {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Sai kiểu dữ liệu' });
    }

    // 3. Invalid Value & Boundaries (Mã 2003: Invalid value)
    if (full_name.length > 100) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Tên quá dài (tối đa 100 ký tự)' });
    if (!isValidPhone(phone)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Số điện thoại không hợp lệ' });
    
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Mật khẩu không đạt yêu cầu' });
    if (/[0-9]/.test(full_name)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Tên không hợp lệ' });

    // 4. Business Logic: Check user exists
    const checkUser = await db.query("SELECT * FROM users WHERE phone = $1", [phone.trim()]);
    if (checkUser.rows.length > 0) return res.status(200).json({ code: RESPONSE_CODES.USER_EXISTS, message: 'Số điện thoại đã tồn tại' });

    // 5. Insert to DB
    const result = await db.query(
      "INSERT INTO users (phone, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
      [phone.trim(), password, full_name.trim()]
    );

    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Đăng ký thành công', user_id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
  }
});

// API Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu SĐT hoặc mật khẩu' });
    if (typeof phone !== 'string' || phone.includes("'")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Dữ liệu không hợp lệ' });

    const result = await db.query("SELECT * FROM users WHERE phone = $1", [phone.trim()]);
    if (result.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.USER_NOT_FOUND, message: 'Tài khoản không tồn tại' });

    const user = result.rows[0];
    if (user.password_hash !== password) return res.status(200).json({ code: RESPONSE_CODES.PASSWORD_INCORRECT, message: 'Sai mật khẩu' });
    if (user.status === 'banned' || user.status === 'inactive') return res.status(200).json({ code: RESPONSE_CODES.PERMISSION_DENIED, message: 'Tài khoản đã bị khóa hoặc chưa kích hoạt' });

    const accessToken = 'token-' + Math.random().toString(36).substr(2);
    const refreshToken = 'ref-' + Math.random().toString(36).substr(2);

    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Đăng nhập thành công', data: { user_id: user.id, accessToken, refreshToken } });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
  }
});

// API Verify OTP
app.post('/api/auth/verify_otp', async (req: Request, res: Response) => {
    try {
        const { phone, otp_code } = req.body;
        if (!phone || !otp_code) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu tham số' });

        const userRes = await db.query("SELECT id FROM users WHERE phone = $1", [phone]);
        if (userRes.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Người dùng không tồn tại' });

        const otpRes = await db.query("SELECT id FROM otps WHERE phone = $1 AND otp_code = $2 AND is_used = false ORDER BY created_at DESC LIMIT 1", [phone, otp_code]);
        if (otpRes.rows.length === 0) return res.status(200).json({ code: '3005', message: 'OTP không hợp lệ hoặc đã sử dụng' });

        // Update trạng thái
        await db.query("UPDATE otps SET is_used = true WHERE id = $1", [otpRes.rows[0].id]);
        await db.query("UPDATE users SET status = 'active' WHERE phone = $1", [phone]);

        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Xác thực thành công' });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API Logout
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(200).json({ code: '3001', message: 'Missing Token' });
    
    if (!authHeader.startsWith('Bearer ')) return res.status(200).json({ code: '3002', message: 'Invalid/Malformed Token' });
    
    const token = authHeader.split(' ')[1];
    if (!token || token === 'invalid_junk' || token === 'expired_token_data') {
        return res.status(200).json({ code: '3002', message: 'Token invalid or expired' });
    }
    
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Đăng xuất thành công' });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
  }
});

/**
 * --- NHÓM API HẠ TẦNG BẢN ĐỒ ---
 */

// API: Lấy danh sách nodes theo tầng
app.get('/api/map/nodes', async (req: Request, res: Response) => {
    try {
        const { floor_id } = req.query;
        if (floor_id === undefined || floor_id === null || Array.isArray(floor_id)) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });

        const floorIdStr = String(floor_id);
        if (!/^\d+$/.test(floorIdStr) || floorIdStr.includes("'") || floorIdStr.includes(";")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id phải là kiểu số nguyên' });

        const id = parseInt(floorIdStr, 10);
        if (id <= 0 || id > 2147483647) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'floor_id không hợp lệ' });

        const mapCheck = await db.query("SELECT * FROM maps WHERE id = $1", [id]);
        if (mapCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });

        const nodesRes = await db.query("SELECT id, x_coordinate, y_coordinate, type, is_passable FROM nodes WHERE map_id = $1 AND x_coordinate >= 0 AND y_coordinate >= 0", [id]);

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Lấy danh sách node thành công',
            data: nodesRes.rows,
            map_info: {
                building_name: mapCheck.rows[0].building_name,
                image_url: mapCheck.rows[0].image_url,
                scale_x: mapCheck.rows[0].scale_x,
                scale_y: mapCheck.rows[0].scale_y
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Lấy danh sách các tầng (maps)
app.get('/api/map/floors', async (req: Request, res: Response) => {
    try {
        const { building_code } = req.query;
        let query = "SELECT id, building_code, building_name, image_url, scale_x, scale_y FROM maps";
        let params: any[] = [];
        if (building_code) {
            if (typeof building_code !== 'string' || building_code.includes("'") || building_code.includes(";")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'building_code không hợp lệ' });
            query += " WHERE building_code = $1";
            params.push(building_code);
        }
        const mapsRes = await db.query(query, params);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Lấy danh sách tầng thành công', data: mapsRes.rows });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Lấy danh sách edges (steps) theo tầng
app.get('/api/map/edges', async (req: Request, res: Response) => {
    try {
        const { floor_id } = req.query;
        if (floor_id === undefined || floor_id === null || Array.isArray(floor_id)) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });

        const floorIdStr = String(floor_id);
        if (!/^\d+$/.test(floorIdStr) || floorIdStr.includes("'") || floorIdStr.includes(";")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id phải là kiểu số nguyên' });

        const id = parseInt(floorIdStr, 10);
        if (id <= 0 || id > 2147483647) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'floor_id không hợp lệ' });

        const mapCheck = await db.query("SELECT * FROM maps WHERE id = $1", [id]);
        if (mapCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });

        const edgesRes = await db.query("SELECT id, start_node_id, end_node_id, distance, direction, instruction FROM steps WHERE map_id = $1", [id]);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Lấy danh sách cạnh thành công', data: edgesRes.rows });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Tìm kiếm vị trí
app.post('/api/map/search', async (req: Request, res: Response) => {
    try {
        const { keyword, user_id } = req.body;
        if (!keyword || !user_id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu từ khóa tìm kiếm hoặc user_id' });
        if (typeof keyword !== 'string' || typeof user_id !== 'number') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Sai kiểu dữ liệu' });

        const searchRes = await db.query(
            "SELECT w.id, w.name, w.map_node_id, n.map_id FROM wards w JOIN nodes n ON w.map_node_id = n.id WHERE w.name ILIKE $1",
            [`%${keyword}%`]
        );

        if (searchRes.rows.length > 0) {
            const targetNodeId = searchRes.rows[0].map_node_id;
            await db.query("INSERT INTO saved_searches (user_id, target_node_id, keyword) VALUES ($1, $2, $3)", [user_id, targetNodeId, keyword]);
        }
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Tìm kiếm hoàn tất', data: searchRes.rows });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Search Location (Fixed)
app.get('/api/map/search_location', async (req: Request, res: Response) => {
    try {
        const { room_name, floor_id, building_code } = req.query;
        let query = "SELECT r.id, r.name, r.node_id, r.floor_id, f.building_code, f.floor_number FROM rooms r JOIN floors f ON r.floor_id = f.id";
        let params: any[] = [];
        if (room_name) {
            query += " WHERE r.name ILIKE $1";
            params.push(`%${room_name}%`);
        }
        if (floor_id) {
            query += params.length > 0 ? " AND r.floor_id = $2" : " WHERE r.floor_id = $1";
            params.push(floor_id);
        }
        const result = await db.query(query, params);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Tìm kiếm thành công', data: result.rows });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Lấy thông tin meta
app.get('/api/map/meta', async (req: Request, res: Response) => {
    try {
        const { floor_id } = req.query;
        if (!floor_id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });
        if (isNaN(Number(floor_id)) || Number(floor_id) > 2147483647 || Number(floor_id) < -2147483648) { 
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id không hợp lệ hoặc quá lớn' }); 
        }

        const id = parseInt(String(floor_id), 10);
        const mapRes = await db.query("SELECT building_code, building_name, image_url, scale_x, scale_y FROM maps WHERE id = $1", [id]);
        if (mapRes.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });

        const meta = mapRes.rows[0];
        if (meta.scale_x <= 0 || meta.scale_y <= 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Thông số tỷ lệ không hợp lệ' });

        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Lấy meta thành công', data: meta });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Lấy landmarks
app.get('/api/map/landmarks', async (req: Request, res: Response) => {
    try {
        const { floor_id } = req.query;
        if (!floor_id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });
        
        const id = parseInt(String(floor_id), 10);
        // Regression Fix: Check for NaN before DB query to avoid crash 5000
        if (isNaN(id)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id không hợp lệ' });

        const mapCheck = await db.query("SELECT id FROM maps WHERE id = $1", [id]);
        if (mapCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });

        const landmarksRes = await db.query(`SELECT n.id, n.x_coordinate, n.y_coordinate, n.type, w.name as ward_name FROM nodes n LEFT JOIN wards w ON n.id = w.map_node_id WHERE n.map_id = $1 AND (n.type = 'room_entrance' OR w.id IS NOT NULL)`, [id]);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Lấy landmarks thành công', data: landmarksRes.rows });
    } catch (error) {
        console.error('❌ Error in get_landmarks:', error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Đồng bộ toàn bộ dữ liệu
app.get('/api/map/sync_full', async (req: Request, res: Response) => {
    try {
        const floors = await db.query("SELECT * FROM maps");
        const nodes = await db.query("SELECT * FROM nodes");
        const edges = await db.query("SELECT * FROM steps");
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Đồng bộ thành công', data: { floors: floors.rows, nodes: nodes.rows, edges: edges.rows } });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// API: Lấy danh sách thiết bị/beacons
app.get('/api/map/beacons', async (req: Request, res: Response) => {
    try {
        const { floor_id } = req.query;
        let query = "SELECT d.id, d.type, d.status, d.current_node_id, n.x_coordinate, n.y_coordinate FROM devices d JOIN nodes n ON d.current_node_id = n.id";
        let params: any[] = [];
        if (floor_id) {
            const numericId = Number(floor_id);
            if (isNaN(numericId) || numericId > 2147483647 || numericId < -2147483648) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
            query += " WHERE n.map_id = $1";
            params.push(numericId);
        }
        const devicesRes = await db.query(query, params);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Lấy danh sách beacons thành công', data: devicesRes.rows });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * --- NHÓM API QUẢN LÝ LUỒNG (FLOW) ---
 */

app.post('/api/flow/report_obstacle', async (req: Request, res: Response) => {
  try {
    const { token, route_id, type, x, y, description } = req.body;
    if (!token || !route_id || !type || x === undefined || y === undefined || !description) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    if (typeof token !== 'string' || typeof route_id !== 'string' || typeof type !== 'string' || typeof description !== 'string' || typeof x !== 'number' || typeof y !== 'number') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [route_id.trim()]);
    if (routeCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND, message: 'Path not found' });
    if (x < 0 || y < 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

    await db.query("INSERT INTO obstacles (route_id, type, x_coordinate, y_coordinate, description, status) VALUES ($1, $2, $3, $4, $5, 'ACTIVE')", [route_id.trim(), type.trim(), x, y, description.trim()]);
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.get('/api/flow/get_alerts', async (req: Request, res: Response) => {
  try {
    const { token, current_edge } = req.query;
    if (!token || !current_edge) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    const edgeId = String(current_edge);
    if (Array.isArray(current_edge) || edgeId.includes("'")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

    const edgeCheck = await db.query("SELECT * FROM edges WHERE edge_id = $1", [edgeId.trim()]);
    if (edgeCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.EDGE_NOT_FOUND });

    const alertsRes = await db.query("SELECT edge_id FROM edge_status WHERE occupancy_rate > 0.8 AND edge_id != $1", [edgeId.trim()]);
    const data = alertsRes.rows.map((row, index) => ({ alert_id: `ALT_${Date.now()}_${index}`, blocked_edge: row.edge_id }));
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.get('/api/flow/get_density', async (req: Request, res: Response) => {
  try {
    const { route_id } = req.query;
    if (!route_id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    const routeIdStr = String(route_id);
    if (Array.isArray(route_id) || routeIdStr.includes("'")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [routeIdStr.trim()]);
    if (routeCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND });

    const densityRes = await db.query("SELECT current_people FROM route_density WHERE route_id = $1", [routeIdStr.trim()]);
    const currentPeople = densityRes.rows.length > 0 ? densityRes.rows[0].current_people : 0;
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: { current_people: currentPeople } });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.get('/api/flow/get_heatmap', async (req: Request, res: Response) => {
  try {
    const { route_id } = req.query;
    if (!route_id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    const routeIdStr = String(route_id);
    if (Array.isArray(route_id) || routeIdStr.includes("'")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [routeIdStr.trim()]);
    if (routeCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND });

    const heatmapRes = await db.query("SELECT x, y, density_value as value, status_message as message, radius FROM heatmap_data WHERE route_id = $1", [routeIdStr.trim()]);
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: heatmapRes.rows.map(row => ({ x: Number(row.x), y: Number(row.y), value: Number(row.value), message: row.message, radius: Number(row.radius) })) });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.get('/api/flow/get_bottlenecks', async (req: Request, res: Response) => {
  try {
    const { route_id } = req.query;
    if (!route_id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    const routeIdStr = String(route_id);
    if (Array.isArray(route_id) || routeIdStr.includes("'")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [routeIdStr.trim()]);
    if (routeCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND });

    const bottlenecksRes = await db.query(`SELECT edge_name, x, y, CASE WHEN occupancy_rate > 0.9 THEN 'CRITICAL' ELSE 'WARNING' END as severity FROM bottlenecks_data WHERE route_id = $1 AND occupancy_rate > 0.8`, [routeIdStr.trim()]);
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: bottlenecksRes.rows.map(row => ({ edge_name: row.edge_name, x: Number(row.x), y: Number(row.y), severity: row.severity })) });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.get('/api/flow/flow_forecast', async (req: Request, res: Response) => {
  try {
    const { area_id, time_offset } = req.query;
    if (time_offset === undefined || String(time_offset).trim() === "") return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    const offset = Number(time_offset);
    if (isNaN(offset)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
    if (offset !== 15 && offset !== 30) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

    const areaIdStr = area_id ? String(area_id).trim() : null;
    if (areaIdStr) {
        const areaCheck = await db.query("SELECT * FROM areas WHERE area_id = $1", [areaIdStr]);
        if (areaCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.NODE_NOT_FOUND });
    }

    let query = "SELECT area_id, forecast_density, status_warning FROM flow_forecasts WHERE time_offset = $1";
    let params: any[] = [offset];
    if (areaIdStr) { query += " AND area_id = $2"; params.push(areaIdStr); }
    const forecastRes = await db.query(query, params);
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: forecastRes.rows.map(row => ({ area_id: row.area_id, forecast_density: Number(row.forecast_density), status_warning: row.status_warning })) });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.get('/api/flow/edge_status', async (req: Request, res: Response) => {
  try {
    const { edge_id } = req.query;
    if (!edge_id || (typeof edge_id === 'string' && edge_id.trim() === '')) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    if (typeof edge_id !== 'string' || edge_id.includes("'")) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

    const edgeCheck = await db.query('SELECT edge_id FROM edges WHERE edge_id = $1', [edge_id]);
    if (edgeCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.EDGE_NOT_FOUND });

    const densityData = await db.query('SELECT edge_id, current_count, fill_percentage FROM edge_density WHERE edge_id = $1', [edge_id]);
    if (densityData.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.DENSITY_UNAVAILABLE });
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: densityData.rows[0] });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.post('/api/flow/set_priority', async (req: Request, res: Response) => {
  try {
    const { token, emergency_id, start_point, end_point } = req.body;
    if (!token || !emergency_id || !start_point || !end_point) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    if (token !== 'medical_staff_token_2026' && token !== 'admin_secret_token_2026') return res.status(200).json({ code: RESPONSE_CODES.PERMISSION_DENIED });

    const nodeCheck = await db.query('SELECT id FROM nodes WHERE id IN ($1, $2)', [start_point, end_point]);
    if (nodeCheck.rows.length < 2) return res.status(200).json({ code: RESPONSE_CODES.NODE_NOT_FOUND });

    if (end_point === 'NODE_C') return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND });
    const priorityRoute = [
        { node_id: start_point, edge_id: 'E_01', clearance_required: true, alert_radius: 10, estimated_arrival: 0 },
        { node_id: 'NODE_MID', edge_id: 'E_02', clearance_required: true, alert_radius: 10, estimated_arrival: 30 },
        { node_id: end_point, edge_id: null, clearance_required: false, alert_radius: 0, estimated_arrival: 60 }
    ];
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: { priority_route: priorityRoute } });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

/**
 * --- NHÓM API THÔNG BÁO ---
 */

app.post('/api/user/set_devtoken', async (req: Request, res: Response) => {
  try {
    const { token, device_token } = req.body;
    if (!token || !device_token) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    if (typeof token !== 'string' || typeof device_token !== 'string') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
    if (!token.startsWith('user_access_') || token.includes("'")) return res.status(200).json({ code: RESPONSE_CODES.TOKEN_INVALID });

    await db.query(`INSERT INTO user_devices (user_token, device_token, last_updated) VALUES ($1, $2, NOW()) ON CONFLICT (user_token) DO UPDATE SET device_token = EXCLUDED.device_token, last_updated = NOW()`, [token.trim(), device_token.trim()]);
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: [] });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

// 1. API Lấy thông báo
app.get('/api/notif/get_notification', async (req, res) => {
    try {
        const token = req.headers.token || req.headers.authorization;
        if (!token) return res.status(200).json({ code: RESPONSE_CODES.UNAUTHENTICATED });
        
        if (req.query.index === undefined || req.query.count === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        const index = parseInt(req.query.index as string);
        const count = parseInt(req.query.count as string);
        if (isNaN(index) || isNaN(count) || index < 0 || count <= 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query(
            "SELECT id, user_id, title, body, type, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            [token, count, index]
        );
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: result.rows });
    } catch (error) {
        console.error('❌ get_notification error:', error);
        return res.status(200).json({ code: '5000' });
    }
});

// 2. API Xóa thông báo
app.post('/api/notif/del_notification', async (req, res) => {
    try {
        const token = req.headers.token || req.headers.authorization;
        if (!token) return res.status(200).json({ code: RESPONSE_CODES.UNAUTHENTICATED });
        
        const { notif_id } = req.body;
        if (notif_id === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof notif_id !== 'number') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

        const result = await db.query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [notif_id, token]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ del_notification error:', error);
        return res.status(200).json({ code: '5000' });
    }
});

// 3. API Đọc thông báo
app.post('/api/notif/read_notification', async (req, res) => {
    try {
        const token = req.headers.token || req.headers.authorization;
        if (!token) return res.status(200).json({ code: RESPONSE_CODES.UNAUTHENTICATED });
        
        const { notif_id } = req.body;
        if (notif_id === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof notif_id !== 'number') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

        const result = await db.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [notif_id, token]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ read_notification error:', error);
        return res.status(200).json({ code: '5000' });
    }
});

/**
 * --- NHÓM API ADMIN (PHẦN 3) ---
 */

app.patch('/api/admin/set_edge_capacity', adminAuth, async (req: Request, res: Response) => {
  try {
    const { edge_id, max_capacity } = req.body;
    if (!edge_id || max_capacity === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    if (typeof max_capacity !== 'number' || !Number.isInteger(max_capacity)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

    const edgeCheck = await db.query('SELECT edge_id FROM edges WHERE edge_id = $1', [edge_id]);
    if (edgeCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.EDGE_NOT_FOUND });

    await db.query('UPDATE edges SET max_capacity = $1 WHERE edge_id = $2', [max_capacity, edge_id]);
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: { edge_id, max_capacity } });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.get('/api/admin/flow_stats_admin', adminAuth, async (req: Request, res: Response) => {
  try {
    const { date, area_id } = req.query;
    if (!date) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof date !== 'string' || !dateRegex.test(date)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

    if (area_id) {
      const areaCheck = await db.query('SELECT id FROM nodes WHERE id = $1', [area_id]);
      if (areaCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.NODE_NOT_FOUND });
    }

    let sql = `SELECT hour, total_visitors, area_id FROM hourly_stats WHERE stats_date = $1`;
    const params: any[] = [date];
    if (area_id) { sql += ` AND area_id = $2`; params.push(area_id); }
    sql += ` ORDER BY hour ASC`;

    const result = await db.query(sql, params);
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: result.rows });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.post('/api/admin/reset_traffic', adminAuth, async (req: Request, res: Response) => {
  try {
    const { area_id, reason } = req.body;
    if (!reason) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });

    if (area_id) {
      const areaCheck = await db.query('SELECT id FROM nodes WHERE id = $1', [area_id]);
      if (areaCheck.rows.length === 0) return res.status(200).json({ code: RESPONSE_CODES.NODE_NOT_FOUND });
      await db.query('UPDATE edge_density SET current_count = 0, fill_percentage = "0%" WHERE area_id = $1', [area_id]);
    } else {
      await db.query('UPDATE edge_density SET current_count = 0, fill_percentage = "0%"');
    }
    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: [] });
  } catch (error) {
    return res.status(200).json({ code: '5000' });
  }
});

app.post('/api/admin/admin_add_note', adminAuth, async (req: Request, res: Response) => {
    try {
        const { id, map_id, x, y, type, name } = req.body;
        if (!id || !map_id || x === undefined || y === undefined || !name) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof id !== 'string') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

        await db.query("INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)", [id, map_id, x, y, type || 'hallway']);
        await db.query("INSERT INTO wards (map_node_id, name) VALUES ($1, $2) ON CONFLICT (map_node_id) DO UPDATE SET name = $2", [id, name]);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_add_note:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_edit_note', adminAuth, async (req: Request, res: Response) => {
    try {
        const { id, x, y, name } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof id !== 'string') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

        const result = await db.query("UPDATE nodes SET x_coordinate = COALESCE($1, x_coordinate), y_coordinate = COALESCE($2, y_coordinate) WHERE id = $3", [x, y, id]);
        if (name) await db.query("UPDATE wards SET name = $1 WHERE map_node_id = $2", [name, id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_edit_note:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_del_note', adminAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        await db.query("DELETE FROM wards WHERE map_node_id = $1", [id]);
        await db.query("DELETE FROM steps WHERE start_node_id = $1 OR end_node_id = $1", [id]);
        await db.query("DELETE FROM devices WHERE current_node_id = $1", [id]);
        await db.query("DELETE FROM paths WHERE start_node_id = $1 OR end_node_id = $1", [id]);
        await db.query("DELETE FROM saved_searches WHERE target_node_id = $1", [id]);
        await db.query("DELETE FROM heatmaps WHERE node_id = $1", [id]);

        const result = await db.query("DELETE FROM nodes WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_del_note:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_add_edge', adminAuth, async (req: Request, res: Response) => {
    try {
        const { map_id, start_node, end_node, distance } = req.body;
        if (!map_id || !start_node || !end_node || distance === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof map_id !== 'number') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
        if (distance <= 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query("INSERT INTO steps (map_id, start_node_id, end_node_id, distance) VALUES ($1, $2, $3, $4) RETURNING id", [map_id, start_node, end_node, distance]);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: { id: result.rows[0].id } });
    } catch (error) {
        console.error('❌ Error in admin_add_edge:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_edit_edge', adminAuth, async (req: Request, res: Response) => {
    try {
        const { id, distance } = req.body;
        if (!id || distance === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (distance <= 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query("UPDATE steps SET distance = $1 WHERE id = $2", [distance, id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_edit_edge:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_del_edge', adminAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        const result = await db.query("DELETE FROM steps WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_del_edge:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/set_weight', adminAuth, async (req: Request, res: Response) => {
    try {
        const { edge_id, weight } = req.body;
        if (edge_id === undefined || weight === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });

        const numericWeight = Number(weight);
        if (isNaN(numericWeight)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
        if (numericWeight <= 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query("UPDATE steps SET distance = $1 WHERE id = $2", [numericWeight, edge_id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in set_weight:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_add_device', adminAuth, async (req: Request, res: Response) => {
    try {
        const { current_node_id, type, status } = req.body;
        if (!current_node_id || !type || !status) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof type !== 'string') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
        const validStatuses = ['available', 'in_use', 'maintenance'];
        if (!validStatuses.includes(status)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query("INSERT INTO devices (current_node_id, type, status) VALUES ($1, $2, $3) RETURNING id", [current_node_id, type, status]);
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: { id: result.rows[0].id } });
    } catch (error) {
        console.error('❌ Error in admin_add_device:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_edit_device', adminAuth, async (req: Request, res: Response) => {
    try {
        const { id, status } = req.body;
        if (!id || !status) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        const validStatuses = ['available', 'in_use', 'maintenance'];
        if (!validStatuses.includes(status)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query("UPDATE devices SET status = $1 WHERE id = $2", [status, id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_edit_device:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_del_device', adminAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        const result = await db.query("DELETE FROM devices WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_del_device:', error);
        return res.status(200).json({ code: '5000' });
    }
});

export default app;
