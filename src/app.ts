import express from 'express';
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

// API Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { phone, password, full_name } = req.body;

    // 1. Validation (Mã 2001: Missing param) - Tách riêng để message chính xác theo Test
    if (!phone) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu trường phone' });
    }
    if (!password) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu trường password' });
    }
    if (!full_name || full_name.trim() === "") {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu trường full_name' });
    }

    // 2. Data Type (Mã 2002: Invalid type)
    if (typeof phone !== 'string' || typeof password !== 'string' || typeof full_name !== 'string') {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Sai kiểu dữ liệu' });
    }

    // 3. Invalid Value & Boundaries (Mã 2003: Invalid value)
    
    // Kiểm tra độ dài full_name (DB chỉ cho phép VARCHAR(100))
    if (full_name.length > 100) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Tên quá dài (tối đa 100 ký tự)' });
    }

    if (!isValidPhone(phone)) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Số điện thoại không hợp lệ' });
    }
    
    // Simple password complexity check (min 8 chars, uppercase, digit)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Mật khẩu không đạt yêu cầu' });
    }

    // Check for digits in full_name
    if (/[0-9]/.test(full_name)) {
        return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Tên không hợp lệ' });
    }

    // 4. Business Logic: Check user exists (Mã 3006)
    const checkUser = await db.query("SELECT * FROM users WHERE phone = $1", [phone.trim()]);
    if (checkUser.rows.length > 0) {
      return res.status(200).json({ code: RESPONSE_CODES.USER_EXISTS, message: 'Số điện thoại đã tồn tại' });
    }

    // 5. Insert to DB (Sử dụng 'phone', 'password_hash', 'status' ENUM)
    const result = await db.query(
      "INSERT INTO users (phone, password_hash, full_name, status) VALUES ($1, $2, $3, 'active') RETURNING id",
      [phone.trim(), password, full_name.trim()]
    );

    return res.status(200).json({ 
      code: RESPONSE_CODES.SUCCESS, 
      message: 'Đăng ký thành công', 
      user_id: result.rows[0].id 
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
  }
});

// API Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 1. Validation (Mã 2001)
    if (!phone || !password) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu SĐT hoặc mật khẩu' });
    }

    // 2. Data Type (Mã 2002) - SQLi check placeholder
    if (typeof phone !== 'string' || phone.includes("'")) {
        return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Dữ liệu không hợp lệ' });
    }

    // 3. Logic: Find User (Mã 3007)
    const result = await db.query("SELECT * FROM users WHERE phone = $1", [phone.trim()]);
    if (result.rows.length === 0) {
      return res.status(200).json({ code: RESPONSE_CODES.USER_NOT_FOUND, message: 'Tài khoản không tồn tại' });
    }

    const user = result.rows[0];

    // 4. Logic: Verify Password (Mã 3008)
    if (user.password_hash !== password) {
      return res.status(200).json({ code: RESPONSE_CODES.PASSWORD_INCORRECT, message: 'Sai mật khẩu' });
    }

    // 5. Account Status Check (Mã 3101: Banned/Inactive)
    if (user.status === 'banned' || user.status === 'inactive') {
      return res.status(200).json({ code: RESPONSE_CODES.PERMISSION_DENIED, message: 'Tài khoản đã bị khóa hoặc chưa kích hoạt' });
    }

    // 6. Token Generation (Stateless JWT Logic simulation)
    const accessToken = 'token-' + Math.random().toString(36).substr(2);
    const refreshToken = 'ref-' + Math.random().toString(36).substr(2);

    return res.status(200).json({ 
      code: RESPONSE_CODES.SUCCESS, 
      message: 'Đăng nhập thành công', 
      data: { 
        user_id: user.id,
        accessToken,
        refreshToken
      } 
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
  }
});

/**
 * --- NHÓM API HẠ TẦNG BẢN ĐỒ ---
 * API: Lấy danh sách nodes theo tầng
 */
app.get('/api/map/nodes', async (req, res) => {
    try {
        const { floor_id } = req.query;

        // 1. Validation: Missing param (2001)
        if (floor_id === undefined || floor_id === null || Array.isArray(floor_id)) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });
        }

        // 2. Validation: Data type (2002) - Phải là số nguyên hợp lệ
        const floorIdStr = String(floor_id);
        if (!/^\d+$/.test(floorIdStr) || floorIdStr.includes("'") || floorIdStr.includes(";")) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id phải là kiểu số nguyên' });
        }

        const id = parseInt(floorIdStr, 10);

        // 3. Validation: Value (2003)
        if (id <= 0 || id > 2147483647) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'floor_id không hợp lệ' });
        }

        // 4. Check floor existence (4001)
        const mapCheck = await db.query("SELECT * FROM maps WHERE id = $1", [id]);
        if (mapCheck.rows.length === 0) {
            return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });
        }

        // 5. Get nodes and validate coordinates >= 0
        // Theo yêu cầu: "validate tọa độ x, y không được âm"
        const nodesRes = await db.query(
            "SELECT id, x_coordinate, y_coordinate, type, is_passable FROM nodes WHERE map_id = $1 AND x_coordinate >= 0 AND y_coordinate >= 0",
            [id]
        );

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

