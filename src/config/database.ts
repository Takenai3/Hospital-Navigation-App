import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Tải các biến môi trường từ file .env
dotenv.config();

// Kiểm tra xem có đang trong môi trường test hay không
const isTestEnv = process.env.NODE_ENV === 'test';

// Xác định tên Database dựa trên môi trường
// Nếu là test thì chọc vào hospital_test, nếu không thì lấy DB_NAME từ .env hoặc mặc định hospital_dev
const dbName = isTestEnv 
  ? 'hospital_test' 
  : (process.env.DB_NAME || 'hospital_db');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin', // Thay bằng pass pgAdmin của Trình
  database: dbName,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const db = new Pool(dbConfig);

// Log để kiểm chứng khi khởi chạy
if (isTestEnv) {
  console.log('🧪 Testing Mode: Connected to database hospital_test');
} else {
  console.log(`🚀 Production/Dev Mode: Connected to database ${dbName}`);
}

// Hàm hỗ trợ query (giữ lại interface cũ cho tương thích)
export const query = (text: string, params?: any[]) => db.query(text, params);