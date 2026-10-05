#!/usr/bin/env bash
set -euo pipefail

# Smoke test read-only for a deployed SEO Total instance.
# Usage: ./scripts/smoke-production.sh [BASE_URL]
# Example: ./scripts/smoke-production.sh https://auto-articulos-web.vercel.app
#
# NO se siguen redirecciones a propósito: una pantalla protegida debe responder
# 307 (redirige al login). Si se siguiera la redirección, el estado final sería
# el 200 del login y el script fallaría siempre (falso fallo).
#
# The script sends unauthenticated GET requests only. It never needs secrets,
# credentials, cookies, a database connection, or a write-capable endpoint.

BASE_URL="${1:-${BASE_URL:-https://seototal.lasolucionweb.com}}"
BASE_URL="${BASE_URL%/}"
BASE_URLS=(
  "$BASE_URL"
  "https://articulos.lasolucionweb.com"
  "https://redes.lasolucionweb.com"
)

check_status() {
  local path="$1"
  shift
  local expected="$*"
  local status
  status="$(curl --silent --show-error --max-redirs 0 --max-time 20 --output /dev/null --write-out '%{http_code}' "$BASE_URL$path")"
  for allowed in $expected; do
    if [[ "$status" == "$allowed" ]]; then
      printf 'OK  %-36s %s\n' "$path" "$status"
      return 0
    fi
  done
  printf 'FAIL %-36s got %s (expected %s)\n' "$path" "$status" "$expected" >&2
  return 1
}

for BASE_URL in "${BASE_URLS[@]}"; do
  echo "Smoke test: $BASE_URL"
  check_status /login 200
  check_status /dashboard 307 401
  check_status /dashboard/articulos 307 401
  check_status /dashboard/redes 307 401
  check_status /dashboard/usuarios 307 401
  check_status /api/me 401
  check_status /api/admin/product-enforcement 401 403
  check_status /api/opportunities 401 403
  check_status /api/social-opportunities 401 403
done
echo "Smoke test OK"
