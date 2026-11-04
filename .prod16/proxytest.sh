#!/usr/bin/env bash
# Real-container reverse-proxy test: HTTPS (nginx, self-signed) -> http://app:3000. Non-destructive, invalid payloads only.
set -uo pipefail
PUB=https://operations.noki-services.com
IMG=noki-ops:test
fails=0; total=0
mkdir -p /tmp/px && cd /tmp/px
openssl req -x509 -newkey rsa:2048 -nodes -keyout k.pem -out c.pem -days 1 -subj "/CN=operations.noki-services.com" -addext "subjectAltName=DNS:operations.noki-services.com" >/dev/null 2>&1
cat > nginx.conf <<'NG'
events {}
http {
  resolver 127.0.0.11 valid=1s;
  server {
    listen 443 ssl;
    server_name operations.noki-services.com;
    ssl_certificate /etc/nginx/c.pem; ssl_certificate_key /etc/nginx/k.pem;
    location / {
      set $up http://app:3000;
      proxy_pass $up;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $remote_addr;
    }
  }
}
NG
docker network create pxnet >/dev/null
docker run -d --name proxy --network pxnet -p 443:443 -v /tmp/px/nginx.conf:/etc/nginx/nginx.conf:ro -v /tmp/px/c.pem:/etc/nginx/c.pem:ro -v /tmp/px/k.pem:/etc/nginx/k.pem:ro nginx:1.27-alpine >/dev/null

start_app() { # $1 = NOKI_PUBLIC_ORIGIN value or "-" for unset
  docker rm -f app >/dev/null 2>&1 || true
  local extra=()
  [ "$1" != "-" ] && extra=(-e "NOKI_PUBLIC_ORIGIN=$1")
  docker run -d --name app --network pxnet -e NOKI_API_BASE_URL=https://api-staging.noki-services.com "${extra[@]}" "$IMG" >/dev/null
  for i in $(seq 1 30); do
    [ "$(docker inspect --format '{{.State.Health.Status}}' app)" = "healthy" ] && break; sleep 3
  done
  echo "app health=$(docker inspect --format '{{.State.Health.Status}}' app) public_origin=$1"
}

# call <method> <path> <content-type|-> <body|-> [header...] ; sets STATUS, CODE
call() {
  local method="$1" path="$2" ct="$3" body="$4"; shift 4
  local args=(-sk -m 15 -o /tmp/px/body.json -w '%{http_code}' --resolve operations.noki-services.com:443:127.0.0.1 -X "$method")
  for h in "$@"; do args+=(-H "$h"); done
  [ "$ct" != "-" ] && args+=(-H "Content-Type: $ct")
  [ "$body" != "-" ] && args+=(--data "$body")
  STATUS=$(curl "${args[@]}" "https://operations.noki-services.com$path")
  CODE=$(jq -r '.code // .error.code // .error // empty' /tmp/px/body.json 2>/dev/null | head -c 60)
}
expect_pass_origin() { # name method path ct body headers...
  local n="$1"; shift; call "$@"; total=$((total+1))
  if [ "$CODE" != "INVALID_ORIGIN" ] && [ "$STATUS" != "000" ]; then echo "PASS  [$n] crossed origin check -> HTTP $STATUS $CODE"; else echo "FAIL  [$n] expected to pass origin check -> HTTP $STATUS $CODE"; fails=$((fails+1)); fi
}
expect_reject() {
  local n="$1"; shift; call "$@"; total=$((total+1))
  if [ "$STATUS" = "403" ] && [ "$CODE" = "INVALID_ORIGIN" ]; then echo "PASS  [$n] rejected -> 403 INVALID_ORIGIN"; else echo "FAIL  [$n] expected 403 INVALID_ORIGIN -> HTTP $STATUS $CODE"; fails=$((fails+1)); fi
}

