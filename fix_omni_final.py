import os
import re

with open('omni_sentinel_cli.py', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Fix HMAC_SECRET for mypy
    if 'HMAC_SECRET: str = str(os.environ.get("OMNI_SENTINEL_HMAC_KEY", ""))' in line:
        new_lines.append('HMAC_SECRET: str = os.environ.get("OMNI_SENTINEL_HMAC_KEY", "")\n')
    elif 'HMAC_SECRET.encode("utf-8")' in line:
        # Check for None explicitly or ensure it's a string
        new_lines.append(line.replace('HMAC_SECRET.encode', '(HMAC_SECRET or "").encode'))
    else:
        new_lines.append(line)

with open('omni_sentinel_cli.py', 'w') as f:
    f.writelines(new_lines)
