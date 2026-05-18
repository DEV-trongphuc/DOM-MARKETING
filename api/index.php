<?php
/**
 * DOM META SAAS - MAIN API ROUTER
 * (Separate from legacy index.php)
 */

// Allow CORS for local development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Connect DB

require_once 'db.php';

// Auto-migrate missing columns for smooth deployment
try {
    @$pdo->exec("ALTER TABLE saas_tenants ADD COLUMN brand_filter_enabled TINYINT(1) DEFAULT 1");
    @$pdo->exec("ALTER TABLE saas_tenants ADD COLUMN gemini_api_key VARCHAR(255) NULL");
    @$pdo->exec("ALTER TABLE saas_tenants ADD COLUMN ad_accounts JSON NULL");
    @$pdo->exec("ALTER TABLE saas_tenants ADD COLUMN is_public TINYINT(1) DEFAULT 0");
} catch (Throwable $e) {}


// Extract request
$method = $_SERVER['REQUEST_METHOD'];
$GLOBALS['raw_post_data'] = file_get_contents("php://input");
$body = json_decode($GLOBALS['raw_post_data'], true) ?: [];

// Helper
function _json($data, $status = 200)
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// JWT Helpers
function generate_admin_token($payload)
{
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + (86400 * 7); // 7 days expiration
    $b64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $b64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $b64Header . "." . $b64Payload, ADMIN_SECRET_KEY, true);
    $b64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return $b64Header . "." . $b64Payload . "." . $b64Signature;
}

function verify_admin_token($token)
{
    if (!$token)
        return false;
    $parts = explode('.', $token);
    if (count($parts) !== 3)
        return false;
    list($header, $payload, $signature) = $parts;

    $valid_signature = hash_hmac('sha256', $header . "." . $payload, ADMIN_SECRET_KEY, true);
    $b64ValidSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($valid_signature));

    if (hash_equals($b64ValidSignature, $signature)) {
        $decoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        if (isset($decoded['exp']) && $decoded['exp'] < time())
            return false;
        return $decoded;
    }
    return false;
}

// Fire-and-forget Email Webhook using cURL
function _send_webhook_email($payload)
{
    if (!defined('WEBHOOK_EMAIL_URL') || !WEBHOOK_EMAIL_URL)
        return;
    $ch = curl_init(WEBHOOK_EMAIL_URL);
    $payload_json = json_encode($payload);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload_json,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT_MS => 1500, // Short timeout to avoid blocking frontend
        CURLOPT_NOSIGNAL => 1
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// Basic Routing
$action = $_GET['action'] ?? $body['action'] ?? '';

// ── Rate Limiter ─────────────────────────────────────────────────────────────
// Simple IP-based rate limiter using DB to prevent spam/brute-force.
function _check_rate_limit(PDO $pdo, string $ip, int $limit = RATE_LIMIT_MAX_REQUESTS, int $window = RATE_LIMIT_WINDOW): void
{
    try {
        // Cleanup old entries first
        $pdo->prepare("DELETE FROM saas_rate_limits WHERE created_at < DATE_SUB(NOW(), INTERVAL ? SECOND)")->execute([$window]);
        // Count requests from this IP in current window
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM saas_rate_limits WHERE ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)");
        $stmt->execute([$ip, $window]);
        $row = $stmt->fetch();
        if ($row && $row['cnt'] >= $limit) {
            _json(["ok" => false, "error" => "Quá nhiều yêu cầu. Vui lòng thử lại sau " . $window . " giây."], 429);
        }
        // Record this request
        $pdo->prepare("INSERT INTO saas_rate_limits (ip, action, created_at) VALUES (?, ?, NOW())")->execute([$ip, 'request']);
    } catch (Exception $e) {
        // If rate limit table doesn't exist, skip silently (non-blocking)
    }
}

// ── Admin Email Verifier ──────────────────────────────────────────────────────
// Returns true if $email owns or is super-admin of $slug tenant.
function _verify_admin_for_slug(PDO $pdo, string $slug, string $admin_email): bool
{
    if (!$slug || !$admin_email)
        return false;
    $is_super = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
    if ($is_super)
        return true;
    $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
    $stmt->execute([$slug]);
    $tenant = $stmt->fetch();
    if ($tenant && strtolower($admin_email) === strtolower($tenant['google_email'])) {
        return true;
    }
    // Allow invited admins
    $vstmt = $pdo->prepare("SELECT role FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ? AND status = 'active'");
    $vstmt->execute([$slug, $admin_email]);
    $viewer = $vstmt->fetch();
    if ($viewer && $viewer['role'] === 'admin') {
        return true;
    }
    return false;
}

