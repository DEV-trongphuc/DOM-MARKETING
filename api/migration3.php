<?php
require_once 'db_connect.php';

echo "<h1>Migration 3: Missing Columns for SaaS Tenants</h1>";

$queries = [
    "ALTER TABLE `saas_tenants` ADD COLUMN `brand_filter_enabled` TINYINT(1) DEFAULT 1",
    "ALTER TABLE `saas_tenants` ADD COLUMN `gemini_api_key` VARCHAR(255) NULL",
    "ALTER TABLE `saas_tenants` ADD COLUMN `ad_accounts` JSON NULL",
    "ALTER TABLE `saas_tenants` ADD COLUMN `is_public` TINYINT(1) DEFAULT 0",
    "ALTER TABLE `saas_tenants` ADD COLUMN `ad_account_id` VARCHAR(50) NULL"
];

foreach ($queries as $query) {
    try {
        $pdo->exec($query);
        echo "<p style='color:green'>Success: $query</p>";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "<p style='color:orange'>Skipped (already exists): $query</p>";
        } else {
            echo "<p style='color:red'>Error: " . $e->getMessage() . " <br>Query: $query</p>";
        }
    }
}

echo "<h3>Migration completed! Please delete this file for security.</h3>";
?>
