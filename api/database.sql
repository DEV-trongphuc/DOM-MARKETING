CREATE DATABASE IF NOT EXISTS vhvxoigh_meta_report DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vhvxoigh_meta_report;

-- Bảng Settings
CREATE TABLE IF NOT EXISTS `settings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `account_id` VARCHAR(50) NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` LONGTEXT CHARSET utf8mb4,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_account_key` (`account_id`, `setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `account_id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255),
  `role` VARCHAR(50) DEFAULT 'viewer',
  `status` VARCHAR(50) DEFAULT 'request',
  `added_at` VARCHAR(50),
  `request_at` VARCHAR(50),
  `last_login` VARCHAR(50),
  `picture` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_account_email` (`account_id`, `email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng AI Reports
CREATE TABLE IF NOT EXISTS `ai_reports` (
  `report_id` VARCHAR(50) NOT NULL,
  `account_id` VARCHAR(50) NOT NULL,
  `timestamp` VARCHAR(50),
  `label` VARCHAR(255),
  `brand` VARCHAR(255),
  `date_range` VARCHAR(100),
  `preview` TEXT,
  `html` LONGTEXT CHARSET utf8mb4,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`, `account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =========================================================
-- MIGRATION DATA: DATA MẪU KHỞI TẠO CHO CÔNG TY 
-- Account ID: 676599667843841
-- =========================================================

-- INSERT SETTINGS
INSERT INTO `settings` (`account_id`, `setting_key`, `setting_value`) VALUES
('676599667843841', 'goal_keywords', '["Reach","Engagement","View","Message","Traffic"]'),
('676599667843841', 'goal_chart_mode', '"keyword"'),
('676599667843841', 'dom_column_config', '{"activeColumns":["spend","result","cpr","custom_1772875800614","custom_1772098365207","custom_1773041760061"],"customMetrics":[{"id":"custom_1772098365207","name":"Mess rate%","formula":"{{message_started}}/{{link_click}}","format":"number"},{"id":"custom_1772875800614","name":"CTR rate%","formula":"{{link_click}}/{{impressions}}","format":"number"},{"id":"custom_1773041760061","name":"View Rate","formula":"{{video_play}}/{{impressions}}","format":"number"}]}'),
('676599667843841', 'dom_view_presets', '[{"id":"default","name":"Mặc định","isDefault":true,"columns":["spend","result","cpr","cpm","reach","frequency","reaction"],"customMetrics":[]},{"id":1772078958750,"name":"Performance","columns":["spend","result","cpr","cpm","impressions","reach","frequency","link_click","custom_1772875800614","message_started","custom_1772098365207","video_play","custom_1773041760061"],"customMetrics":[{"id":"custom_1772098365207","name":"Mess rate%","formula":"{{message_started}}/{{link_click}}","format":"number"},{"id":"custom_1772875800614","name":"CTR rate%","formula":"{{link_click}}/{{impressions}}","format":"number"},{"id":"custom_1773041760061","name":"View Rate","formula":"{{video_play}}/{{impressions}}","format":"number"}]},{"id":1774253392693,"name":"Rate","columns":["spend","result","cpr","custom_1772875800614","custom_1772098365207","custom_1773041760061"],"customMetrics":[{"id":"custom_1772098365207","name":"Mess rate%","formula":"{{message_started}}/{{link_click}}","format":"number"},{"id":"custom_1772875800614","name":"CTR rate%","formula":"{{link_click}}/{{impressions}}","format":"number"},{"id":"custom_1773041760061","name":"View Rate","formula":"{{video_play}}/{{impressions}}","format":"number"}]}]'),
('676599667843841', 'dom_summary_metrics', '["impressions","reach","message_started"]'),
('676599667843841', 'meta_access_token', '"EAAUbzkTFG4sBReMHJAmyGZAwT6jrboSgD2QXqmRsZCSe62OhFnAFNYqVxG3xZBi0U9ZBuuVNqDOTP5Ce6iytnYavG6PW0iJiQ17XMjCUdaPzvi7VnvvMGz89C9UI5CWTMa5QBMZCwkZAnuRCJjDoRX25ZAjed8uzZC9iuCq0VjTvTI1QuzjWtOi2JOA6bKsL9W0ChL7y"'),
('676599667843841', 'everyone_view', 'false'),
('676599667843841', 'dom_brand_filters', '[{"name":"The Running Bean","img":"./adset/ampersand/TRB.jpg","filter":"TRB"},{"name":"Häagen-Dazs","img":"./adset/ampersand/HD.jpg","filter":"HGD"},{"name":"Be An Vegetarian","img":"./adset/ampersand/BEAN.jpg","filter":"BeAn"},{"name":"Esta Saigon","img":"./adset/ampersand/Esta.jpg","filter":"Esta"},{"name":"Le Petit","img":"./adset/ampersand/LPT.jpg","filter":"LePetit"},{"name":"SNOWEE","img":"./adset/ampersand/SNOWEE.jpg","filter":"Snowee"},{"name":"Ampersand","img":"./adset/ampersand/ampersand_img.jpg","filter":""},{"name":"SON","img":"https://drive.google.com/drive/u/0/home","filter":"SON"}]')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- INSERT USERS
INSERT INTO `users` (`account_id`, `email`, `name`, `role`, `status`, `added_at`, `request_at`, `last_login`, `picture`) VALUES
('676599667843841', 'hoavu1503@gmail.com', 'Thái Hòa', 'admin', 'active', '23:43:06 1/3/2026', '', '10:15:33 20/4/2026', 'https://lh3.googleusercontent.com/a/ACg8ocJsKC51Pqcb3echeLLOYZZN7XUPcGXhWvcLrLLpFeN6JcXloGkg=s96-c'),
('676599667843841', 'dom.marketing.vn@gmail.com', 'DOM MARKETING', 'admin', 'active', '15:53:23 6/4/2026', '', '10:04:35 20/4/2026', 'https://lh3.googleusercontent.com/a/ACg8ocJkvlmr4VLKQwSK1dRPhv2oDQqsCGoyEWi25_NSIXFJ8W9Ti9k=s96-c'),
('676599667843841', 'info.innsaigon2017@gmail.com', 'Inn Saigon', 'viewer', 'active', '09:40:48 6/3/2026', '', '15:44:02 16/3/2026', 'https://lh3.googleusercontent.com/a/ACg8ocJ8c8Iu7XprAcjzT3ALmtKFPFdOJfvpvRMQ7_5uv7K9TJWukQ=s96-c')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), status=VALUES(status), added_at=VALUES(added_at), request_at=VALUES(request_at), last_login=VALUES(last_login), picture=VALUES(picture);
