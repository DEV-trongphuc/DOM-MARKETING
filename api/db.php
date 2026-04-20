<?php
error_reporting(0); // Tắt report mặc định ra màn hình để json không bị vỡ

$host = 'localhost';
$db   = 'vhvxoigh_meta_report';
$user = 'vhvxoigh_mail_auto'; 
$pass = 'Ideas@812';

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Database connection failed"]);
    exit;
}

// Hàm chuẩn bị response header
function init_cors() {
    $ALLOWED_ORIGINS = [
        "http://localhost",
        "http://127.0.0.1",
        "http://automation.ideas.edu.vn",
        "https://automation.ideas.edu.vn",
        "https://ampersand-meta-report.vercel.app"
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array(rtrim($origin, '/'), $ALLOWED_ORIGINS) || empty($origin)) {
        header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
    } else {
        if (strpos($origin, 'file://') === 0 || empty($origin)) {
            header("Access-Control-Allow-Origin: *");
        }
    }

    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Content-Type: application/json; charset=UTF-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

$GLOBALS['raw_post_data'] = null;

// Bắt buộc frontend phải truyền account_id (mặc định lấy giá trị gốc nếu không có)
function get_account_id() {
    $acc = $_GET['account_id'] ?? $_POST['account_id'] ?? null;
    if (!$acc) {
        if ($GLOBALS['raw_post_data'] === null) {
            $GLOBALS['raw_post_data'] = file_get_contents("php://input");
        }
        $body = json_decode($GLOBALS['raw_post_data'], true) ?: [];
        $acc = $body['account_id'] ?? '676599667843841'; // fallback default
    }
    return $acc;
}