/**
 * API: Lấy danh sách các tầng (maps)
 */
app.get('/api/map/floors', async (req, res) => {
    try {
        const { building_code } = req.query;
        let query = "SELECT id, building_code, building_name, image_url, scale_x, scale_y FROM maps";
        let params: any[] = [];

        if (building_code) {
            // Validation: Data type (2002) - SQLi check
            if (typeof building_code !== 'string' || building_code.includes("'") || building_code.includes(";")) {
                return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'building_code không hợp lệ' });
            }
            query += " WHERE building_code = $1";
            params.push(building_code);
        }

        const mapsRes = await db.query(query, params);

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Lấy danh sách tầng thành công',
            data: mapsRes.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * API: Lấy danh sách edges (steps) theo tầng
 */
app.get('/api/map/edges', async (req, res) => {
    try {
        const { floor_id } = req.query;

        // 1. Validation: Missing param (2001)
        if (floor_id === undefined || floor_id === null || Array.isArray(floor_id)) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });
        }

        // 2. Validation: Data type (2002)
        const floorIdStr = String(floor_id);
        if (!/^\d+$/.test(floorIdStr) || floorIdStr.includes("'") || floorIdStr.includes(";")) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id phải là kiểu số nguyên' });
        }

        const id = parseInt(floorIdStr, 10);

        // 3. Validation: Value (2003)
        if (id <= 0 || id > 2147483647) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'floor_id không hợp lệ' });
        }

        // 4. Check floor existence (4001)
        const mapCheck = await db.query("SELECT * FROM maps WHERE id = $1", [id]);
        if (mapCheck.rows.length === 0) {
            return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });
        }

        // 5. Get edges (steps)
        const edgesRes = await db.query(
            "SELECT id, start_node_id, end_node_id, distance, direction, instruction FROM steps WHERE map_id = $1",
            [id]
        );

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Lấy danh sách cạnh thành công',
            data: edgesRes.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * API: Tìm kiếm vị trí và lưu lịch sử
 */
app.post('/api/map/search', async (req, res) => {
    try {
        const { keyword, user_id } = req.body;

        // 1. Validation: Missing param (2001)
        if (!keyword) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu từ khóa tìm kiếm' });
        }
        if (!user_id) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu user_id' });
        }

        // 2. Data Type Validation (2002)
        if (typeof keyword !== 'string' || typeof user_id !== 'number') {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Sai kiểu dữ liệu' });
        }

        // 3. Search wards
        const searchRes = await db.query(
            "SELECT w.id, w.name, w.map_node_id, n.map_id FROM wards w JOIN nodes n ON w.map_node_id = n.id WHERE w.name ILIKE $1",
            [`%${keyword}%`]
        );

        // 4. Save search history if result found
        if (searchRes.rows.length > 0) {
            const targetNodeId = searchRes.rows[0].map_node_id;
            await db.query(
                "INSERT INTO saved_searches (user_id, target_node_id, keyword) VALUES ($1, $2, $3)",
                [user_id, targetNodeId, keyword]
            );
        }

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Tìm kiếm hoàn tất',
            data: searchRes.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * API: Lấy thông tin meta của tầng (scale, image, building)
 */
app.get('/api/map/meta', async (req, res) => {
    try {
        const { floor_id } = req.query;
        if (!floor_id) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });
        }

        if (isNaN(Number(floor_id)) || Number(floor_id) > 2147483647 || Number(floor_id) < -2147483648) { 
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id không hợp lệ hoặc quá lớn' }); 
        }

        const floorIdStr = String(floor_id);
        if (!/^\d+$/.test(floorIdStr)) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id phải là kiểu số nguyên' });
        }

        const id = parseInt(floorIdStr, 10);
        const mapRes = await db.query(
            "SELECT building_code, building_name, image_url, scale_x, scale_y FROM maps WHERE id = $1",
            [id]
        );

        if (mapRes.rows.length === 0) {
            return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });
        }

        const meta = mapRes.rows[0];
        // Validation: scale must be positive
        if (meta.scale_x <= 0 || meta.scale_y <= 0) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Thông số tỷ lệ không hợp lệ' });
        }

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Lấy meta thành công',
            data: meta
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * API: Lấy danh sách điểm mốc (Landmarks) của tầng
 */
