<?php
require_once __DIR__ . '/config.php';

$host = DB_HOST;
$db   = DB_NAME;
$user = DB_USER; 
$pass = DB_PASS;

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// Hàm chuẩn bị response header
function init_cors() {
    $ALLOWED_ORIGINS = ALLOWED_ORIGINS;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($ALLOWED_ORIGINS === '*') {
        header("Access-Control-Allow-Origin: *");
    } elseif (is_array($ALLOWED_ORIGINS)) {
        if (in_array(rtrim($origin, '/'), $ALLOWED_ORIGINS) || empty($origin)) {
            header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
        } else {
            if (strpos($origin, 'file://') === 0 || empty($origin)) {
                header("Access-Control-Allow-Origin: *");
            }
        }
    }

    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: application/json; charset=UTF-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// Khởi tạo CORS trước khi kết nối Database
init_cors();

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Database connection failed"]);
    exit;
}

// (Đã chuyển lên trên)

$GLOBALS['raw_post_data'] = null;

