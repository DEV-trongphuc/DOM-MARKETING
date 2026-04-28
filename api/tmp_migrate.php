<?php
require 'db_connect.php';

try {
    // 1. Create saas_tenant_settings
    $pdo->exec("CREATE TABLE IF NOT EXISTS `saas_tenant_settings` (
      `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
      `tenant_slug` VARCHAR(50) NOT NULL,
      `account_id` VARCHAR(50) NOT NULL,
      `setting_key` VARCHAR(60) NOT NULL,
      `setting_value` JSON NOT NULL,
      `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY `uk_tenant_acc_key` (`tenant_slug`, `account_id`, `setting_key`),
      FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "Created saas_tenant_settings.\n";
} catch (Exception $e) {
    echo "Error creating saas_tenant_settings: " . $e->getMessage() . "\n";
}

try {
    // 2. Add account_id to saas_ai_reports
    $pdo->exec("ALTER TABLE `saas_ai_reports` ADD COLUMN `account_id` VARCHAR(50) NULL AFTER `tenant_slug`");
    // Update existing records to have a default account_id so we don't break them
    $pdo->exec("UPDATE `saas_ai_reports` SET `account_id` = 'legacy' WHERE `account_id` IS NULL");
    
    // We should also change the unique constraint if any.
    // Currently, saas_ai_reports doesn't seem to have a unique constraint on local_id, or maybe it does? 
    // The previous queries did `DELETE FROM saas_ai_reports WHERE tenant_slug = ? AND local_id = ?`, so it seems `local_id` is per tenant. Now it should be per tenant + account_id.
    // Let's just create an index to be safe.
    $pdo->exec("ALTER TABLE `saas_ai_reports` ADD INDEX `idx_tenant_acc` (`tenant_slug`, `account_id`)");
    echo "Added account_id to saas_ai_reports.\n";
} catch (Exception $e) {
    echo "Error altering saas_ai_reports: " . $e->getMessage() . "\n";
}

echo "Done.\n";
?>
