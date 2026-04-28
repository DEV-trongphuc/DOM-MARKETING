import sys

with open('api/index.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to replace
old_pattern = """if (!$tenant || (strtolower($admin_email) !== strtolower($tenant['google_email']) && !$is_super_admin)) {"""

new_pattern = """$is_owner = !empty($admin_email) && !empty($tenant['google_email']) && strtolower($admin_email) === strtolower($tenant['google_email']);
            if (!$tenant || (!$is_owner && !$is_super_admin)) {"""

count = content.count(old_pattern)
content = content.replace(old_pattern, new_pattern)

with open('api/index.php', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Replaced {count} occurrences')