JSON=application/json
start_app "$PUB"
echo "--- health through HTTPS proxy"; call GET /api/health - -; echo "HTTP $STATUS $(cat /tmp/px/body.json)"
O="Origin: $PUB"; SFS="Sec-Fetch-Site: same-origin"
echo "=== LEGITIMATE (Host public, Origin public, backend http:3000)"
expect_pass_origin "login legit Origin+SFS (invalid payload)" POST /api/auth/login $JSON '{}' "$O" "$SFS"
expect_pass_origin "login legit Origin only"                  POST /api/auth/login $JSON '{}' "$O"
expect_pass_origin "login legit Referer only"                 POST /api/auth/login $JSON '{}' "Referer: $PUB/fr/login"
expect_pass_origin "login legit SFS only (no Origin/Referer)" POST /api/auth/login $JSON '{}' "$SFS"
expect_pass_origin "logout legit"                             POST /api/auth/logout - - "$O" "$SFS"
expect_pass_origin "mfa/verify legit"                         POST /api/auth/mfa/verify $JSON '{}' "$O" "$SFS"
expect_pass_origin "mfa/enroll/start legit"                   POST /api/auth/mfa/enroll/start $JSON '{}' "$O" "$SFS"
expect_pass_origin "mfa/enroll/confirm legit"                 POST /api/auth/mfa/enroll/confirm $JSON '{}' "$O" "$SFS"
expect_pass_origin "mfa/step-up legit"                        POST /api/auth/mfa/step-up $JSON '{}' "$O" "$SFS"
expect_pass_origin "mfa/recovery-codes legit"                 POST /api/auth/mfa/recovery-codes $JSON '{}' "$O" "$SFS"
expect_pass_origin "mfa/status legit"                         GET  /api/auth/mfa/status - - "$O" "$SFS"
echo "=== CROSS-ORIGIN / MALFORMED (must be rejected)"
for route in /api/auth/login /api/auth/logout /api/auth/mfa/verify /api/auth/mfa/enroll/start /api/auth/mfa/enroll/confirm /api/auth/mfa/step-up /api/auth/mfa/recovery-codes; do
  expect_reject "$route external domain"  POST $route $JSON '{}' "Origin: https://evil.example"
  expect_reject "$route http scheme"      POST $route $JSON '{}' "Origin: http://operations.noki-services.com"
  expect_reject "$route other subdomain"  POST $route $JSON '{}' "Origin: https://admin.noki-services.com"
  expect_reject "$route look-alike"       POST $route $JSON '{}' "Origin: https://operations.noki-services.com.evil.example"
  expect_reject "$route cross-site SFS"   POST $route $JSON '{}' "$O" "Sec-Fetch-Site: cross-site"
  expect_reject "$route forged Host/XFH only (no Origin)" POST $route $JSON '{}' "X-Forwarded-Host: operations.noki-services.com"
done
expect_reject "login external Referer"  POST /api/auth/login $JSON '{}' "Referer: https://evil.example/fr/login"
expect_reject "login bind-address Origin" POST /api/auth/login $JSON '{}' "Origin: https://0.0.0.0:3000"
expect_reject "mfa/status external"     GET /api/auth/mfa/status - - "Origin: https://evil.example"

echo "=== FAIL-CLOSED: NOKI_PUBLIC_ORIGIN absent in production"
start_app "-"
expect_reject "login legit origin but no public origin configured" POST /api/auth/login $JSON '{}' "$O" "$SFS"
expect_reject "logout legit origin but no public origin configured" POST /api/auth/logout - - "$O" "$SFS"
echo "=== FAIL-CLOSED: invalid NOKI_PUBLIC_ORIGIN"
start_app "http://operations.noki-services.com"
expect_reject "login with http public origin configured" POST /api/auth/login $JSON '{}' "$O" "$SFS"
start_app "https://operations.noki-services.com/app"
expect_reject "login with path in public origin configured" POST /api/auth/login $JSON '{}' "$O" "$SFS"

echo "TOTAL=$total FAILS=$fails"
docker logs app 2>&1 | tail -5
[ "$fails" = "0" ]