// Returns true if $email is an active member (owner or viewer) of $slug tenant AND tenant is not expired.
function _verify_tenant_member(PDO $pdo, string $slug, string $email): bool
{
    if (!$slug || !$email)
        return false;
    // Super admin always passes
    if (strtolower($email) === 'dom.marketing.vn@gmail.com')
        return true;
    // Check owner and tenant expiry
    $stmt = $pdo->prepare("SELECT google_email, status, expires_at FROM saas_tenants WHERE slug = ?");
    $stmt->execute([$slug]);
    $tenant = $stmt->fetch();
    if (!$tenant)
        return false;

    // Reject if expired or locked
    if ($tenant['status'] === 'locked' || ($tenant['expires_at'] && strtotime($tenant['expires_at']) < time())) {
        return false;
    }

    if (strtolower($email) === strtolower($tenant['google_email']))
        return true;

    // Check active viewer
    $vstmt = $pdo->prepare("SELECT status FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ? AND status = 'active'");
    $vstmt->execute([$slug, $email]);
    return $vstmt->fetch() !== false;
}

try {
    switch ($action) {
        // --- 1. SAAS CLIENT API (For End Users) ---
        case 'get_user_tenants':
            $email = $_GET['email'] ?? $body['email'] ?? '';
            if (!$email)
                _json(["ok" => false, "error" => "Missing email"], 400);

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
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = trim($body['slug'] ?? '');
            $name = trim($body['name'] ?? '');
            $email = trim($body['google_email'] ?? '');
            $token = trim($body['meta_token'] ?? '');
            $accounts = $body['ad_accounts'] ?? [];

            $plan = $body['plan'] ?? 'trial';

            if (!$slug || !$name || !$token)
                _json(["ok" => false, "error" => "Missing required fields"], 400);

            if (strlen($slug) > 20) {
                _json(["ok" => false, "error" => "Slug cannot exceed 20 characters"], 400);
            }

            // Chặn các slug dành riêng cho hệ thống
            $reserved_slugs = ['admin', 'register', 'workspaces', 'api', 'assets', 'css', 'js', 'lib', 'server'];
            if (in_array(strtolower($slug), $reserved_slugs)) {
                _json(["ok" => false, "error" => "Tên miền (slug) này được hệ thống bảo lưu. Vui lòng chọn tên khác."], 400);
            }

            // KIỂM TRA EMAIL ĐÃ TẠO WORKSPACE CHƯA (Mỗi email chỉ được 1 lần dùng thử)
            if ($plan === 'trial' && $email && $email !== 'dom.marketing.vn@gmail.com') {
                $check_email = $pdo->prepare("SELECT id FROM saas_tenants WHERE google_email = ?");
                $check_email->execute([$email]);
                if ($check_email->fetch()) {
                    _json(["ok" => false, "error" => "Tài khoản của bạn đã sử dụng quyền dùng thử. Để tạo thêm Workspace mới, vui lòng chọn gói trả phí!"], 403);
                }
            }

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

            // Mặc định luôn tạo dự án mới ở trạng thái dùng thử 1 tháng
            $status = 'trial';
            $interval = '1 MONTH';

            try {
                $stmt = $pdo->prepare("INSERT INTO saas_tenants (slug, name, google_email, meta_token, ad_account_id, ad_accounts, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL $interval))");
                $stmt->execute([$slug, $name, $email, $token, $first_account, $accounts_json, $status]);

                // Nếu người dùng chọn mua gói, tự động đẩy yêu cầu vào hệ thống duyệt của Admin
                if ($plan === '1_month' || $plan === '1_year') {
                    $phone = trim($body['phone'] ?? '');
                    $stmt2 = $pdo->prepare("INSERT INTO saas_renewal_requests (tenant_slug, plan, phone, email) VALUES (?, ?, ?, ?)");
                    $stmt2->execute([$slug, $plan, $phone, $email]);
                }

                $stmt_exp = $pdo->prepare("SELECT expires_at FROM saas_tenants WHERE slug = ?");
                $stmt_exp->execute([$slug]);
                $t_exp = $stmt_exp->fetch();
                $expires_at_str = $t_exp ? date('H:i d/m/Y', strtotime($t_exp['expires_at'])) : '';

                // Bắn mail Welcome
                _send_webhook_email([
                    'type' => 'register',
                    'email' => $email,
                    'name' => $name,
                    'slug' => $slug,
                    'expires_at' => $expires_at_str
                ]);

                _json(["ok" => true, "message" => "Workspace created", "slug" => $slug]);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    _json(["ok" => false, "error" => "Tên miền (slug) đã tồn tại. Vui lòng chọn tên khác."], 400);
                }
                throw $e;
            }
            break;

        case 'submit_renewal':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $plan = $body['plan'] ?? '';
            $phone = $body['phone'] ?? '';
            $email = $body['email'] ?? '';

            if (!$slug || !$plan || !$phone)
                _json(["ok" => false, "error" => "Vui lòng nhập đủ SĐT và Tên gói"], 400);

            $stmt = $pdo->prepare("INSERT INTO saas_renewal_requests (tenant_slug, plan, phone, email) VALUES (?, ?, ?, ?)");
            $stmt->execute([$slug, $plan, $phone, $email]);

            $tstmt = $pdo->prepare("SELECT name FROM saas_tenants WHERE slug = ?");
            $tstmt->execute([$slug]);
            $t = $tstmt->fetch();

            // Bắn mail Xin gia hạn
            _send_webhook_email([
                'type' => 'renewal',
                'email' => $email,
                'name' => $t ? $t['name'] : 'Quý khách',
                'slug' => $slug,
                'plan' => $plan
            ]);

            _json(["ok" => true]);
            break;

        case 'check_slug':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = trim($body['slug'] ?? '');
            if (!$slug || strlen($slug) > 20)
                _json(["ok" => false, "error" => "Invalid slug"], 400);

            $reserved_slugs = ['admin', 'register', 'workspaces', 'api', 'assets', 'css', 'js', 'lib', 'server'];
            if (in_array(strtolower($slug), $reserved_slugs)) {
                _json(["ok" => true, "exists" => true]); // Treat reserved as "exists" so client UI shows error
            }

            $stmt = $pdo->prepare("SELECT id FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $exists = $stmt->fetch() ? true : false;

            _json(["ok" => true, "exists" => $exists]);
            break;

        case 'fetch_meta_accounts':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $token = $body['meta_token'] ?? '';
            if (!$token)
                _json(["ok" => false, "error" => "Missing token"], 400);

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
            // Some tokens don't have business_management permission, so ignore (#100) error
            if (isset($b_data['error'])) {
                $b_data['data'] = [];
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

            // If both failed or returned no data, but we had an error on adaccounts fetch, report that error
            if (empty($result['businesses']) && empty($result['personal_accounts']) && isset($a_data['error'])) {
                _json(["ok" => false, "error" => $a_data['error']['message'] ?? "Invalid Token or Missing permissions (ads_read)"]);
            }

            _json(["ok" => true, "data" => $result]);
            break;

        case 'get_tenant':
            $slug = $_GET['slug'] ?? '';
            $email = $_GET['email'] ?? ''; // Optional, for soft security auth
            if (!$slug)
                _json(["ok" => false, "error" => "Missing slug"], 400);

            $stmt = $pdo->prepare("SELECT id, slug, name, google_email, status, expires_at, meta_token, gemini_api_key, ad_account_id, ad_accounts, brand_filter_enabled, is_public FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();

            if (!$tenant)
                _json(["ok" => false, "error" => "Tenant not found"], 404);

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
            $is_super_admin = false;

            // Check if request comes from Super Admin
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            if ($tenant['is_public'] == 1 || $is_super_admin) {
                $is_authorized = true;
            } else if ($email) {
                if (strtolower($email) === strtolower($tenant['google_email']) || strtolower($email) === 'dom.marketing.vn@gmail.com') {
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

            // --- EXPIRY CHECK ---
            // Nếu đã hết hạn hoặc bị khóa, không trả về token để bắt buộc phải gia hạn
            if ($is_expired) {
                $is_authorized = false;
            }

            if (!$is_authorized) {
                // Return tenant info but without sensitive token
                $tenant['meta_token'] = null;
                $tenant['gemini_api_key'] = null;
                $tenant['ad_account_id'] = null;
                $tenant['ad_accounts'] = null;
                $tenant['unauthorized'] = true;
            }

            _json(["ok" => true, "tenant" => $tenant]);
            break;

        case 'update_token':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $token = $body['token'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            if (!$slug || !$token)
                _json(["ok" => false, "error" => "Missing slug or token"], 400);
            // 🔒 Phải là owner hoặc super admin mới được update token
            if (!_verify_admin_for_slug($pdo, $slug, $admin_email)) {
                _json(["ok" => false, "error" => "Unauthorized — chỉ Admin mới được cập nhật token"], 403);
            }

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
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $email = $body['email'] ?? '';
            if (!$slug)
                _json(["ok" => false, "error" => "Missing slug"], 400);

            $stmt = $pdo->prepare("SELECT google_email, is_public, meta_token, gemini_api_key, ad_accounts, status, expires_at FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            if (!$tenant)
                _json(["ok" => false, "error" => "Workspace không tồn tại"], 404);

            $is_super_admin = (strtolower($email) === 'dom.marketing.vn@gmail.com');

            // Check if request comes from Super Admin via token
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            $is_admin = (strtolower($email) === strtolower($tenant['google_email']));
            $is_public = $tenant['is_public'] == 1;

            // Expiry check
            $is_expired = false;
            if ($tenant['status'] === 'locked') {
                $is_expired = true;
            } elseif ($tenant['expires_at'] && strtotime($tenant['expires_at']) < time()) {
                $is_expired = true;
            }

            // Strip tokens if expired
            $safe_token = $is_expired ? null : $tenant['meta_token'];
            $safe_accounts = $is_expired ? null : $tenant['ad_accounts'];
            $safe_gemini = $tenant['gemini_api_key']; // Always return if admin

            if ($is_admin || $is_super_admin) {
                _json([
                    "ok" => true,
                    "role" => "admin",
                    "status" => "active",
                    "is_public" => $is_public,
                    "meta_token" => $safe_token,
                    "gemini_api_key" => $safe_gemini,
                    "ad_accounts" => $safe_accounts,
                    "is_expired" => $is_expired
                ]);
            }

            $name = $body['name'] ?? '';
            $picture = $body['picture'] ?? '';

            $vstmt = $pdo->prepare("SELECT role, status, last_login FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ?");
            $vstmt->execute([$slug, $email]);
            $viewer = $vstmt->fetch();

            if ($viewer) {
                // Throttle last_login update to every 15 minutes to reduce DB write load
                $last_login_time = !empty($viewer['last_login']) ? strtotime($viewer['last_login']) : 0;
                $should_update_login = (time() - $last_login_time > 900); // 900s = 15m

                if ($name && $picture) {
                    $upd = $pdo->prepare("UPDATE saas_tenant_viewers SET name = ?, picture = ?, last_login = NOW() WHERE tenant_slug = ? AND email = ?");
                    $upd->execute([$name, $picture, $slug, $email]);
                } else if ($should_update_login) {
                    $upd = $pdo->prepare("UPDATE saas_tenant_viewers SET last_login = NOW() WHERE tenant_slug = ? AND email = ?");
                    $upd->execute([$slug, $email]);
                }

                $is_active = ($viewer['status'] === 'active');
                _json([
                    "ok" => true,
                    "role" => $viewer['role'],
                    "status" => $viewer['status'],
                    "is_public" => $is_public,
                    "meta_token" => ($is_active && !$is_expired) ? $safe_token : null,
                    "gemini_api_key" => ($is_active && !$is_expired) ? $safe_gemini : null,
                    "ad_accounts" => ($is_active && !$is_expired) ? $safe_accounts : null,
                    "is_expired" => $is_expired
                ]);
            } else {
                _json(["ok" => true, "role" => "viewer", "status" => "none", "is_public" => $is_public, "is_expired" => $is_expired]);
            }
            break;

        case 'auth_request':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            // 🔒 Rate limit: tối đa 10 request access per IP per phút
            $client_ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            _check_rate_limit($pdo, $client_ip, 10, 60);
            $slug = $body['slug'] ?? '';
            $email = $body['email'] ?? '';
            $name = $body['name'] ?? '';
            $picture = $body['picture'] ?? '';
            if (!$slug || !$email)
                _json(["ok" => false, "error" => "Missing slug or email"], 400);

            $stmt = $pdo->prepare("INSERT INTO saas_tenant_viewers (tenant_slug, email, name, picture, role, status, request_at) VALUES (?, ?, ?, ?, 'viewer', 'request', NOW()) ON DUPLICATE KEY UPDATE name=?, picture=?, status='request', request_at=NOW()");
            $stmt->execute([$slug, $email, $name, $picture, $name, $picture]);
            _json(["ok" => true, "message" => "Đã gửi yêu cầu"]);
            break;

        case 'auth_get_users':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';

            $stmt = $pdo->prepare("SELECT google_email, is_public FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();

            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            
            // Check if request comes from Super Admin via token
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            $is_owner = ($tenant && strtolower($admin_email) === strtolower($tenant['google_email']));
            $is_member = false;
            if (!$is_owner && !$is_super_admin && $tenant) {
                $vstmt = $pdo->prepare("SELECT status FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ? AND status = 'active'");
                $vstmt->execute([$slug, $admin_email]);
                if ($vstmt->fetch()) {
                    $is_member = true;
                }
            }

            if (!$tenant || (!$is_owner && !$is_super_admin && !$is_member && !$tenant['is_public'])) {
                _json(["ok" => false, "error" => "Bạn không có quyền xem danh sách"], 403);
            }


            $ustmt = $pdo->prepare("SELECT email, name, picture, role, status, request_at, added_at, last_login FROM saas_tenant_viewers WHERE tenant_slug = ? ORDER BY added_at DESC");
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
                "last_login" => null,
                "is_owner" => true
            ];

            array_unshift($users, $admin_user);

            _json(["ok" => true, "users" => $users, "is_public" => $tenant['is_public'] == 1]);
            break;

        case 'auth_update_user':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $target_email = $body['target_email'] ?? '';
            $action_type = $body['action_type'] ?? ''; // 'approve', 'reject', 'remove', 'role'
            $role = $body['role'] ?? 'viewer';

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            
            // Check if request comes from Super Admin via token
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            $is_owner = !empty($admin_email) && !empty($tenant['google_email']) && strtolower($admin_email) === strtolower($tenant['google_email']);
            if (!$tenant || (!$is_owner && !$is_super_admin)) {
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
                // Check if user already exists
                $chk = $pdo->prepare("SELECT status FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ?");
                $chk->execute([$slug, $target_email]);
                $existing = $chk->fetch();

                if ($existing) {
                    if ($existing['status'] === 'active' || $existing['status'] === 'request') {
                        _json(["ok" => false, "error" => "Thành viên này đã có trong danh sách."], 400);
                    } else {
                        $pdo->prepare("UPDATE saas_tenant_viewers SET status='active', role=? WHERE tenant_slug=? AND email=?")->execute([$role, $slug, $target_email]);
                        $send_email = true;
                    }
                } else {
                    $pdo->prepare("INSERT INTO saas_tenant_viewers (tenant_slug, email, role, status, request_at) VALUES (?, ?, ?, 'active', NOW())")->execute([$slug, $target_email, $role]);
                    $send_email = true;
                }

                if (isset($send_email)) {
                    _send_webhook_email([
                        "type" => "invite",
                        "email" => $target_email,
                        "inviter_email" => $admin_email ? $admin_email : 'Admin',
                        "slug" => $slug,
                        "role" => $role
                    ]);
                }
            }
            _json(["ok" => true]);
            break;

        case 'auth_toggle_public':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $is_public = isset($body['is_public']) && $body['is_public'] ? 1 : 0;

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            
            // Check if request comes from Super Admin via token
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            $is_owner = !empty($admin_email) && !empty($tenant['google_email']) && strtolower($admin_email) === strtolower($tenant['google_email']);
            if (!$tenant || (!$is_owner && !$is_super_admin)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            $pdo->prepare("UPDATE saas_tenants SET is_public = ? WHERE slug = ?")->execute([$is_public, $slug]);
            _json(["ok" => true]);
            break;

        case 'auth_update_accounts':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $ad_accounts = $body['ad_accounts'] ?? null;

            if (!$slug || $ad_accounts === null)
                _json(["ok" => false, "error" => "Missing data"], 400);

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            
            // Check if request comes from Super Admin via token
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            $is_owner = !empty($admin_email) && !empty($tenant['google_email']) && strtolower($admin_email) === strtolower($tenant['google_email']);
            
            $is_invited_admin = false;
            if (!$is_owner && !$is_super_admin && $tenant) {
                $vstmt = $pdo->prepare("SELECT role FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ? AND status = 'active'");
                $vstmt->execute([$slug, $admin_email]);
                $viewer = $vstmt->fetch();
                if ($viewer && $viewer['role'] === 'admin') {
                    $is_invited_admin = true;
                }
            }

            if (!$tenant || (!$is_owner && !$is_super_admin && !$is_invited_admin)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            $json_accounts = is_array($ad_accounts) ? json_encode($ad_accounts) : $ad_accounts;

            // Lấy account đầu tiên trong danh sách để đặt làm default ad_account_id
            $first_account_id = '';
            if (is_array($ad_accounts) && count($ad_accounts) > 0) {
                $first = $ad_accounts[0];
                if (isset($first['accounts']) && count($first['accounts']) > 0) {
                    // Multi-token format: [{token, accounts: [{id, name}]}]
                    $first_account_id = $first['accounts'][0]['id'] ?? '';
                } elseif (isset($first['id'])) {
                    // Legacy flat format: [{id, name}]
                    $first_account_id = $first['id'];
                }
                // Also sync meta_token if multi-token format
                if (!empty($first['token'])) {
                    $pdo->prepare("UPDATE saas_tenants SET ad_accounts = ?, meta_token = ?, ad_account_id = ? WHERE slug = ?")
                        ->execute([$json_accounts, $first['token'], $first_account_id, $slug]);
                    _json(["ok" => true, "message" => "Cập nhật tài khoản thành công"]);
                    break;
                }
            }

            $pdo->prepare("UPDATE saas_tenants SET ad_accounts = ?, ad_account_id = ? WHERE slug = ?")
                ->execute([$json_accounts, $first_account_id, $slug]);

            _json(["ok" => true, "message" => "Cập nhật tài khoản thành công"]);
            break;

        
        case 'auth_transfer_owner':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $new_owner_email = $body['new_owner_email'] ?? '';

            if (!$slug || !$new_owner_email)
                _json(["ok" => false, "error" => "Missing data"], 400);

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            
            // Check if request comes from Super Admin via token
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            $is_owner = !empty($admin_email) && !empty($tenant['google_email']) && strtolower($admin_email) === strtolower($tenant['google_email']);
            if (!$tenant || (!$is_owner && !$is_super_admin)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            try {
                $pdo->beginTransaction();
                
                // 1. Update saas_tenants google_email
                $pdo->prepare("UPDATE saas_tenants SET google_email = ? WHERE slug = ?")->execute([$new_owner_email, $slug]);
                
                // 2. Remove the new owner from viewers (since they are now the owner)
                $pdo->prepare("DELETE FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ?")->execute([$slug, $new_owner_email]);
                
                // 3. Demote old owner to viewer (if not super admin)
                if (!empty($tenant['google_email'])) {
                    $stmt2 = $pdo->prepare("INSERT INTO saas_tenant_viewers (tenant_slug, email, name, role, status, request_at) VALUES (?, ?, ?, 'viewer', 'active', NOW()) ON DUPLICATE KEY UPDATE role='viewer', status='active'");
                    $stmt2->execute([$slug, $tenant['google_email'], $tenant['google_email']]);
                }
                
                $pdo->commit();
                _json(["ok" => true, "message" => "Chuyển quyền thành công"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                _json(["ok" => false, "error" => "Database error"], 500);
            }
            break;

        case 'auth_update_settings':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            $gemini_api_key = $body['gemini_api_key'] ?? '';

            if (!$slug)
                _json(["ok" => false, "error" => "Missing data"], 400);

            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $tenant = $stmt->fetch();
            $is_super_admin = (strtolower($admin_email) === 'dom.marketing.vn@gmail.com');
            
            // Check if request comes from Super Admin via token
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            $is_owner = !empty($admin_email) && !empty($tenant['google_email']) && strtolower($admin_email) === strtolower($tenant['google_email']);
            if (!$tenant || (!$is_owner && !$is_super_admin)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            $pdo->prepare("UPDATE saas_tenants SET gemini_api_key = ? WHERE slug = ?")
                ->execute([$gemini_api_key, $slug]);

            _json(["ok" => true, "message" => "Cập nhật cài đặt thành công"]);
            break;

        case 'auth_load_dashboard_settings':
            $slug = $_GET['slug'] ?? $body['slug'] ?? '';
            $account_id = $_GET['account_id'] ?? $body['account_id'] ?? '';
            $email = $_GET['email'] ?? $body['email'] ?? '';
            
            if (!$slug || !$account_id || !$email) _json(["ok" => false, "error" => "Missing data"], 400);
            if (!_verify_tenant_member($pdo, $slug, $email)) _json(["ok" => false, "error" => "Unauthorized"], 403);
            
            $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM saas_tenant_settings WHERE tenant_slug = ? AND account_id = ?");
            $stmt->execute([$slug, $account_id]);
            $settings = [];
            while($row = $stmt->fetch()) {
                $settings[$row['setting_key']] = json_decode($row['setting_value'], true);
            }
            _json(["ok" => true, "settings" => $settings]);
            break;

        case 'auth_save_dashboard_settings':
            if ($method !== 'POST') _json(["ok" => false], 405);
            $slug = $body['slug'] ?? '';
            $account_id = $body['account_id'] ?? '';
            $email = $body['email'] ?? '';
            $setting_key = $body['setting_key'] ?? '';
            $setting_value = $body['setting_value'] ?? null;
            
            if (!$slug || !$account_id || !$email || !$setting_key) _json(["ok" => false], 400);
            if (!_verify_tenant_member($pdo, $slug, $email)) _json(["ok" => false, "error" => "Unauthorized"], 403);
            
            $stmt = $pdo->prepare("SELECT google_email FROM saas_tenants WHERE slug = ?");
            $stmt->execute([$slug]);
            $t = $stmt->fetch();
            $is_owner = ($t && strtolower($email) === strtolower($t['google_email']));
            $is_super = (strtolower($email) === 'dom.marketing.vn@gmail.com');
            
            $vstmt = $pdo->prepare("SELECT role FROM saas_tenant_viewers WHERE tenant_slug = ? AND email = ? AND status = 'active'");
            $vstmt->execute([$slug, $email]);
            $viewer = $vstmt->fetch();
            $is_admin = ($viewer && $viewer['role'] === 'admin');
            
            if (!$is_owner && !$is_super && !$is_admin) {
                _json(["ok" => false, "error" => "Only owner or admin can update settings"], 403);
            }
            
            $json_val = json_encode($setting_value, JSON_UNESCAPED_UNICODE);
            $stmt = $pdo->prepare("
                INSERT INTO saas_tenant_settings (tenant_slug, account_id, setting_key, setting_value) 
                VALUES (?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            ");
            $stmt->execute([$slug, $account_id, $setting_key, $json_val]);
            
            _json(["ok" => true]);
            break;

        // --- 2. ADMIN ENDPOINTS ---
        case 'admin_login':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
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
            if (!$decoded)
                _json(["ok" => false, "error" => "Unauthorized"], 401);

            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;

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
            if (!$decoded)
                _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);

            $slug = trim($body['slug'] ?? '');
            $name = trim($body['name'] ?? '');
            $ad_account_id = trim($body['ad_account_id'] ?? '');

            if (!$slug || !$name)
                _json(["ok" => false, "error" => "Missing slug or name"], 400);

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

        case 'admin_delete_tenant':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $admin_email = $body['admin_email'] ?? '';
            
            $is_super_admin = false;
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader) {
                $token = str_replace('Bearer ', '', $authHeader);
                if (verify_admin_token($token)) {
                    $is_super_admin = true;
                }
            }

            if (!$is_super_admin && !_verify_admin_for_slug($pdo, $slug, $admin_email)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            if (!$slug) {
                _json(["ok" => false, "error" => "Missing slug"], 400);
            }

            try {
                $pdo->beginTransaction();
                $pdo->prepare("DELETE FROM saas_tenant_viewers WHERE tenant_slug = ?")->execute([$slug]);
                $pdo->prepare("DELETE FROM saas_renewal_requests WHERE tenant_slug = ?")->execute([$slug]);
                $pdo->prepare("DELETE FROM saas_ai_reports WHERE tenant_slug = ?")->execute([$slug]);
                $pdo->prepare("DELETE FROM saas_tenants WHERE slug = ?")->execute([$slug]);
                $pdo->commit();
                _json(["ok" => true, "message" => "Tenant deleted successfully"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                _json(["ok" => false, "error" => "Delete failed"], 500);
            }
            break;

        case 'admin_update_tenant_status':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded)
                _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);

            $slug = $body['slug'] ?? '';
            $status = $body['status'] ?? ''; // 'trial', 'active', 'expired', 'locked'
            $add_days = (int) ($body['add_days'] ?? 0);

            if (!$slug)
                _json(["ok" => false, "error" => "Missing slug"], 400);

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

            if (empty($updates))
                _json(["ok" => false, "error" => "Nothing to update"], 400);

            $params[] = $slug;
            $stmt = $pdo->prepare("UPDATE saas_tenants SET " . implode(", ", $updates) . " WHERE slug = ?");
            $stmt->execute($params);

            $skip_email = !empty($body['skip_email']);

            // Bắn mail nếu cộng ngày thành công và không chọn skip
            if ($add_days > 0 && !$skip_email) {
                $tstmt = $pdo->prepare("SELECT name, google_email, expires_at FROM saas_tenants WHERE slug = ?");
                $tstmt->execute([$slug]);
                $t = $tstmt->fetch();
                if ($t && $t['google_email']) {
                    _send_webhook_email([
                        'type' => 'upgrade',
                        'email' => $t['google_email'],
                        'name' => $t['name'],
                        'slug' => $slug,
                        'expires_at' => date('H:i d/m/Y', strtotime($t['expires_at'])),
                        'add_days' => $add_days
                    ]);
                }
            }

            _json(["ok" => true]);
            break;

        case 'admin_get_renewal_requests':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded)
                _json(["ok" => false, "error" => "Unauthorized"], 401);

            $stmt = $pdo->query("SELECT r.*, t.name as tenant_name FROM saas_renewal_requests r JOIN saas_tenants t ON r.tenant_slug = t.slug ORDER BY r.created_at DESC");
            $requests = $stmt->fetchAll();
            _json(["ok" => true, "requests" => $requests]);
            break;

        case 'admin_resolve_renewal':
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            $decoded = verify_admin_token($token);
            if (!$decoded)
                _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);

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
            if (!$decoded)
                _json(["ok" => false, "error" => "Unauthorized"], 401);
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $enabled = isset($body['enabled']) ? (int) $body['enabled'] : 1;

            $stmt = $pdo->prepare("UPDATE saas_tenants SET brand_filter_enabled = ? WHERE slug = ?");
            $stmt->execute([$enabled, $slug]);
            _json(["ok" => true, "message" => "Filter toggled"]);
            break;

        // --- 3. AI REPORTS ENDPOINTS ---
        case 'ai_save':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $account_id = $body['account_id'] ?? '';
            $report = $body['report'] ?? [];
            $user_email = $body['user_email'] ?? '';
            if (!$slug || !$account_id || empty($report) || !isset($report['id']))
                _json(["ok" => false, "error" => "Missing data"], 400);
            // 🔒 Chỉ active member của tenant mới được lưu báo cáo AI
            if (!_verify_tenant_member($pdo, $slug, $user_email)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            // Delete old if exists (overwrite)
            $stmt = $pdo->prepare("DELETE FROM saas_ai_reports WHERE tenant_slug = ? AND account_id = ? AND local_id = ?");
            $stmt->execute([$slug, $account_id, $report['id']]);

            $stmt = $pdo->prepare("INSERT INTO saas_ai_reports (tenant_slug, account_id, local_id, timestamp, label, brand, dateRange, preview, html) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $slug,
                $account_id,
                $report['id'],
                $report['timestamp'] ?? '',
                $report['label'] ?? '',
                $report['brand'] ?? '',
                $report['dateRange'] ?? '',
                $report['preview'] ?? '',
                $report['html'] ?? ''
            ]);

            // Keep only max 20 per tenant + account
            $pdo->prepare("DELETE FROM saas_ai_reports WHERE tenant_slug = ? AND account_id = ? AND local_id NOT IN (SELECT local_id FROM (SELECT local_id FROM saas_ai_reports WHERE tenant_slug = ? AND account_id = ? ORDER BY local_id DESC LIMIT 20) foo)")->execute([$slug, $account_id, $slug, $account_id]);

            _json(["ok" => true]);
            break;

        case 'ai_list':
            $slug = $_GET['slug'] ?? $body['slug'] ?? '';
            $account_id = $_GET['account_id'] ?? $body['account_id'] ?? '';
            if (!$slug || !$account_id)
                _json(["ok" => false, "error" => "Missing data"], 400);

            $stmt = $pdo->prepare("SELECT local_id as id, timestamp, label, brand, dateRange, preview, html FROM saas_ai_reports WHERE tenant_slug = ? AND account_id = ? ORDER BY local_id DESC");
            $stmt->execute([$slug, $account_id]);
            $reports = $stmt->fetchAll();
            _json(["ok" => true, "data" => $reports]);
            break;

        case 'ai_delete':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $slug = $body['slug'] ?? '';
            $account_id = $body['account_id'] ?? '';
            $local_id = $body['id'] ?? '';
            $user_email = $body['user_email'] ?? '';
            if (!$slug || !$account_id || !$local_id)
                _json(["ok" => false, "error" => "Missing data"], 400);
            // 🔒 Chỉ active member mới được xóa báo cáo
            if (!_verify_tenant_member($pdo, $slug, $user_email)) {
                _json(["ok" => false, "error" => "Unauthorized"], 403);
            }

            $stmt = $pdo->prepare("DELETE FROM saas_ai_reports WHERE tenant_slug = ? AND account_id = ? AND local_id = ?");
            $stmt->execute([$slug, $account_id, $local_id]);
            _json(["ok" => true]);
            break;

        case 'ai_generate':
            if ($method !== 'POST')
                _json(["ok" => false, "error" => "Method not allowed"], 405);
            $prompt = $body['prompt'] ?? '';
            if (empty($prompt))
                _json(["ok" => false, "error" => "Missing 'prompt' field"], 400);

            if (mb_strlen($prompt) > 80000) {
                _json(["ok" => false, "error" => "Prompt quá dài"], 400);
            }

            $slug = $body['slug'] ?? '';
            $active_api_key = '';

            if ($slug) {
                $stmt = $pdo->prepare("SELECT gemini_api_key FROM saas_tenants WHERE slug = ?");
                $stmt->execute([$slug]);
                $tenant = $stmt->fetch();
                if ($tenant && !empty($tenant['gemini_api_key'])) {
                    $active_api_key = $tenant['gemini_api_key'];
                }
            }

            if (empty($active_api_key)) {
                _json(["ok" => false, "error" => "Chưa cấu hình GEMINI API KEY"], 500);
            }

            $GEMINI_MODEL = "gemini-2.5-flash";
            $GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{$GEMINI_MODEL}:generateContent?key=" . $active_api_key;

            $payload = json_encode([
                "contents" => [
                    [
                        "role" => "user",
                        "parts" => [["text" => $prompt]]
                    ]
                ],
                "generationConfig" => [
                    "temperature" => 1.5,
                    "maxOutputTokens" => 50000,
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
} catch (Throwable $e) {
    error_log($e->getMessage());
    _json(["ok" => false, "error" => "Server error: " . $e->getMessage()], 500);
}
