import express from 'express';

const app = express();
app.use(express.json());

// Đây là skeleton cho API của bạn
app.post('/api/auth/signup', (req, res) => {
  // Logic giả lập: Trả về 200 cho tất cả, code phân biệt trong body
  const { phone_number, password } = req.body;
  if (!phone_number || !password) {
    return res.status(200).json({ code: 2001, message: 'Missing param' });
  }
  return res.status(200).json({ code: 1000, message: 'Success', user_id: 'uuid-123' });
});

app.post('/api/auth/login', (req, res) => {
  const { phone_number, password } = req.body;
  if (!phone_number || !password) {
    return res.status(200).json({ code: 2001, message: 'Missing param' });
  }
<<<<<<< Updated upstream
  // Logic so sánh password
  if (password === 'wrong_pass') {
    return res.status(200).json({ code: 3008, message: 'Wrong password' });
  }
  return res.status(200).json({ 
    code: 1000, 
    message: 'Success', 
    data: { accessToken: 'token-' + Math.random(), refreshToken: 'ref-' + Math.random() } 
  });
=======
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

        if (floor_id !== undefined && floor_id !== null && floor_id !== "") {
            // Bước 1: Kiểm tra nếu floor_id không phải string hoặc number
            if (typeof floor_id !== 'string' && typeof floor_id !== 'number') {
                return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id không hợp lệ' });
            }

            // Bước 2: Chuyển floor_id sang kiểu Number. 
            // Nếu kết quả là NaN, hoặc lớn hơn 2147483647, hoặc nhỏ hơn -2147483648
            const numericId = Number(floor_id);
            if (isNaN(numericId) || numericId > 2147483647 || numericId < -2147483648) {
                return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE, message: 'floor_id không hợp lệ hoặc quá lớn' });
            }

            // Bước 3: Chỉ khi vượt qua các bước trên mới đưa floor_id vào mảng params
            query += " WHERE n.map_id = $1";
            params.push(numericId);
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
>>>>>>> Stashed changes
});

/**
 * --- NHÓM API ADMIN (PHẦN 3) ---
 */

// Middleware Auth Mock
const adminAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
    if (authHeader.includes('invalid-token')) return res.status(200).json({ code: '3001' });
    if (authHeader.includes('expired-token')) return res.status(200).json({ code: '3002' });
    if (authHeader.includes('token-user')) return res.status(200).json({ code: '1009' });
    next();
};

// --- Nhóm Node (Note) ---
app.post('/api/admin/admin_add_note', adminAuth, async (req, res) => {
    try {
        const { id, map_id, x, y, type, name } = req.body;
        if (!id || !map_id || x === undefined || y === undefined || !name) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        }
        if (typeof id !== 'string') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

        await db.query(
            "INSERT INTO nodes (id, map_id, x_coordinate, y_coordinate, type) VALUES ($1, $2, $3, $4, $5)",
            [id, map_id, x, y, type || 'hallway']
        );
        // Note: admin_spec.txt includes 'name', which likely maps to a ward or node description
        await db.query("INSERT INTO wards (map_node_id, name) VALUES ($1, $2) ON CONFLICT (map_node_id) DO UPDATE SET name = $2", [id, name]);
        
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, message: 'Thêm node thành công' });
    } catch (error) {
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_edit_note', adminAuth, async (req, res) => {
    try {
        const { id, x, y, name } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof id !== 'string') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });

        const nodeUpdate = await db.query(
            "UPDATE nodes SET x_coordinate = COALESCE($1, x_coordinate), y_coordinate = COALESCE($2, y_coordinate) WHERE id = $3",
            [x, y, id]
        );
        
        if (name) {
            await db.query("UPDATE wards SET name = $1 WHERE map_node_id = $2", [name, id]);
        }

        if (nodeUpdate.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_del_note', adminAuth, async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        
        // --- Regression Fix: Handle Foreign Keys ---
        // 1. Xóa Ward liên quan
        await db.query("DELETE FROM wards WHERE map_node_id = $1", [id]);
        // 2. Xóa Steps (Edges) liên quan (cả start và end)
        await db.query("DELETE FROM steps WHERE start_node_id = $1 OR end_node_id = $1", [id]);
        // 3. Xóa Devices liên quan
        await db.query("DELETE FROM devices WHERE current_node_id = $1", [id]);
        // 4. Xóa các bảng nghiệp vụ khác (paths, searches, heatmaps)
        await db.query("DELETE FROM paths WHERE start_node_id = $1 OR end_node_id = $1", [id]);
        await db.query("DELETE FROM saved_searches WHERE target_node_id = $1", [id]);
        await db.query("DELETE FROM heatmaps WHERE node_id = $1", [id]);

        const result = await db.query("DELETE FROM nodes WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_del_note:', error);
        return res.status(200).json({ code: '5000', message: 'Internal Server Error' });
    }
});

