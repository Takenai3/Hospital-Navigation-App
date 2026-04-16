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

export default app;
