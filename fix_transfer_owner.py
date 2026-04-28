import sys

with open('api/index.php', 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoint = """
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

"""

content = content.replace("case 'auth_update_settings':", new_endpoint + "        case 'auth_update_settings':")

with open('api/index.php', 'w', encoding='utf-8') as f:
    f.write(content)

print("Inserted auth_transfer_owner")
