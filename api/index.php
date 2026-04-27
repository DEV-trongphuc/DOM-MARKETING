<?php
/**
 * DOM META SAAS - MAIN API ROUTER
 * (Separate from legacy index.php)
 */
require_once 'db.php';
init_cors();

$method = $_SERVER['REQUEST_METHOD'];
$GLOBALS['raw_post_data'] = file_get_contents("php://input");
$body = json_decode($GLOBALS['raw_post_data'], true) ?: [];

// Helper
function _json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// JWT Helpers
function generate_admin_token($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + (86400 * 7); // 7 days expiration
    $b64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $b64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $b64Header . "." . $b64Payload, ADMIN_SECRET_KEY, true);
    $b64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return $b64Header . "." . $b64Payload . "." . $b64Signature;
}

function verify_admin_token($token) {
    if (!$token) return false;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($header, $payload, $signature) = $parts;
    
    $valid_signature = hash_hmac('sha256', $header . "." . $payload, ADMIN_SECRET_KEY, true);
    $b64ValidSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($valid_signature));
    
    if (hash_equals($b64ValidSignature, $signature)) {
        $decoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        if (isset($decoded['exp']) && $decoded['exp'] < time()) return false;
        return $decoded;
    }
    return false;
}

// Basic Routing
$action = $_GET['action'] ?? $body['action'] ?? '';

