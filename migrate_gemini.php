<?php
require_once 'api/config.php';
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Thêm cột gemini_api_key
    $pdo->exec("ALTER TABLE saas_tenants ADD COLUMN gemini_api_key VARCHAR(255) NULL AFTER meta_token");
    echo "SUCCESS: Added gemini_api_key column to saas_tenants.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "ALREADY EXISTS: gemini_api_key column already exists.\n";
    } else {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}
?>
