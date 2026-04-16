const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Khởi tạo luồng giao tiếp với Terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("==================================================");
console.log("🚀 HỆ THỐNG KIỂM THỬ TỰ ĐỘNG - HOSPITAL NAVIGATION");
console.log("==================================================");
console.log("1. Tra cứu bảng mã lỗi (Response Codes)");
console.log("2. Chạy Kiểm thử (Nhấn Enter để chọn mặc định)");
console.log("==================================================");

// Câu hỏi 1: Chọn chức năng
rl.question('Chọn chức năng (1 hoặc 2) [Mặc định: 2]: ', (choice) => {
    // Nếu người dùng chỉ nhấn Enter (chuỗi rỗng), mặc định là '2'
    const selectedChoice = choice.trim() || '2';

    if (selectedChoice === '1') {
        try {
            const errorCodesPath = path.join(__dirname, 'error-codes.json');
            if (fs.existsSync(errorCodesPath)) {
                const errorCodes = require(errorCodesPath);
                console.log("\n📊 --- BẢNG MÃ LỖI HỆ THỐNG ---");
                console.table(errorCodes); // Hàm in ra bảng tuyệt đẹp của Node.js
            } else {
                console.log("\n❌ Không tìm thấy file error-codes.json tại thư mục gốc.");
            }
        } catch (err) {
            console.log("\n❌ Có lỗi khi đọc file mã lỗi:", err.message);
        }
        rl.close();
    } else {
        // Câu hỏi 2: Chọn chế độ test
        rl.question('\nChọn chế độ chạy:\n- [H]olistic (Chạy toàn bộ - Mặc định)\n- [U]rgent (Dừng ngay khi có 1 test failed)\nNhập lựa chọn (H/U) [Mặc định: H]: ', (mode) => {
            const selectedMode = mode.trim().toUpperCase() || 'H';
            
            // Lệnh gốc chạy Jest (đã bao gồm cross-env để trỏ vào hospital_test)
            let jestCommand = 'npx cross-env NODE_ENV=test jest --runInBand --detectOpenHandles';

            if (selectedMode === 'U') {
                console.log('\n🔥 Đang kích hoạt chế độ URGENT (Fail-fast)...');
                // Thêm cờ --bail để báo cho Jest biết phải dừng ngay khi gặp lỗi đầu tiên
                jestCommand += ' --bail';
            } else {
                console.log('\n🌊 Đang kích hoạt chế độ HOLISTIC (Chạy toàn diện)...');
            }

            console.log(`\n> Đang thực thi lệnh: ${jestCommand}\n`);

            try {
                // Thực thi lệnh đồng bộ, in luồng xanh/đỏ trực tiếp ra Terminal (stdio: 'inherit')
                execSync(jestCommand, { stdio: 'inherit' });
                console.log("\n✅ TẤT CẢ TEST CASES ĐÃ PASS THÀNH CÔNG!");
            } catch (error) {
                // execSync sẽ throw error nếu Jest trả về lỗi (có test failed)
                console.log("\n❌ QUÁ TRÌNH TEST ĐÃ DỪNG LẠI (Có Test Case bị Failed).");
                console.log("💡 Vui lòng cuộn lên trên để xem chi tiết log lỗi.");
            }
            
            rl.close();
        });
    }
});