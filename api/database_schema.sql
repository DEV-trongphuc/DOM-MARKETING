-- ==========================================
-- DOMATION META SAAS - DATABASE MIGRATIONS
-- ==========================================

-- 1. saas_tenants updates (Bỏ qua nếu báo lỗi Duplicate column)
-- Lưu ý: Từ MySQL 8.0.16 trở lên có thể dùng IF NOT EXISTS, nếu MySQL cũ hơn hãy bỏ qua dòng này nếu lỗi.
ALTER TABLE saas_tenants ADD COLUMN IF NOT EXISTS is_public TINYINT(1) DEFAULT 0 COMMENT '1: Public Link enabled';

-- 2. saas_tenant_viewers table
CREATE TABLE IF NOT EXISTS `saas_tenant_viewers` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_slug` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `name` VARCHAR(150),
  `picture` TEXT,
  `role` VARCHAR(20) DEFAULT 'viewer',
  `status` ENUM('active', 'request', 'rejected') DEFAULT 'request',
  `request_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `added_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` DATETIME,
  FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Bỏ qua nếu báo lỗi Duplicate column)
ALTER TABLE saas_tenant_viewers ADD COLUMN IF NOT EXISTS last_login DATETIME;

-- 3. saas_rate_limits table
CREATE TABLE IF NOT EXISTS `saas_rate_limits` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `ip` VARCHAR(60) NOT NULL,
  `action` VARCHAR(60) NOT NULL DEFAULT 'request',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_created (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. saas_tenant_settings table (Per workspace/account UI settings)
CREATE TABLE IF NOT EXISTS `saas_tenant_settings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_slug` VARCHAR(50) NOT NULL,
  `account_id` VARCHAR(50) NOT NULL,
  `setting_key` VARCHAR(60) NOT NULL,
  `setting_value` JSON NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_acc_key` (`tenant_slug`, `account_id`, `setting_key`),
  FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. saas_ai_reports table updates (Bỏ qua nếu báo lỗi Duplicate column)
ALTER TABLE `saas_ai_reports` ADD COLUMN IF NOT EXISTS `account_id` VARCHAR(50) NULL AFTER `tenant_slug`;
UPDATE `saas_ai_reports` SET `account_id` = 'legacy' WHERE `account_id` IS NULL;