app.get('/api/map/landmarks', async (req, res) => {
    try {
        const { floor_id } = req.query;
        if (!floor_id) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Thiếu floor_id' });
        }

        if (isNaN(Number(floor_id)) || Number(floor_id) > 2147483647 || Number(floor_id) < -2147483648) { 
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id không hợp lệ hoặc quá lớn' }); 
        }

        const id = parseInt(String(floor_id), 10);
        if (isNaN(id)) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id không hợp lệ' });
        }

        // Check map existence (4001)
        const mapCheck = await db.query("SELECT id FROM maps WHERE id = $1", [id]);
        if (mapCheck.rows.length === 0) {
            return res.status(200).json({ code: RESPONSE_CODES.FLOOR_NOT_FOUND, message: 'Tầng không tồn tại' });
        }

        // Landmarks are nodes associated with wards or specific node_type
        const landmarksRes = await db.query(
            `SELECT n.id, n.x_coordinate, n.y_coordinate, n.type, w.name as ward_name 
             FROM nodes n 
             LEFT JOIN wards w ON n.id = w.map_node_id 
             WHERE n.map_id = $1 AND (n.type = 'room_entrance' OR w.id IS NOT NULL)`,
            [id]
        );

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Lấy landmarks thành công',
            data: landmarksRes.rows
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * API: Đồng bộ toàn bộ dữ liệu (Sync Full) cho offline mode
 */
app.get('/api/map/sync_full', async (req, res) => {
    try {
        const floors = await db.query("SELECT * FROM maps");
        const nodes = await db.query("SELECT * FROM nodes");
        const edges = await db.query("SELECT * FROM steps");

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Đồng bộ thành công',
            data: {
                floors: floors.rows,
                nodes: nodes.rows,
                edges: edges.rows
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * API: Lấy danh sách thiết bị/beacons
 */
app.get('/api/map/beacons', async (req, res) => {
    try {
        const { floor_id } = req.query;
        let query = "SELECT d.id, d.type, d.status, d.current_node_id, n.x_coordinate, n.y_coordinate FROM devices d JOIN nodes n ON d.current_node_id = n.id";
        let params: any[] = [];

        if (floor_id) {
            query += " WHERE n.map_id = $1";
            params.push(floor_id);
        }

        const devicesRes = await db.query(query, params);

        return res.status(200).json({
            code: RESPONSE_CODES.SUCCESS,
            message: 'Lấy danh sách beacons thành công',
            data: devicesRes.rows
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

/**
 * --- NHÓM API QUẢN LÝ LUỒNG (FLOW) ---
 */

// API: Báo cáo vật cản trong bệnh viện
app.post('/api/flow/report_obstacle', async (req, res) => {
  try {
    const { token, route_id, type, x, y, description } = req.body;

    // 1. Validation (Mã 2001)
    if (!token) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }
    if (!route_id) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }
    if (!type) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }
    if (x === undefined || y === undefined) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }
    if (!description || description.trim() === "") {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // 2. Data Type (Mã 2002)
    if (typeof token !== 'string' || typeof route_id !== 'string' || typeof type !== 'string' || typeof description !== 'string') {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }
    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }

    // --- Check route existence (Mã 5003) ---
    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [route_id.trim()]);
    if (routeCheck.rows.length === 0) {
      return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND, message: 'Path not found' });
    }

    // 3. Invalid Value (Mã 2003)
    if (x < 0 || y < 0) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Invalid parameter value' });
    }

    // 4. Logic: Insert to DB
    await db.query(
      "INSERT INTO obstacles (route_id, type, x_coordinate, y_coordinate, description, status) VALUES ($1, $2, $3, $4, $5, 'ACTIVE')",
      [route_id.trim(), type.trim(), x, y, description.trim()]
    );

    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'OK' });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: Lấy danh sách cảnh báo mật độ
app.get('/api/flow/get_alerts', async (req, res) => {
  try {
    const { token, current_edge } = req.query;

    // 1. Validation (Mã 2001)
    if (!token) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }
    if (!current_edge || String(current_edge).trim() === "") {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // 2. Data Type & Security (Mã 2002)
    const edgeId = String(current_edge);
    if (Array.isArray(current_edge) || edgeId.includes("'") || edgeId.includes(";")) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }

    // --- Check edge existence (Mã 4003) ---
    const edgeCheck = await db.query("SELECT * FROM edges WHERE edge_id = $1", [edgeId.trim()]);
    if (edgeCheck.rows.length === 0) {
      return res.status(200).json({ code: RESPONSE_CODES.EDGE_NOT_FOUND, message: 'Edge not found' });
    }

    // 3. Logic
    const alertsRes = await db.query(
      "SELECT edge_id FROM edge_status WHERE occupancy_rate > 0.8 AND edge_id != $1",
      [edgeId.trim()]
    );

    // 4. Mapping Output
    const data = alertsRes.rows.map((row, index) => ({
      alert_id: `ALT_${Date.now()}_${index}`,
      blocked_edge: row.edge_id
    }));

    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'OK', data });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: Lấy số lượng người thực tế trên một lộ trình
app.get('/api/flow/get_density', async (req, res) => {
  try {
    const { route_id } = req.query;

    // 1. Validation (Mã 2001)
    if (!route_id || String(route_id).trim() === "") {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // 2. Data Type & Security (Mã 2002)
    const routeIdStr = String(route_id);
    if (Array.isArray(route_id) || routeIdStr.includes("'") || routeIdStr.includes(";")) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }

    // --- Check route existence (Mã 5003) ---
    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [routeIdStr.trim()]);
    if (routeCheck.rows.length === 0) {
      return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND, message: 'Path not found' });
    }

    // 3. Logic
    const densityRes = await db.query(
      "SELECT current_people FROM route_density WHERE route_id = $1",
      [routeIdStr.trim()]
    );

    const currentPeople = densityRes.rows.length > 0 ? densityRes.rows[0].current_people : 0;

    // 4. Output (Mã 1000)
    return res.status(200).json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: {
        current_people: currentPeople
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: Lấy dữ liệu bản đồ nhiệt
app.get('/api/flow/get_heatmap', async (req, res) => {
  try {
    const { route_id } = req.query;

    // 1. Validation (Mã 2001)
    if (!route_id || String(route_id).trim() === "") {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // 2. Data Type & Security (Mã 2002)
    const routeIdStr = String(route_id);
    if (Array.isArray(route_id) || routeIdStr.includes("'") || routeIdStr.includes(";")) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }

    // --- Check route existence (Mã 5003) ---
    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [routeIdStr.trim()]);
    if (routeCheck.rows.length === 0) {
      return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND, message: 'Path not found' });
    }

    // 3. Logic
    const heatmapRes = await db.query(
      "SELECT x, y, density_value as value, status_message as message, radius FROM heatmap_data WHERE route_id = $1",
      [routeIdStr.trim()]
    );

    // 4. Output (Mã 1000)
    return res.status(200).json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: heatmapRes.rows.map(row => ({
        x: Number(row.x),
        y: Number(row.y),
        value: Number(row.value),
        message: row.message,
        radius: Number(row.radius)
      }))
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: Lấy danh sách các điểm ùn tắc nghiêm trọng
app.get('/api/flow/get_bottlenecks', async (req, res) => {
  try {
    const { route_id } = req.query;

    // 1. Validation (Mã 2001)
    if (!route_id || String(route_id).trim() === "") {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // 2. Data Type & Security (Mã 2002)
    const routeIdStr = String(route_id);
    if (Array.isArray(route_id) || routeIdStr.includes("'") || routeIdStr.includes(";")) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }

    // --- Check route existence (Mã 5003) ---
    const routeCheck = await db.query("SELECT * FROM routes WHERE route_id = $1", [routeIdStr.trim()]);
    if (routeCheck.rows.length === 0) {
      return res.status(200).json({ code: RESPONSE_CODES.PATH_NOT_FOUND, message: 'Path not found' });
    }

    // 3. Logic
    const bottlenecksRes = await db.query(
      `SELECT edge_name, x, y,
       CASE WHEN occupancy_rate > 0.9 THEN 'CRITICAL' ELSE 'WARNING' END as severity
       FROM bottlenecks_data WHERE route_id = $1 AND occupancy_rate > 0.8`,
      [routeIdStr.trim()]
    );

    // 4. Output (Mã 1000)
    return res.status(200).json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: bottlenecksRes.rows.map(row => ({
        edge_name: row.edge_name,
        x: Number(row.x),
        y: Number(row.y),
        severity: row.severity
      }))
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: Dự báo lưu lượng
app.get('/api/flow/flow_forecast', async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(200).json({ code: RESPONSE_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' });
  }

  try {
    const { area_id, time_offset } = req.query;

    // 1. Missing required parameter (Mã 2001)
    if (time_offset === undefined || String(time_offset).trim() === "") {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // 2. Invalid parameter type (Mã 2002)
    const offset = Number(time_offset);
    if (isNaN(offset) || Array.isArray(time_offset)) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }

    // 3. Invalid parameter value (Mã 2003)
    if (offset !== 15 && offset !== 30) {
      return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE, message: 'Invalid parameter value' });
    }

    // 4. Node not found (Mã 4002)
    const areaIdStr = area_id ? String(area_id).trim() : null;
    if (areaIdStr) {
      try {
        const areaCheck = await db.query("SELECT * FROM areas WHERE area_id = $1", [areaIdStr]);
        if (areaCheck.rows.length === 0) {
          return res.status(200).json({ code: RESPONSE_CODES.NODE_NOT_FOUND, message: 'Node not found' });
        }
      } catch (dbErr) {
        return res.status(200).json({ code: RESPONSE_CODES.DB_QUERY_FAILED, message: 'Database query failed' });
      }
    }

    // 5. Engine Logic (Mã 9001, 9002)
    try {
      let query = "SELECT area_id, forecast_density, status_warning FROM flow_forecasts WHERE time_offset = $1";
      let params: any[] = [offset];
      if (areaIdStr) { query += " AND area_id = $2"; params.push(areaIdStr); }

      const forecastRes = await db.query(query, params);

      return res.status(200).json({
        code: RESPONSE_CODES.SUCCESS,
        message: 'OK',
        data: forecastRes.rows.map(row => ({
          area_id: row.area_id,
          forecast_density: Number(row.forecast_density),
          status_warning: row.status_warning
        }))
      });
    } catch (engineError: any) {
      if (engineError.message === 'TIMEOUT') {
        return res.status(200).json({ code: RESPONSE_CODES.ENGINE_TIMEOUT, message: 'Engine timeout' });
      }
      return res.status(200).json({ code: RESPONSE_CODES.ENGINE_UNAVAILABLE, message: 'Engine unavailable' });
    }

  } catch (error) {
    // 6. Unexpected exception (Mã 9999)
    return res.status(200).json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: EDGE_STATUS (Xem % lấp đầy của 1 đoạn đường)
app.get('/api/flow/edge_status', async (req: Request, res: Response) => {
  try {
    const { edge_id } = req.query;

    // 1. Validation: 2001 (Missing), 2002 (Invalid Type)
    if (!edge_id || (typeof edge_id === 'string' && edge_id.trim() === '')) {
      return res.json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }
    if (typeof edge_id !== 'string' || edge_id.includes("'")) {
      return res.json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'Invalid parameter type' });
    }

    // 2. Kiểm tra tồn tại đoạn đường: 4003
    const edgeCheck = await db.query('SELECT edge_id FROM edges WHERE edge_id = $1', [edge_id]);
    if (edgeCheck.rows.length === 0) {
      return res.json({ code: RESPONSE_CODES.EDGE_NOT_FOUND, message: 'Edge not found' });
    }

    // 3. Lấy dữ liệu mật độ: 6002 nếu không có dữ liệu
    const densityData = await db.query(
      'SELECT edge_id, current_count, fill_percentage FROM edge_density WHERE edge_id = $1',
      [edge_id]
    );

    if (densityData.rows.length === 0) {
      return res.json({ code: RESPONSE_CODES.DENSITY_UNAVAILABLE, message: 'Density data unavailable' });
    }

    // 4. Thành công: 1000
    return res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: densityData.rows[0]
    });

  } catch (error: any) {
    if (error.message.includes('connection')) {
      return res.json({ code: RESPONSE_CODES.DB_CONNECTION_FAILED, message: 'Database connection failed' });
    }
    return res.json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: SET_EDGE_CAPACITY (Quy định số người tối đa/m2 - Admin only)
app.patch('/api/admin/set_edge_capacity', async (req: Request, res: Response) => {
  try {
    const { token, edge_id, max_capacity } = req.body;

    // 1. Validation: 2001 (Missing Param)
    if (!token || !edge_id || max_capacity === undefined) {
      return res.json({
        code: RESPONSE_CODES.MISSING_PARAM,
        message: 'Missing required parameter'
      });
    }

    // 2. Validation: 2002 (Invalid Type)
    // max_capacity phải là số nguyên (int) theo spec
    if (typeof max_capacity !== 'number' || !Number.isInteger(max_capacity)) {
      return res.json({
        code: RESPONSE_CODES.INVALID_TYPE,
        message: 'Invalid parameter type'
      });
    }

    // 3. Check Token & Authorization: 3001, 3002, 3102
    // Giả lập logic kiểm tra token Admin
    if (token === 'expired_token') {
      return res.json({ code: RESPONSE_CODES.TOKEN_EXPIRED, message: 'Token expired' });
    }
    if (token !== 'admin_secret_token_2026') {
      // Nếu token đúng format nhưng không có quyền Admin
      if (token.includes('user')) {
        return res.json({ code: RESPONSE_CODES.ADMIN_ROLE_REQUIRED, message: 'Admin role required' });
      }
      return res.json({ code: RESPONSE_CODES.INVALID_TOKEN, message: 'Invalid token' });
    }

    // 4. Kiểm tra tồn tại Edge: 4003
    const edgeCheck = await db.query('SELECT edge_id FROM edges WHERE edge_id = $1', [edge_id]);
    if (edgeCheck.rows.length === 0) {
      return res.json({ code: RESPONSE_CODES.EDGE_NOT_FOUND, message: 'Edge not found' });
    }

    // 5. Cập nhật dữ liệu vào Database
    await db.query(
      'UPDATE edges SET max_capacity = $1 WHERE edge_id = $2',
      [max_capacity, edge_id]
    );

    // 6. Trả về kết quả thành công: 1000
    return res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: {
        edge_id: edge_id,
        max_capacity: max_capacity
      }
    });

  } catch (error: any) {
    console.error(error);
    // Xử lý lỗi truy vấn (9902) hoặc kết nối (9901)
    if (error.message.includes('connection')) {
      return res.json({ code: RESPONSE_CODES.DB_CONNECTION_FAILED, message: 'Database connection failed' });
    }
    return res.json({ code: RESPONSE_CODES.DB_QUERY_FAILED, message: 'Database query failed' });
  }
});

// API: SET_PRIORITY (Thiết lập luồng ưu tiên cấp cứu)
app.post('/api/flow/set_priority', async (req: Request, res: Response) => {
  try {
    const { token, emergency_id, start_point, end_point } = req.body;

    // 1. Check Missing Params (2001)
    if (!token || !emergency_id || !start_point || !end_point) {
      return res.json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // 2. Check Auth (3101/3102)
    if (token !== 'medical_staff_token_2026' && token !== 'admin_secret_token_2026') {
      return res.json({ code: RESPONSE_CODES.PERMISSION_DENIED, message: 'Permission denied' });
    }

    // 3. Check Node Existence (4002)
    const nodeCheck = await db.query(
      'SELECT node_id FROM nodes WHERE node_id IN ($1, $2)',
      [start_point, end_point]
    );
    if (nodeCheck.rows.length < 2) {
      return res.json({ code: RESPONSE_CODES.NODE_NOT_FOUND, message: 'Node not found' });
    }

    // 4. Gọi Engine điều phối (Giả lập)
    // Xử lý logic 9001 (Engine Unavailable) hoặc 9002 (Timeout) nếu cần
    try {
      const priorityRoute = [
        { node_id: start_point, edge_id: 'E_01', clearance_required: true, alert_radius: 10, estimated_arrival: 0 },
        { node_id: 'NODE_MID', edge_id: 'E_02', clearance_required: true, alert_radius: 10, estimated_arrival: 30 },
        { node_id: end_point, edge_id: null, clearance_required: false, alert_radius: 0, estimated_arrival: 60 }
      ];

      // Giả lập case không tìm thấy đường (5003)
      if (end_point === 'NODE_C') {
        return res.json({ code: RESPONSE_CODES.PATH_NOT_FOUND, message: 'Path not found' });
      }

      // 5. Success (1000)
      return res.json({
        code: RESPONSE_CODES.SUCCESS,
        message: 'OK',
        data: {
          priority_route: priorityRoute
        }
      });

    } catch (engineError) {
      return res.json({ code: RESPONSE_CODES.ENGINE_TIMEOUT, message: 'Engine timeout' });
    }

  } catch (error) {
    return res.json({ code: RESPONSE_CODES.UNEXPECTED, message: 'Unexpected exception' });
  }
});

// API: FLOW_STATS_ADMIN (Thống kê lượt người theo thời gian cho Admin)
app.get('/api/admin/flow_stats_admin', async (req: Request, res: Response) => {
  try {
    const { token, date, area_id } = req.query;

    // 1. Validation (2001, 2003)
    if (!token || !date) {
      return res.json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof date !== 'string' || !dateRegex.test(date)) {
      return res.json({ code: RESPONSE_CODES.INVALID_PARAM_VALUE, message: 'Invalid date format' });
    }

    // 2. Authorization (3102)
    if (token !== 'admin_secret_token_2026') {
      return res.json({ code: RESPONSE_CODES.ADMIN_ROLE_REQUIRED, message: 'Admin role required' });
    }

    // 3. Check Existence (4002)
    if (area_id) {
      const areaCheck = await db.query('SELECT node_id FROM nodes WHERE node_id = $1', [area_id]);
      if (areaCheck.rows.length === 0) {
        return res.json({ code: RESPONSE_CODES.NODE_NOT_FOUND, message: 'Area not found' });
      }
    }

    // 4. Query Logic (Toàn viện hoặc Khu vực)
    let sql = `SELECT hour, total_visitors, area_id FROM hourly_stats WHERE stats_date = $1`;
    const params: any[] = [date];
    if (area_id) {
      sql += ` AND area_id = $2`;
      params.push(area_id);
    }
    sql += ` ORDER BY hour ASC`;

    const result = await db.query(sql, params);

    // 5. Success (1000)
    return res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: result.rows
    });

  } catch (error: any) {
    if (error.message.includes('connection') || error.message.includes('terminated')) {
      return res.json({ code: RESPONSE_CODES.DB_CONNECTION_FAILED, message: 'Database connection failed' });
    }
    return res.json({ code: RESPONSE_CODES.DB_QUERY_FAILED, message: 'Database query failed' });
  }
});

// ADMIN API: RESET_TRAFFIC :Xóa dữ liệu lưu lượng hiện tại để hệ thống tính toán lại từ đầu (Reset sensor/cache)
app.post('/api/admin/reset_traffic', async (req: Request, res: Response) => {
  try {
    const { token, area_id, reason } = req.body;

    // 1. Validation: 2001 (Missing Param)
    if (!token || !reason) {
      return res.json({
        code: RESPONSE_CODES.MISSING_PARAM,
        message: 'Missing token or reason'
      });
    }

    // 2. Check Admin Role: 3102
    if (token !== 'admin_secret_token_2026') {
      return res.json({
        code: RESPONSE_CODES.ADMIN_ROLE_REQUIRED,
        message: 'Admin role required'
      });
    }

    // 3. Nếu truyền area_id, kiểm tra xem khu vực có tồn tại không: 4002
    if (area_id) {
      const areaCheck = await db.query('SELECT node_id FROM nodes WHERE node_id = $1', [area_id]);
      if (areaCheck.rows.length === 0) {
        return res.json({
          code: RESPONSE_CODES.NODE_NOT_FOUND,
          message: 'Area (Node) not found'
        });
      }
    }

    // 4. Logic Reset dữ liệu
    // Nếu có area_id: reset cụ thể khu vực đó. Nếu không: reset toàn bệnh viện.
    if (area_id) {
      await db.query('UPDATE edge_density SET current_count = 0, fill_percentage = "0%" WHERE area_id = $1', [area_id]);
    } else {
      await db.query('UPDATE edge_density SET current_count = 0, fill_percentage = "0%"');
    }

    // 5. Thành công: 1000
    return res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: [] // Trả về mảng rỗng theo spec ảnh 4
    });

  } catch (error: any) {
    return res.json({
      code: RESPONSE_CODES.DB_QUERY_FAILED,
      message: 'Database operation failed'
    });
  }
});

/**
 * --- NHÓM API THÔNG BÁO ĐẨY ---
 */

// API: Đăng ký nhận thông báo đẩy (FCM)
app.post('/api/user/set_devtoken', async (req: Request, res: Response) => {
  try {
    const { token, device_token } = req.body;

    // 1. Validation (Mã 2001: Missing parameter)
    if (!token) {
      return res.status(200).json({
        code: RESPONSE_CODES.MISSING_PARAM,
        message: 'Missing required parameter: token'
      });
    }
    if (!device_token) {
      return res.status(200).json({
        code: RESPONSE_CODES.MISSING_PARAM,
        message: 'Missing required parameter: device_token'
      });
    }

    // 2. Data Type Validation (Mã 2002: Invalid type)
    if (typeof token !== 'string' || typeof device_token !== 'string') {
      return res.status(200).json({
        code: RESPONSE_CODES.INVALID_TYPE,
        message: 'Invalid parameter type'
      });
    }

    // 3. Authentication & Security (Mã 3002: Invalid token)
    // Giả lập check định dạng token người dùng (phải bắt đầu bằng user_access_)
    if (!token.startsWith('user_access_') || token.includes("'")) {
      return res.status(200).json({
        code: RESPONSE_CODES.INVALID_TOKEN,
        message: 'Invalid token'
      });
    }

    // 4. Business Logic: Lưu hoặc cập nhật Device Token vào DB
    // Sử dụng ON CONFLICT để đảm bảo mỗi user chỉ có 1 device_token mới nhất
    const sql = `
      INSERT INTO user_devices (user_token, device_token, last_updated)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_token)
      DO UPDATE SET device_token = EXCLUDED.device_token, last_updated = NOW()
    `;

    try {
      await db.query(sql, [token.trim(), device_token.trim()]);
    } catch (dbErr) {
      return res.status(200).json({
        code: RESPONSE_CODES.DB_QUERY_FAILED,
        message: 'Database operation failed'
      });
    }

    // 5. Thành công (Mã 1000)
    return res.status(200).json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: []
    });

  } catch (error) {
    console.error(error);
    // 6. Unexpected exception (Mã 9999)
    return res.status(200).json({
      code: RESPONSE_CODES.UNEXPECTED,
      message: 'Unexpected exception'
    });
  }
});