// --- Nhóm Edge ---
app.post('/api/admin/admin_add_edge', adminAuth, async (req, res) => {
    try {
        const { map_id, start_node, end_node, distance } = req.body;
        if (!map_id || !start_node || !end_node || distance === undefined) {
            return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        }
        if (typeof map_id !== 'number') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
        if (distance <= 0) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query(
            "INSERT INTO steps (map_id, start_node_id, end_node_id, distance) VALUES ($1, $2, $3, $4) RETURNING id",
            [map_id, start_node, end_node, distance]
        );
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: { id: result.rows[0].id } });
    } catch (error) {
        console.error('❌ Error in admin_add_edge:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_edit_edge', adminAuth, async (req, res) => {
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

app.post('/api/admin/admin_del_edge', adminAuth, async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        
        // Hiện tại steps không bị bảng nào trỏ vào làm FK (theo SQL.txt)
        // Nếu sau này có, hãy bổ sung logic check tại đây.

        const result = await db.query("DELETE FROM steps WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_del_edge:', error);
        return res.status(200).json({ code: '5000' });
    }
});

// --- Nhóm Weight ---
app.post('/api/admin/set_weight', adminAuth, async (req, res) => {
    try {
        const { edge_id, weight } = req.body;
        if (!edge_id || weight === undefined) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        
        // Kiểm tra kiểu dữ liệu của weight
        if (weight !== undefined && isNaN(Number(weight))) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE }); // Mã 2002
        }
        // Kiểm tra giá trị logic của weight
        if (weight !== undefined && Number(weight) <= 0) {
            return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE }); // Mã 2003
        }
        
        const result = await db.query("UPDATE steps SET distance = $1 WHERE id = $2", [weight, edge_id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in set_weight:', error);
        return res.status(200).json({ code: '5000' });
    }
});

// --- Nhóm Device ---
app.post('/api/admin/admin_add_device', adminAuth, async (req, res) => {
    try {
        const { current_node_id, type, status } = req.body;
        if (!current_node_id || !type || !status) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        if (typeof type !== 'string') return res.status(200).json({ code: RESPONSE_CODES.INVALID_TYPE });
        
        const validStatuses = ['available', 'in_use', 'maintenance'];
        if (!validStatuses.includes(status)) return res.status(200).json({ code: RESPONSE_CODES.INVALID_VALUE });

        const result = await db.query(
            "INSERT INTO devices (current_node_id, type, status) VALUES ($1, $2, $3) RETURNING id",
            [current_node_id, type, status]
        );
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS, data: { id: result.rows[0].id } });
    } catch (error) {
        console.error('❌ Error in admin_add_device:', error);
        return res.status(200).json({ code: '5000' });
    }
});

app.post('/api/admin/admin_edit_device', adminAuth, async (req, res) => {
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

app.post('/api/admin/admin_del_device', adminAuth, async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(200).json({ code: RESPONSE_CODES.MISSING_PARAM });
        
        // devices không bị bảng nào trỏ vào.
        
        const result = await db.query("DELETE FROM devices WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(200).json({ code: '4001' });
        return res.status(200).json({ code: RESPONSE_CODES.SUCCESS });
    } catch (error) {
        console.error('❌ Error in admin_del_device:', error);
        return res.status(200).json({ code: '5000' });
    }
});

export default app;
