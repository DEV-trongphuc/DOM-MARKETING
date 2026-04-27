<?php
require_once __DIR__ . '/db.php';

try {
    $pdo->exec("ALTER TABLE saas_tenants ADD COLUMN is_public TINYINT(1) DEFAULT 0 COMMENT '1: Public Link enabled'");
    echo "Added is_public column.\n";
} catch (Exception $e) {
    echo "Column is_public might already exist or error: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `saas_tenant_viewers` (
      `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
      `tenant_slug` VARCHAR(50) NOT NULL,
      `email` VARCHAR(150) NOT NULL,
      `name` VARCHAR(150),
      `picture` TEXT,
      `role` VARCHAR(20) DEFAULT 'viewer',
      `status` ENUM('active', 'request', 'rejected') DEFAULT 'request',
      `request_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
      `added_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "Created saas_tenant_viewers table.\n";
} catch (Exception $e) {
    echo "Table saas_tenant_viewers error: " . $e->getMessage() . "\n";
}
