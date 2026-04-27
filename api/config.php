<?php
/**
 * DOM META - CENTRAL CONFIGURATION FILE
 * Tập trung tất cả cài đặt Backend tại đây.
 *
 * PRODUCTION: Các giá trị nhạy cảm được đọc từ biến môi trường (PHP environment),
 * được đặt trong php.ini hoặc .htaccess (SetEnv), hoặc trực tiếp trong hosting panel.
 * Nếu biến môi trường không tồn tại, fallback về giá trị mặc định (chỉ dùng cho dev local).
 */

// 1. Database Credentials
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'vhvxoigh_meta');
define('DB_USER', getenv('DB_USER') ?: 'vhvxoigh_mail_auto');
define('DB_PASS', getenv('DB_PASS') ?: 'Ideas@812');

// 2. CORS Origins — Chỉ cho phép các domain chính thức
// Thêm domain mới vào mảng này nếu cần
define('ALLOWED_ORIGINS', [
    'https://meta.domation.net',
    'https://domation.net',
    'https://www.domation.net',
    // Dev/local environments
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1',
]);

// 3. Third-party & Security Keys
define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: '');
// PRODUCTION: Đổi key này thành chuỗi ngẫu nhiên 256-bit, đặt trong env var
define('ADMIN_SECRET_KEY', getenv('ADMIN_SECRET_KEY') ?: 'DOM_SAAS_SUPER_SECRET_KEY_2026');

// 4. Rate Limiting
define('RATE_LIMIT_WINDOW', 60);    // seconds
define('RATE_LIMIT_MAX_REQUESTS', 30); // max requests per window per IP

// 5. Timezone & Locale
date_default_timezone_set('Asia/Ho_Chi_Minh');
?>