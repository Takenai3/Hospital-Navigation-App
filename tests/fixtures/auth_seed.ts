export const seedAuthData = async (db) => {
    // 1. Tạo 1 User chuẩn
    await db.query("INSERT INTO users (id, phone, password_hash, full_name, status) VALUES (1001, '0901234567', 'hashed_pw', 'User A', 'active') ON CONFLICT DO NOTHING");

    // 2. Tạo 1 User bị khóa (Để test login thất bại)
    await db.query("INSERT INTO users (id, phone, password_hash, full_name, status) VALUES (1002, '0909999999', 'hashed_pw', 'Banned User', 'banned') ON CONFLICT DO NOTHING");

    // 3. Giả lập 2 phiên đăng nhập khác nhau trên cùng 1 user (Test multi-device)
    await db.query("INSERT INTO sessions (user_id, token) VALUES (1001, 'old_token_abc')");
    await db.query("INSERT INTO sessions (user_id, token) VALUES (1001, 'new_active_token_xyz')");
};