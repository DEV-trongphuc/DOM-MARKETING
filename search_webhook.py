import sys

with open('api/index.php', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    l_lower = l.lower()
    if 'curl' in l_lower or 'script.google.com' in l_lower or 'file_get_contents' in l_lower or 'webhook' in l_lower or 'appscript' in l_lower:
        print(f"{i+1}: {l.strip()}")
