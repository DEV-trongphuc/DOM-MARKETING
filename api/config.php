<?php
/**
 * DOM META - CENTRAL CONFIGURATION FILE
 * Tập trung tất cả cài đặt Backend tại đây
 */

// 1. Database Credentials (Cài đặt ID Database)
define('DB_HOST', 'localhost');
define('DB_NAME', 'vhvxoigh_meta');
define('DB_USER', 'vhvxoigh_mail_auto');
define('DB_PASS', 'Ideas@812');

// 2. CORS Origins (Các domain được phép truy cập API)
define('ALLOWED_ORIGINS', '*');

// 3. Third-party & Security Keys
define('GEMINI_API_KEY', ''); // ← Điền key thật vào đây
define('ADMIN_SECRET_KEY', 'DOM_SAAS_SUPER_SECRET_KEY_2026'); // Key mã hóa Token Admin

// 4. Timezone & Locale
date_default_timezone_set('Asia/Ho_Chi_Minh');
?>