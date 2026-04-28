-- DOM META SAAS - MULTI-TENANT SCHEMA

CREATE TABLE IF NOT EXISTS `saas_tenants` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Tenant ID from URL',
  `name` VARCHAR(100) NOT NULL,
  `google_email` VARCHAR(150),
  `status` ENUM('trial', 'active', 'expired', 'locked') DEFAULT 'trial',
  `expires_at` DATETIME,
  `meta_token` LONGTEXT,
  `ad_account_id` VARCHAR(50),
  `ad_accounts` JSON COMMENT 'List of allowed ad accounts',
  `brand_filter_enabled` TINYINT(1) DEFAULT 1,
  `is_public` TINYINT(1) DEFAULT 0 COMMENT '1: Public Link enabled',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `saas_tenant_viewers` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_slug` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `name` VARCHAR(150),
  `picture` TEXT,
  `role` VARCHAR(20) DEFAULT 'viewer',
  `status` ENUM('active', 'request', 'rejected') DEFAULT 'request',
  `last_login` DATETIME,
  `request_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `added_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE,
  UNIQUE KEY `idx_tenant_email` (`tenant_slug`, `email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `saas_users` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NULL COMMENT 'Null means Super Admin',
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) DEFAULT 'admin' COMMENT 'super_admin, admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `saas_tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Super Admin (Password: domation@admin)
-- Note: Replace password hash in production. This is just a bcrypt hash for 'domation@admin'
INSERT IGNORE INTO `saas_users` (`username`, `password_hash`, `role`) VALUES
('superadmin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin');

-- AI Reports Table
CREATE TABLE IF NOT EXISTS `saas_ai_reports` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_slug` VARCHAR(50) NOT NULL,
  `local_id` BIGINT NOT NULL COMMENT 'ID from frontend (timestamp)',
  `timestamp` VARCHAR(50),
  `label` VARCHAR(255),
  `brand` VARCHAR(255),
  `dateRange` VARCHAR(100),
  `preview` TEXT,
  `html` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Renewal Requests Table
CREATE TABLE IF NOT EXISTS `saas_renewal_requests` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tenant_slug` VARCHAR(50) NOT NULL,
  `plan` VARCHAR(50) NOT NULL COMMENT '1_month, 1_year',
  `phone` VARCHAR(20),
  `email` VARCHAR(150),
  `status` ENUM('pending', 'resolved', 'rejected') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_slug`) REFERENCES `saas_tenants`(`slug`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