// API: Lấy danh sách các thông báo (nhắc lịch khám, cảnh báo khu vực đông người...)
app.get('/api/notif/get_notification', async (req: Request, res: Response) => {
  try {
    const token = req.headers['token'] as string;
    const { index, count } = req.query;

    // 1. Validation: Missing Token (Mã 3003)
    if (!token) {
      return res.status(200).json({
        code: RESPONSE_CODES.USER_NOT_AUTHENTICATED,
        message: 'User not authenticated'
      });
    }

    // 2. Validation: Missing paging params (Mã 2001)
    if (index === undefined || count === undefined) {
      return res.status(200).json({
        code: RESPONSE_CODES.MISSING_PARAM,
        message: 'Missing required parameter'
      });
    }

    const idx = parseInt(String(index));
    const cnt = parseInt(String(count));

    // 3. Validation: Invalid Value (Mã 2003)
    if (isNaN(idx) || isNaN(cnt) || idx < 0 || cnt <= 0) {
      return res.status(200).json({
        code: RESPONSE_CODES.INVALID_VALUE,
        message: 'Parameter value is invalid'
      });
    }

    // 4. Get Data
    const result = await db.query(
      `SELECT notif_id, title, content, type, is_read, created_at
       FROM notifications
       WHERE user_token = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [token, cnt, idx]
    );

    // 5. Output: Thành công (Mã 1000)
    return res.status(200).json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: result.rows
    });

  } catch (error) {
      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
            return res.status(200).json({
              code: RESPONSE_CODES.DB_CONNECTION_FAILED,
              message: 'Database connection failed'
            });
          }

    // 6. Unexpected exception (Mã 9999)
    return res.status(200).json({
      code: RESPONSE_CODES.UNEXPECTED,
      message: 'Unexpected exception'
    });
  }
});

// API: Đánh dấu thông báo đã đọc (read_notification)

app.post('/api/notif/read_notification', async (req: Request, res: Response) => {
  try {
    // 1. Lấy Token từ Header
    const token = req.headers['token'] as string;

    // 2. Lấy notif_id từ Body
    const { notif_id } = req.body;

    // --- KIỂM TRA XÁC THỰC (AUTH) ---
    // Trường hợp: Không có token hoặc token hết hạn
    if (!token) {
      return res.status(200).json({
        code: RESPONSE_CODES.USER_NOT_AUTHENTICATED, // 3003
        message: 'User not authenticated'
      });
    }

    // --- KIỂM TRA THAM SỐ (VALIDATION) ---
    // Trường hợp: Bỏ trống hoặc không truyền notif_id
    if (!notif_id) {
      return res.status(200).json({
        code: RESPONSE_CODES.MISSING_PARAM, // 2001
        message: 'Missing required parameter'
      });
    }

    // --- XỬ LÝ LOGIC ---

    // Bước 1: Tìm thông báo và kiểm tra quyền sở hữu
    const findNotif = await db.query(
      'SELECT user_token, is_read FROM notifications WHERE notif_id = $1',
      [notif_id]
    );

    // Trường hợp: notif_id không tồn tại trong hệ thống
    if (findNotif.rows.length === 0) {
      return res.status(200).json({
        code: RESPONSE_CODES.NOTIFICATION_NOT_FOUND, // 4004
        message: 'Notification not found'
      });
    }

    const notification = findNotif.rows[0];

    // Trường hợp: Bảo mật - Người dùng A cố ý đọc thông báo của người dùng B
    if (notification.user_token !== token) {
      return res.status(200).json({
        code: RESPONSE_CODES.PERMISSION_DENIED, // 3101 (hoặc 1009 tùy mapping)
        message: 'Not access'
      });
    }

    // Bước 2: Cập nhật trạng thái nếu chưa đọc
    // Nếu đã đọc rồi (is_read = '1'), vẫn trả về 1000 để đảm bảo UX
    if (notification.is_read === '0') {
      await db.query(
        'UPDATE notifications SET is_read = $1 WHERE notif_id = $2',
        ['1', notif_id]
      );
    }

    // --- KẾT QUẢ ĐẦU RA ---
    // Thành công: Trả về mã 1000 và mảng data rỗng
    return res.status(200).json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'OK',
      data: []
    });

  } catch (error: any) {
    // --- XỬ LÝ LỖI HỆ THỐNG ---

    // Lỗi kết nối Database
    if (error.message.includes('connection')) {
      return res.status(200).json({
        code: RESPONSE_CODES.DATABASE_CONNECTION_FAILED,
        message: 'Database connection failed'
      });
    }

    // Lỗi query SQL
    return res.status(200).json({
      code: RESPONSE_CODES.DATABASE_QUERY_FAILED,
      message: 'Database query failed'
    });
  }
});

// API: Xóa thông báo (del_notification)

app.post('/api/notif/del_notification', async (req: Request, res: Response) => {
  try {
    const token = req.headers['token'] as string;
    const { notif_id } = req.body;

    if (!token) return res.status(200).json({ code: RESPONSE_CODES.USER_NOT_AUTHENTICATED });

    // Kiểm tra thiếu tham số notif_id
    if (!notif_id) {
      return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM, message: 'Missing required parameter' });
    }

    // Kiểm tra sở hữu để chặn thao tác chéo dữ liệu tài khoản khác
    const checkOwner = await db.query('SELECT user_token FROM notifications WHERE notif_id = $1', [notif_id]);

    if (checkOwner.rows.length === 0) {
      return res.status(200).json({ code: RESPONSE_CODES.NOTIFICATION_NOT_FOUND, message: 'Notification not found' });
    }

    if (checkOwner.rows[0].user_token !== token) {
      return res.status(200).json({ code: RESPONSE_CODES.PERMISSION_DENIED, message: 'Not access' });
    }

    // Thực hiện xóa khỏi lịch sử
    await db.query('DELETE FROM notifications WHERE notif_id = $1', [notif_id]);

    return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Xóa thông báo thành công', data: [] });

  } catch (error: any) {
    return res.status(200).json({ code: RESPONSE_CODES.DATABASE_QUERY_FAILED });
  }
});

export default app;