try {
    switch ($action) {
        // --- 0. TEMP MIGRATION ---
        case 'migrate_auth':
            try {
                $pdo->exec("ALTER TABLE saas_tenants ADD COLUMN is_public TINYINT(1) DEFAULT 0 COMMENT '1: Public Link enabled'");
            } catch (Exception $e) {}
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
            } catch (Exception $e) {}
            _json(["ok" => true, "message" => "Migration complete"]);
            break;

        // --- 1. SAAS CLIENT API (For End Users) ---
        case 'get_user_tenants':
            $email = $_GET['email'] ?? $body['email'] ?? '';
            if (!$email) _json(["ok" => false, "error" => "Missing email"], 400);

            // 1. Fetch owned tenants
            $stmt1 = $pdo->prepare("SELECT slug, name, status, expires_at, 'owner' as role FROM saas_tenants WHERE google_email = ?");
            $stmt1->execute([$email]);
            $owned = $stmt1->fetchAll();

            // 2. Fetch viewer tenants (only active)
            $stmt2 = $pdo->prepare("
                SELECT t.slug, t.name, t.status, t.expires_at, v.role
                FROM saas_tenant_viewers v
                JOIN saas_tenants t ON v.tenant_slug = t.slug
                WHERE v.email = ? AND v.status = 'active'
            ");
            $stmt2->execute([$email]);
            $viewed = $stmt2->fetchAll();

            $all_tenants = array_merge($owned, $viewed);

            _json(["ok" => true, "data" => $all_tenants]);
            break;

        // --- 1. TENANT ENDPOINTS ---
        case 'client_register':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = trim($body['slug'] ?? '');
            $name = trim($body['name'] ?? '');
            $email = trim($body['google_email'] ?? '');
            $token = trim($body['meta_token'] ?? '');
            $accounts = $body['ad_accounts'] ?? [];
            
            $plan = $body['plan'] ?? 'trial';
            
            if (!$slug || !$name || !$token) _json(["ok" => false, "error" => "Missing required fields"], 400);
            
            // VERIFY TOKEN TRƯỚC KHI TẠO
            $verify_url = "https://graph.facebook.com/v19.0/me?access_token=" . urlencode($token);
            $ch_v = curl_init();
            curl_setopt($ch_v, CURLOPT_URL, $verify_url);
            curl_setopt($ch_v, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch_v, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch_v, CURLOPT_TIMEOUT, 15);
            $v_res = curl_exec($ch_v);
            curl_close($ch_v);
            
            $v_data = json_decode($v_res, true);
            if (isset($v_data['error']) || !isset($v_data['id'])) {
                _json(["ok" => false, "error" => "Meta Token không hợp lệ hoặc đã hết hạn!"], 400);
            }

            $first_account = !empty($accounts) ? $accounts[0]['id'] : '';
            $accounts_json = json_encode($accounts);

            // Mặc định luôn tạo dự án mới ở trạng thái dùng thử 1 ngày
            $status = 'trial';
            $interval = '1 DAY';

            try {
                $stmt = $pdo->prepare("INSERT INTO saas_tenants (slug, name, google_email, meta_token, ad_account_id, ad_accounts, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL $interval))");
                $stmt->execute([$slug, $name, $email, $token, $first_account, $accounts_json, $status]);
                
                // Nếu người dùng chọn mua gói, tự động đẩy yêu cầu vào hệ thống duyệt của Admin
                if ($plan === '1_month' || $plan === '1_year') {
                    $phone = trim($body['phone'] ?? '');
                    $stmt2 = $pdo->prepare("INSERT INTO saas_renewal_requests (tenant_slug, plan, phone, email) VALUES (?, ?, ?, ?)");
                    $stmt2->execute([$slug, $plan, $phone, $email]);
                }

                _json(["ok" => true, "message" => "Workspace created", "slug" => $slug]);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    _json(["ok" => false, "error" => "Tên miền (slug) đã tồn tại. Vui lòng chọn tên khác."], 400);
                }
                throw $e;
            }
            break;

        case 'submit_renewal':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $plan = $body['plan'] ?? '';
            $phone = $body['phone'] ?? '';
            $email = $body['email'] ?? '';
            
            if (!$slug || !$plan || !$phone) _json(["ok" => false, "error" => "Vui lòng nhập đủ SĐT và Tên gói"], 400);
            
            $stmt = $pdo->prepare("INSERT INTO saas_renewal_requests (tenant_slug, plan, phone, email) VALUES (?, ?, ?, ?)");
            $stmt->execute([$slug, $plan, $phone, $email]);
            _json(["ok" => true]);
            break;

        case 'check_slug':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = trim($body['slug'] ?? '');
            if (!$slug) _json(["ok" => false, "error" => "Missing slug"], 400);

            $stmt = $pdo->prepare("SELECT id FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $exists = $stmt->fetch() ? true : false;
            
            _json(["ok" => true, "exists" => $exists]);
            break;

        case 'fetch_meta_accounts':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $token = $body['meta_token'] ?? '';
            if (!$token) _json(["ok" => false, "error" => "Missing token"], 400);

            // Fetch Businesses
            $b_url = "https://graph.facebook.com/v19.0/me/businesses?fields=id,name,client_ad_accounts{id,name,account_id}&limit=100&access_token=" . urlencode($token);
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $b_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);
            $b_res = curl_exec($ch);
            curl_close($ch);
            
            $b_data = json_decode($b_res, true);
            if (isset($b_data['error'])) {
                _json(["ok" => false, "error" => $b_data['error']['message'] ?? "Invalid Token"]);
            }

            // Also fetch personal ad accounts
            $a_url = "https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&limit=100&access_token=" . urlencode($token);
            $ch2 = curl_init();
            curl_setopt($ch2, CURLOPT_URL, $a_url);
            curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch2, CURLOPT_TIMEOUT, 15);
            $a_res = curl_exec($ch2);
            curl_close($ch2);
            $a_data = json_decode($a_res, true);

            $result = [
                'businesses' => $b_data['data'] ?? [],
                'personal_accounts' => $a_data['data'] ?? []
            ];
            
            _json(["ok" => true, "data" => $result]);
            break;

        case 'get_tenant':
            $slug = $_GET['slug'] ?? '';
            $email = $_GET['email'] ?? ''; // Optional, for soft security auth
            if (!$slug) _json(["ok" => false, "error" => "Missing slug"], 400);

            $stmt = $pdo->prepare("SELECT id, slug, name, google_email, status, expires_at, meta_token, ad_account_id, ad_accounts, brand_filter_enabled, is_public FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();

            if (!$tenant) _json(["ok" => false, "error" => "Tenant not found"], 404);

            $is_expired = false;
            if ($tenant['status'] === 'locked') {
                $is_expired = true;
            } elseif ($tenant['expires_at'] && strtotime($tenant['expires_at']) < time()) {
                $is_expired = true;
                if ($tenant['status'] !== 'expired') {
                    $pdo->prepare("UPDATE saas_tenants SET status = 'expired' WHERE slug = ?")->execute([$slug]);
                    $tenant['status'] = 'expired';
                }
            }
            $tenant['is_expired'] = $is_expired;

            // --- SECURITY CHECK ---
            // If the workspace is NOT public, and the user is NOT the owner, and NOT an active viewer
            // then we REMOVE the meta_token from the response to prevent unauthorized access.
            $is_authorized = false;
            if ($tenant['is_public'] == 1) {
                $is_authorized = true;
            } else if ($email) {
                if (strtolower($email) === strtolower($tenant['google_email'])) {
                    $is_authorized = true;
                } else {
                    $chk = $pdo->prepare("SELECT status FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ?");
                    $chk->execute([$slug, $email]);
                    $viewer = $chk->fetch();
                    if ($viewer && $viewer['status'] === 'active') {
                        $is_authorized = true;
                    }
                }
            }
            
            if (!$is_authorized) {
                // Return tenant info but without sensitive token
                $tenant['meta_token'] = null;
                $tenant['ad_account_id'] = null;
                $tenant['ad_accounts'] = null;
                $tenant['unauthorized'] = true;
            }

            _json(["ok" => true, "tenant" => $tenant]);
            break;

        case 'update_token':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $token = $body['token'] ?? '';
            if (!$slug || !$token) _json(["ok" => false, "error" => "Missing slug or token"], 400);

            $stmt = $pdo->prepare("UPDATE saas_tenants SET meta_token = ? WHERE slug = ?");
            $stmt->execute([$token, $slug]);
            
            if ($stmt->rowCount() > 0) {
                _json(["ok" => true, "message" => "Token updated"]);
            } else {
                _json(["ok" => false, "error" => "Tenant not found or token unchanged"], 404);
            }
            break;

        // --- 1.5. SAAS AUTH & SHARE ENDPOINTS ---
        case 'auth_check':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $email = $body['email'] ?? '';
            if (!$slug) _json(["ok" => false, "error" => "Missing slug"], 400);

            $stmt = $pdo->prepare("SELECT google_email, is_public, meta_token, ad_accounts FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            if (!$tenant) _json(["ok" => false, "error" => "Workspace không tồn tại"], 404);

            $is_super_admin = (strtolower($email) === 'dom.marketing.vn@gmail.com');
            $is_admin = (strtolower($email) === strtolower($tenant['google_email']));
            $is_public = $tenant['is_public'] == 1;

            if ($is_admin || $is_super_admin) {
                _json([
                    "ok" => true, 
                    "role" => "admin", 
                    "status" => "active", 
                    "is_public" => $is_public,
                    "meta_token" => $tenant['meta_token'],
                    "ad_accounts" => $tenant['ad_accounts']
                ]);
            }

            $vstmt = $pdo->prepare("SELECT role, status FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ?");
            $vstmt->execute([$slug, $email]);
            $viewer = $vstmt->fetch();

            if ($viewer) {
                $is_active = ($viewer['status'] === 'active');
                _json([
                    "ok" => true, 
                    "role" => $viewer['role'], 
                    "status" => $viewer['status'], 
                    "is_public" => $is_public,
                    "meta_token" => $is_active ? $tenant['meta_token'] : null,
                    "ad_accounts" => $is_active ? $tenant['ad_accounts'] : null
                ]);
            } else {
                _json(["ok" => true, "role" => "viewer", "status" => "none", "is_public" => $is_public]);
            }
            break;

        case 'auth_request':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $email = $body['email'] ?? '';
            $name = $body['name'] ?? '';
            $picture = $body['picture'] ?? '';
            if (!$slug || !$email) _json(["ok" => false, "error" => "Missing slug or email"], 400);

            $stmt = $pdo->prepare("INSERT INTO saas_tenant_viewers (tenant_slug, email, name, picture, role, status, request_at) VALUES (?, ?, ?, ?, 'viewer', 'request', NOW()) ON DUPLICATE KEY UPDATE name=?, picture=?, status='request', request_at=NOW()");
            $stmt->execute([$slug, $email, $name, $picture, $name, $picture]);
            _json(["ok" => true, "message" => "Đã gửi yêu cầu"]);
            break;

        case 'auth_get_users':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            
            $stmt = $pdo->prepare("SELECT google_email, is_public FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            
            if (!$tenant || strtolower($admin_email) !== strtolower($tenant['google_email'])) {
                _json(["ok" => false, "error" => "Chỉ Owner mới có quyền xem danh sách"], 403);
            }

            $ustmt = $pdo->prepare("SELECT email, name, picture, role, status, request_at, added_at FROM saas_tenant_viewers WHERE tenant_slug = ? ORDER BY added_at DESC");
            $ustmt->execute([$slug]);
            $users = $ustmt->fetchAll();

            $admin_user = [
                "email" => $tenant['google_email'],
                "name" => "Chủ sở hữu",
                "picture" => "",
                "role" => "admin",
                "status" => "active",
                "request_at" => null,
                "added_at" => null,
                "is_owner" => true
            ];
            
            array_unshift($users, $admin_user);

            _json(["ok" => true, "users" => $users, "is_public" => $tenant['is_public'] == 1]);
            break;

        case 'auth_update_user':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $target_email = $body['target_email'] ?? '';
            $action_type = $body['action_type'] ?? ''; // 'approve', 'reject', 'remove', 'role'
            $role = $body['role'] ?? 'viewer';

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            if (!$tenant || (strtolower($admin_email) !== strtolower($tenant['google_email']) && !$is_super_admin)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            if ($action_type === 'remove') {
                $pdo->prepare("DELETE FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ?")->execute([$slug, $target_email]);
            } else if ($action_type === 'approve') {
                $pdo->prepare("UPDATE saas_tenant_viewers SET status = 'active' WHERE tenant_slug = ? AND email = ?")->execute([$slug, $target_email]);
            } else if ($action_type === 'reject') {
                $pdo->prepare("UPDATE saas_tenant_viewers SET status = 'rejected' WHERE tenant_slug = ? AND email = ?")->execute([$slug, $target_email]);
            } else if ($action_type === 'role') {
                $pdo->prepare("UPDATE saas_tenant_viewers SET role = ? WHERE tenant_slug = ? AND email = ?")->execute([$role, $slug, $target_email]);
            } else if ($action_type === 'add') {
                // Direct add from admin
                $pdo->prepare("INSERT INTO saas_tenant_viewers (tenant_slug, email, role, status, request_at) VALUES (?, ?, ?, 'active', NOW()) ON DUPLICATE KEY UPDATE status='active', role=?")->execute([$slug, $target_email, $role, $role]);
            }
            _json(["ok" => true]);
            break;

        case 'auth_toggle_public':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $is_public = isset($body['is_public']) && $body['is_public'] ? 1 : 0;

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            if (!$tenant || (strtolower($admin_email) !== strtolower($tenant['google_email']) && !$is_super_admin)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            $pdo->prepare("UPDATE saas_tenants SET is_public = ? WHERE slug = ?")->execute([$is_public, $slug]);
            _json(["ok" => true]);
            break;

        case 'auth_update_accounts':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $ad_accounts = $body['ad_accounts'] ?? null;
            
            if (!$slug || $ad_accounts === null) _json(["ok" => false, "error" => "Missing data"], 400);

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            if (!$tenant || (strtolower($admin_email) !== strtolower($tenant['google_email']) && !$is_super_admin)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            $json_accounts = is_array($ad_accounts) ? json_encode($ad_accounts) : $ad_accounts;
            
            $updates = ["ad_accounts" => $json_accounts];
            $params = [$json_accounts];
            
            if (is_array($ad_accounts) && count($ad_accounts) > 0 && !empty($ad_accounts[0]['token'])) {
                $updates["meta_token"] = $ad_accounts[0]['token'];
                $params[] = $ad_accounts[0]['token'];
            }
            
            $params[] = $slug;
            
            if (isset($updates['meta_token'])) {
                $pdo->prepare("UPDATE saas_tenants SET ad_accounts = ?, meta_token = ? WHERE slug = ?")->execute($params);
            } else {
                $pdo->prepare("UPDATE saas_tenants SET ad_accounts = ? WHERE slug = ?")->execute($params);
            }
            
            _json(["ok" => true, "message" => "Cập nhật tài khoản thành công"]);
            break;

        // --- 2. ADMIN ENDPOINTS ---
        case 'admin_login':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $username = $body['username'] ?? '';
            $password = $body['password'] ?? '';
            
            $stmt = $pdo->prepare("SELECT id, password_hash, role FROM saas_users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                // Return secure JWT HMAC token
                $session_token = generate_admin_token(['user_id' => $user['id'], 'role' => $user['role']]);
                _json(["ok" => true, "token" => $session_token, "role" => $user['role']]);
            } else {
                _json(["ok" => false, "error" => "Invalid credentials"], 401);
            }
            break;

        case 'admin_get_tenants':
            // Verify admin token securely
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded) _json(["ok" => false, "error" => "Unauthorized"], 401);
            
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            
            $stmt = $pdo->prepare("SELECT id, slug, name, google_email, status, expires_at, ad_account_id, brand_filter_enabled, created_at FROM saas_tenants ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $tenants = $stmt->fetchAll();
            _json(["ok" => true, "tenants" => $tenants]);
            break;

        case 'admin_create_tenant':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded) _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);

            $slug = trim($body['slug'] ?? '');
            $name = trim($body['name'] ?? '');
            $ad_account_id = trim($body['ad_account_id'] ?? '');

            if (!$slug || !$name) _json(["ok" => false, "error" => "Missing slug or name"], 400);

            try {
                $stmt = $pdo->prepare("INSERT INTO saas_tenants (slug, name, ad_account_id, status, expires_at) VALUES (?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR))");
                $stmt->execute([$slug, $name, $ad_account_id]);
                _json(["ok" => true, "message" => "Tenant created successfully"]);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) { // Integrity constraint violation (Duplicate entry)
                    _json(["ok" => false, "error" => "Slug already exists"], 400);
                }
                throw $e;
            }
            break;

        case 'admin_update_tenant_status':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded) _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);

            $slug = $body['slug'] ?? '';
            $status = $body['status'] ?? ''; // 'trial', 'active', 'expired', 'locked'
            $add_days = (int)($body['add_days'] ?? 0);

            if (!$slug) _json(["ok" => false, "error" => "Missing slug"], 400);

            $updates = [];
            $params = [];

            if ($status) {
                $updates[] = "status = ?";
                $params[] = $status;
            }
            
            if ($add_days > 0) {
                // If it was expired, we add from NOW(). If it is active, we add from expires_at.
                // For simplicity, let's just add to expires_at if it exists and is > NOW, else add to NOW.
                $updates[] = "expires_at = IF(expires_at > NOW(), DATE_ADD(expires_at, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY))";
                $params[] = $add_days;
                $params[] = $add_days;
            }

            if (empty($updates)) _json(["ok" => false, "error" => "Nothing to update"], 400);

            $params[] = $slug;
            $stmt = $pdo->prepare("UPDATE saas_tenants SET " . implode(", ", $updates) . " WHERE slug = ?");
            $stmt->execute($params);

            _json(["ok" => true]);
            break;

        case 'admin_get_renewal_requests':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded) _json(["ok" => false, "error" => "Unauthorized"], 401);

            $stmt = $pdo->query("SELECT r.*, t.name as tenant_name FROM saas_renewal_requests r JOIN saas_tenants t ON r.tenant_slug = t.slug ORDER BY r.created_at DESC");
            $requests = $stmt->fetchAll();
            _json(["ok" => true, "requests" => $requests]);
            break;

        case 'admin_resolve_renewal':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded) _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            
            $id = $body['id'] ?? '';
            $status = $body['status'] ?? 'resolved';
            
            $stmt = $pdo->prepare("UPDATE saas_renewal_requests SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            _json(["ok" => true]);
            break;

        case 'admin_toggle_filter':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded) _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $enabled = isset($body['enabled']) ? (int)$body['enabled'] : 1;
            
            $stmt = $pdo->prepare("UPDATE saas_tenants SET brand_filter_enabled = ? WHERE slug = ?");
            $stmt->execute([$enabled, $slug]);
            _json(["ok" => true, "message" => "Filter toggled"]);
            break;

        // --- 3. AI REPORTS ENDPOINTS ---
        case 'ai_save':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $report = $body['report'] ?? [];
            if (!$slug || empty($report) || !isset($report['id'])) _json(["ok" => false, "error" => "Missing data"], 400);

            // Delete old if exists (overwrite)
            $stmt = $pdo->prepare("DELETE FROM saas_ai_reports WHERE tenant_slug = ? AND local_id = ?");
            $stmt->execute([$slug, $report['id']]);

            $stmt = $pdo->prepare("INSERT INTO saas_ai_reports (tenant_slug, local_id, timestamp, label, brand, dateRange, preview, html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $slug,
                $report['id'],
                $report['timestamp'] ?? '',
                $report['label'] ?? '',
                $report['brand'] ?? '',
                $report['dateRange'] ?? '',
                $report['preview'] ?? '',
                $report['html'] ?? ''
            ]);

            // Keep only max 20 per tenant
            $pdo->prepare("DELETE FROM saas_ai_reports WHERE tenant_slug = ? AND local_id NOT IN (SELECT local_id FROM (SELECT local_id FROM saas_ai_reports WHERE tenant_slug = ? ORDER BY local_id DESC LIMIT 20) foo)")->execute([$slug, $slug]);
            
            _json(["ok" => true]);
            break;

        case 'ai_list':
            $slug = $_GET['slug'] ?? $body['slug'] ?? '';
            if (!$slug) _json(["ok" => false, "error" => "Missing slug"], 400);

            $stmt = $pdo->prepare("SELECT local_id as id, timestamp, label, brand, dateRange, preview, html FROM saas_ai_reports WHERE tenant_slug = ? ORDER BY local_id DESC");
            $stmt->execute([$slug]);
            $reports = $stmt->fetchAll();
            _json(["ok" => true, "data" => $reports]);
            break;

        case 'ai_delete':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $local_id = $body['id'] ?? '';
            if (!$slug || !$local_id) _json(["ok" => false, "error" => "Missing data"], 400);

            $stmt = $pdo->prepare("DELETE FROM saas_ai_reports WHERE tenant_slug = ? AND local_id = ?");
            $stmt->execute([$slug, $local_id]);
            _json(["ok" => true]);
            break;

        case 'ai_generate':
            if ($method !== 'POST') _json(["ok" => false, "error" => "Method not allowed"], 405);
            $prompt = $body['prompt'] ?? '';
            if (empty($prompt)) _json(["ok" => false, "error" => "Missing 'prompt' field"], 400);

            if (mb_strlen($prompt) > 80000) {
                _json(["ok" => false, "error" => "Prompt quá dài"], 400);
            }
            
            if (!defined('GEMINI_API_KEY') || empty(GEMINI_API_KEY)) {
                _json(["ok" => false, "error" => "Chưa cấu hình GEMINI_API_KEY trên server"], 500);
            }

            $GEMINI_MODEL = "gemini-2.5-flash-lite";
            $GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{$GEMINI_MODEL}:generateContent?key=" . GEMINI_API_KEY;

            $payload = json_encode([
                "contents" => [
                    [
                        "role" => "user",
                        "parts" => [["text" => $prompt]]
                    ]
                ],
                "generationConfig" => [
                    "temperature" => 1.5,
                    "maxOutputTokens" => 16384,
                ]
            ]);

            $ch = curl_init($GEMINI_ENDPOINT);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
                CURLOPT_TIMEOUT => 120,
                CURLOPT_SSL_VERIFYPEER => true,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                _json(["ok" => false, "error" => "Lỗi kết nối tới Gemini: " . $curlError], 502);
            }

            $result = json_decode($response, true);

            if ($httpCode === 200 && isset($result['candidates'][0]['content']['parts'][0]['text'])) {
                _json([
                    "ok" => true,
                    "text" => $result['candidates'][0]['content']['parts'][0]['text']
                ]);
            } else {
                $errorMsg = $result['error']['message'] ?? "Gemini API error (HTTP {$httpCode})";
                if (!empty(GEMINI_API_KEY)) {
                    $errorMsg = str_replace(GEMINI_API_KEY, "[HIDDEN]", $errorMsg);
                }
                _json(["ok" => false, "error" => $errorMsg], $httpCode ?: 500);
            }
            break;

        default:
            _json(["ok" => false, "error" => "Unknown action"], 400);
            break;
    }
} catch (PDOException $e) {
    error_log($e->getMessage());
    _json(["ok" => false, "error" => "Database error"], 500);
}
