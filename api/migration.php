<?php
require_once 'db.php';

try {
    echo "<h1>Database Migration Tool</h1>";
    echo "<p>Starting migration...</p>";

    // 1. Add new columns to saas_tenants
    $alterQueries = [
        "ALTER TABLE `saas_tenants` ADD COLUMN `google_email` VARCHAR(150) NULL AFTER `name`",
        "ALTER TABLE `saas_tenants` ADD COLUMN `status` ENUM('trial', 'active', 'expired', 'locked') DEFAULT 'trial' AFTER `google_email`",
        "ALTER TABLE `saas_tenants` ADD COLUMN `expires_at` DATETIME NULL AFTER `status`",
        "ALTER TABLE `saas_tenants` ADD COLUMN `ad_accounts` JSON NULL COMMENT 'List of allowed ad accounts' AFTER `ad_account_id`"
    ];

    foreach ($alterQueries as $query) {
        try {
            $pdo->exec($query);
            echo "<p style='color:green'>Success: $query</p>";
        } catch (PDOException $e) {
            // Ignore duplicate column errors (1060)
            if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                echo "<p style='color:orange'>Skipped (already exists): $query</p>";
            } else {
                echo "<p style='color:red'>Error: " . $e->getMessage() . " <br>Query: $query</p>";
            }
        }
    }

    // 2. Create saas_renewal_requests table
    $createTableQuery = "CREATE TABLE IF NOT EXISTS `saas_renewal_requests` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `tenant_slug` VARCHAR(50) NOT NULL,
        `plan` VARCHAR(50) NOT NULL COMMENT '1_month, 1_year',
        `phone` VARCHAR(20),
        `email` VARCHAR(150),
        `status` ENUM('pending', 'resolved', 'rejected') DEFAULT 'pending',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    try {
        $pdo->exec($createTableQuery);
        echo "<p style='color:green'>Success: saas_renewal_requests table created or already exists.</p>";
    } catch (PDOException $e) {
        echo "<p style='color:red'>Error creating saas_renewal_requests: " . $e->getMessage() . "</p>";
    }

    // 3. Update existing tenants to active
    try {
        $pdo->exec("UPDATE `saas_tenants` SET `status` = 'active', `expires_at` = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE `status` = 'trial' AND `expires_at` IS NULL");
        echo "<p style='color:green'>Success: Updated existing tenants to active status with 1 year validity.</p>";
    } catch (PDOException $e) {
        echo "<p style='color:red'>Error updating existing tenants: " . $e->getMessage() . "</p>";
    }

    echo "<h3>Migration completed! Please delete this file for security.</h3>";

} catch (Exception $e) {
    echo "<p style='color:red'>Fatal Error: " . $e->getMessage() . "</p>";
}
