<?php
require_once 'db.php';
init_cors();

$method = $_SERVER['REQUEST_METHOD'];
$acc = get_account_id();

function _json($data) {
    echo json_encode($data);
    exit;
}

if ($method === 'GET') {
    $sheet = $_GET['sheet'] ?? '';
    $action = $_GET['action'] ?? '';
    $type = $_GET['type'] ?? '';



    // 3. AI Reports
    if ($sheet === 'ai_reports') {
        $stmt = $pdo->prepare("SELECT * FROM ai_reports WHERE account_id = ? ORDER BY timestamp DESC");
        $stmt->execute([$acc]);
        $rows = $stmt->fetchAll();
        $data = [];
        foreach ($rows as $r) {
            $data[] = [
                'id' => $r['report_id'],
                'timestamp' => $r['timestamp'],
                'label' => $r['label'],
                'brand' => $r['brand'],
                'dateRange' => $r['date_range'],
                'preview' => $r['preview'],
                'html' => $r['html']
            ];
        }
        _json(["ok" => true, "data" => $data]);
    }

    // 4. Settings
    if ($sheet === 'settings') {
        $key = $_GET['key'] ?? null;
        if ($key) {
            $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE account_id = ? AND setting_key = ?");
            $stmt->execute([$acc, $key]);
            $val = $stmt->fetchColumn();
            $decoded = json_decode($val, true);
            _json(["ok" => true, "key" => $key, "value" => (json_last_error() === JSON_ERROR_NONE ? $decoded : $val)]);
        } else {
            $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM settings WHERE account_id = ?");
            $stmt->execute([$acc]);
            $settings = [];
            while ($row = $stmt->fetch()) {
                $decoded = json_decode($row['setting_value'], true);
                $settings[$row['setting_key']] = (json_last_error() === JSON_ERROR_NONE ? $decoded : $row['setting_value']);
            }
            _json(["ok" => true, "settings" => $settings]);
        }
    }

    // 5. Users
    if ($sheet === 'users') {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE account_id = ?");
        $stmt->execute([$acc]);
        $rows = $stmt->fetchAll();
        $users = [];
        foreach ($rows as $r) {
            $users[] = [
                'email' => $r['email'],
                'name' => $r['name'],
                'role' => $r['role'],
                'status' => $r['status'],
                'addedAt' => $r['added_at'],
                'requestAt' => $r['request_at'],
                'picture' => $r['picture'],
                'lastLogin' => $r['last_login']
            ];
        }
        _json(["ok" => true, "users" => $users]);
    }

    _json(["ok" => false, "error" => "Unknown GET sheet"]);
}

// ======================= POST =======================
if ($method === 'POST') {
    $raw_body = $GLOBALS['raw_post_data'] ?? file_get_contents("php://input");
    $body = json_decode($raw_body, true) ?: [];
    $sheet = strtolower($body['sheet'] ?? 'settings');
    $action = strtolower($body['action'] ?? '');

if ($sheet === 'users') {
    $email = strtolower(trim($body['email'] ?? ''));
    if (!$email) _json(["ok" => false, "error" => "Missing email"]);

    if ($action === 'add' || $action === 'request') {
        $name = $body['name'] ?? explode('@', $email)[0];
        $role = $action === 'add' ? ($body['role'] ?? 'viewer') : 'viewer';
        $status = $action === 'add' ? ($body['status'] ?? 'active') : 'request';
        $addedAt = $action === 'add' ? ($body['addedAt'] ?? date('d/m/Y H:i:s')) : '';
        $requestAt = $action === 'request' ? ($body['requestAt'] ?? date('d/m/Y H:i:s')) : '';
        $pic = $body['picture'] ?? '';
        $sql = "INSERT INTO users (account_id, email, name, role, status, added_at, request_at, picture) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                name=VALUES(name), role=VALUES(role), status=VALUES(status), added_at=VALUES(added_at), request_at=VALUES(request_at), picture=VALUES(picture)";
        $pdo->prepare($sql)->execute([$acc, $email, $name, $role, $status, $addedAt, $requestAt, $pic]);
        _json(["ok" => true, "action" => $action, "email" => $email]);
    }

    if ($action === 'update') {
        $updates = [];
        $params = [];
        $allowed = ['name','role','status','picture','lastLogin','requestAt'];
        foreach ($allowed as $f) {
            if (isset($body[$f])) {
                $col = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $f));
                $updates[] = "$col = ?";
                $params[] = $body[$f];
            }
        }
        if ($updates) {
            $params[] = $acc;
            $params[] = $email;
            $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE account_id = ? AND email = ?";
            $pdo->prepare($sql)->execute($params);
        }
        _json(["ok" => true, "action" => "updated", "email" => $email]);
    }

    if ($action === 'delete') {
        $pdo->prepare("DELETE FROM users WHERE account_id = ? AND email = ?")->execute([$acc, $email]);
        _json(["ok" => true, "action" => "deleted", "email" => $email]);
    }

    _json(["ok" => false, "error" => "Unknown action. Use add|update|delete|request"]);
}

if ($sheet === 'ai_reports') {
    if ($action === 'save') {
        $r = $body['report'] ?? null;
        if (!$r) _json(["ok" => false, "error" => "Missing report"]);
        $id = $r['id'] ?? time();
        $sql = "INSERT INTO ai_reports (report_id, account_id, timestamp, label, brand, date_range, preview, html)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE label=VALUES(label), brand=VALUES(brand), html=VALUES(html)";
        $pdo->prepare($sql)->execute([
            $id, $acc, $r['timestamp'] ?? date('d/m/Y H:i:s'), $r['label'] ?? '',
            $r['brand'] ?? '', $r['dateRange'] ?? '', $r['preview'] ?? '', $r['html'] ?? ''
        ]);
        
        // Keep only top 30
        $pdo->prepare("DELETE FROM ai_reports WHERE account_id = ? AND report_id NOT IN (
            SELECT report_id FROM (SELECT report_id FROM ai_reports WHERE account_id = ? ORDER BY timestamp DESC LIMIT 30) AS tmp
        )")->execute([$acc, $acc]);

        _json(["ok" => true, "action" => "saved", "id" => $id]);
    }
    if ($action === 'delete') {
        $pdo->prepare("DELETE FROM ai_reports WHERE account_id = ? AND report_id = ?")->execute([$acc, $body['id'] ?? '']);
        _json(["ok" => true, "action" => "deleted", "removed" => true]);
    }
    _json(["ok" => false, "error" => "Unknown action"]);
}

if ($sheet === 'settings') {
    if (isset($body['settings']) && is_array($body['settings'])) {
        $stmt = $pdo->prepare("INSERT INTO settings (account_id, setting_key, setting_value) VALUES (?, ?, ?)
                               ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        foreach ($body['settings'] as $k => $v) {
            $stmt->execute([$acc, $k, is_array($v) ? json_encode($v) : $v]);
        }
        _json(["ok" => true, "updated" => array_keys($body['settings'])]);
    }
    if (isset($body['key'])) {
        $v = isset($body['value']) ? (is_array($body['value']) ? json_encode($body['value']) : $body['value']) : '';
        $stmt = $pdo->prepare("INSERT INTO settings (account_id, setting_key, setting_value) VALUES (?, ?, ?)
                               ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $stmt->execute([$acc, $body['key'], $v]);
        _json(["ok" => true, "key" => $body['key']]);
    }
    _json(["ok" => false, "error" => "Invalid body"]);
}

    _json(["ok" => false, "error" => "Unknown sheet"]);
}

