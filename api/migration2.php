<?php
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "<h1>Migration 2: Database Indexes</h1>";

    // 1. saas_tenants indexes
    try {
        $pdo->exec("ALTER TABLE `saas_tenants` ADD INDEX `idx_status` (`status`)");
        echo "<p style='color:green'>Success: Added index idx_status to saas_tenants.</p>";
    } catch (Exception $e) {
        echo "<p style='color:orange'>Info: " . $e->getMessage() . "</p>";
    }
    
    try {
        $pdo->exec("ALTER TABLE `saas_tenants` ADD INDEX `idx_google_email` (`google_email`)");
        echo "<p style='color:green'>Success: Added index idx_google_email to saas_tenants.</p>";
    } catch (Exception $e) {
        echo "<p style='color:orange'>Info: " . $e->getMessage() . "</p>";
    }
    
    try {
        $pdo->exec("ALTER TABLE `saas_tenants` ADD INDEX `idx_expires_at` (`expires_at`)");
        echo "<p style='color:green'>Success: Added index idx_expires_at to saas_tenants.</p>";
    } catch (Exception $e) {
        echo "<p style='color:orange'>Info: " . $e->getMessage() . "</p>";
    }

    // 2. saas_ai_reports indexes
    try {
        $pdo->exec("ALTER TABLE `saas_ai_reports` ADD INDEX `idx_tenant_slug` (`tenant_slug`)");
        echo "<p style='color:green'>Success: Added index idx_tenant_slug to saas_ai_reports.</p>";
    } catch (Exception $e) {
        echo "<p style='color:orange'>Info: " . $e->getMessage() . "</p>";
    }

    try {
        $pdo->exec("ALTER TABLE `saas_ai_reports` ADD INDEX `idx_timestamp` (`timestamp`)");
        echo "<p style='color:green'>Success: Added index idx_timestamp to saas_ai_reports.</p>";
    } catch (Exception $e) {
        echo "<p style='color:orange'>Info: " . $e->getMessage() . "</p>";
    }

    // 3. saas_tenant_viewers indexes
    try {
        $pdo->exec("ALTER TABLE `saas_tenant_viewers` ADD INDEX `idx_tenant_slug_email` (`tenant_slug`, `email`)");
        echo "<p style='color:green'>Success: Added index idx_tenant_slug_email to saas_tenant_viewers.</p>";
    } catch (Exception $e) {
        echo "<p style='color:orange'>Info: " . $e->getMessage() . "</p>";
    }

    echo "<h3>Migration completed!</h3>";

} catch (PDOException $e) {
    die("<p style='color:red'>Connection failed: " . $e->getMessage() . "</p>");
}
?>
