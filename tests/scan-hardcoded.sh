#!/bin/bash
# Usage: ./scan-hardcoded-simple.sh ./src

# ###
# This Bash script uses ripgrep (rg) to quickly scan a codebase for common
# hardcoded patterns that may indicate security or configuration issues.
# It is designed as a quick manual verification tool, not an automated
# security audit.
#
# Important notes:
#
# The scan may produce false positives (e.g., imports, comments, valid
# configuration). Results must be reviewed manually to determine if a match
# is a real hardcoded value or a legitimate reference.
# ##

SCAN_DIR=${1:-.}
PREFIX=':[0-9]+:'

echo "🔍 Starting hardcoded scan in '${SCAN_DIR}' with ripgrep..."

scan_pattern() {
  local name="$1"
  local regex="$2"

  echo -e "\n[${name}] Scanning..."
  rg --line-number \
    --column \
    --color=always \
    --pcre2 \
    --glob '!node_modules/**' \
    --glob '!dist/**' \
    --glob '!build/**' \
    -e "$regex" "$SCAN_DIR"
}

scan_pattern "JWT" '\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'
scan_pattern "Bearer" '\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b'
scan_pattern "Basic Auth" '\bBasic\s+[A-Za-z0-9+/]{8,}={0,2}\b'

scan_pattern "API endpoint" '\b/api(?:/[A-Za-z0-9._-]+)+(?:\?[A-Za-z0-9=&._-]+)?\b' | rg -v -e "${PREFIX}\s*import "
scan_pattern "process.env" '\bprocess\.env\.[A-Z0-9_]{2,}\b'
scan_pattern "URI" '\b[a-zA-Z][a-zA-Z0-9+.-]*://[^\s"'\''<>]+\b' | rg -v -e "${PREFIX}\s*import "

scan_pattern "Email" '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
scan_pattern "IP" '\b((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\b'
scan_pattern "Port" ':(?:6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5]?[0-9]{1,4})\b'
scan_pattern "Phone FR" '\b(\+33|0)[1-9](?:[ .-]?[0-9]{2}){4}\b'

scan_pattern "Unix Path" '\b/(?:[A-Za-z0-9._-]+/)*[A-Za-z0-9._-]+\b' | rg -v -e "${PREFIX}\s*import " -e 'className' -e 'from' -e "${PREFIX}\s*// "

scan_pattern "Windows Path" '\b[A-Za-z]:\\\\(?:[A-Za-z0-9._-]+\\\\)*[A-Za-z0-9._-]+\b'

scan_pattern "UUID" '\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b'
scan_pattern "Base64 Key" '\b[A-Za-z0-9+/]{40,}={0,2}\b' | rg -v -e "${PREFIX}\s*import "

echo -e "\n✅ Scan finished."
