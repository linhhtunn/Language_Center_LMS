#!/bin/bash
# Trien khai 1 phien ban moi tren VPS. Chay tren VPS:  /opt/lms/deploy.sh v1.1.0
#
# Ma nguon cua phien ban phai nam san o /opt/lms/releases/<ver>/{backend,frontend}
# (deploy/release.sh tren may dev tu dong goi va gui len).
#
# Quy trinh an toan:
#   1. Build image moi trong khi ban cu VAN DANG CHAY (khach khong bi anh huong).
#   2. Sao luu database ngay truoc khi doi phien ban.
#   3. Doi sang phien ban moi (khach chi thay trang "Dang cap nhat" vai giay).
#   4. Kiem tra suc khoe: trang web + API + ket noi database.
#   5. Neu loi: tu khoi phuc database tu ban sao luu o buoc 2 va quay ve phien ban cu.
set -euo pipefail

APP_DIR=/opt/lms
cd "$APP_DIR"
# shellcheck disable=SC1091
source .env.prod

NEW="${1:?Cach dung: deploy.sh <phien-ban>, vd: deploy.sh v1.1.0}"
[[ "$NEW" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)?$ ]] || { echo "Ten phien ban phai dang v1.2.3"; exit 1; }
SRC="releases/$NEW"
[ -d "$SRC/backend" ] && [ -d "$SRC/frontend" ] || { echo "Khong thay ma nguon $SRC"; exit 1; }
CUR=$(cat CURRENT_VERSION 2>/dev/null || echo "")
[ "$NEW" != "$CUR" ] || { echo "$NEW dang chay roi."; exit 1; }

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
log() { echo "[$(date '+%F %T')] $*" | tee -a "$APP_DIR/releases.log"; }
# Ghi APP_VERSION vao .env.prod de moi lenh "docker compose ..." thu cong cung biet phien ban dang chay.
set_version() {
  if grep -q '^APP_VERSION=' .env.prod; then sed -i "s/^APP_VERSION=.*/APP_VERSION=$1/" .env.prod; else echo "APP_VERSION=$1" >> .env.prod; fi
  export APP_VERSION="$1"
}

healthy() {
  local fe api
  fe=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$APP_DOMAIN:443:127.0.0.1" "https://$APP_DOMAIN/") || true
  # Dang nhap bang tai khoan khong ton tai: tra 401 nghia la backend song VA doc duoc database.
  api=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$API_DOMAIN:443:127.0.0.1" \
        -X POST "https://$API_DOMAIN/api/Auth/login" -H 'Content-Type: application/json' \
        -d '{"data":{"email":"healthcheck@invalid.local","password":"x"}}') || true
  [ "$fe" = "200" ] && [ "$api" = "401" ]
}

wait_healthy() {
  for _ in $(seq 1 36); do healthy && return 0; sleep 5; done   # toi da 3 phut
  return 1
}

restore_db() {
  local dump="$1"
  log "Khoi phuc database tu $dump"
  $COMPOSE stop backend
  docker exec -i lms-mysql-1 mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
    -e "DROP DATABASE IF EXISTS HeThongHocOnline_Final; CREATE DATABASE HeThongHocOnline_Final CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL PRIVILEGES ON HeThongHocOnline_Final.* TO '${MYSQL_APP_USER:-qltt_app}'@'%';" </dev/null 2>/dev/null
  zcat "$dump" | docker exec -i lms-mysql-1 mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 HeThongHocOnline_Final 2>/dev/null
}

log "=== Bat dau trien khai $NEW (dang chay: ${CUR:-chua co}) ==="

log "1/5 Build image $NEW (ban cu van phuc vu khach)"
docker build -q -t "lms-backend:$NEW" "$SRC/backend" >/dev/null
docker build -q --build-arg "VITE_API_BASE_URL=https://$API_DOMAIN" -t "lms-frontend:$NEW" "$SRC/frontend" >/dev/null
docker builder prune -af >/dev/null 2>&1 || true

log "2/5 Sao luu database truoc khi doi phien ban"
mkdir -p /root/backups
DUMP="/root/backups/predeploy_${NEW}_$(date +%F_%H%M%S).sql.gz"
docker exec lms-mysql-1 mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines HeThongHocOnline_Final 2>/dev/null | gzip > "$DUMP"
[ "$(zcat "$DUMP" | tail -1 | grep -c 'Dump completed')" = "1" ] || { log "LOI: sao luu that bai, DUNG lai (ban cu van chay)"; exit 1; }

log "3/5 Doi sang $NEW"
set_version "$NEW"
$COMPOSE up -d --remove-orphans

log "4/5 Kiem tra suc khoe"
if wait_healthy; then
  [ -n "$CUR" ] && echo "$CUR" > PREVIOUS_VERSION
  echo "$NEW" > CURRENT_VERSION
  log "5/5 THANH CONG: dang chay $NEW"
  # Giu lai 3 phien ban gan nhat (ca image lan ma nguon) de co the quay lui.
  KEEP=$( (cat CURRENT_VERSION PREVIOUS_VERSION 2>/dev/null; ls -1t releases) | awk '!seen[$0]++' | head -3 )
  for d in releases/*; do v=$(basename "$d"); echo "$KEEP" | grep -qx "$v" || { rm -rf "$d"; docker rmi "lms-backend:$v" "lms-frontend:$v" >/dev/null 2>&1 || true; log "Don phien ban cu $v"; }; done
  find /root/backups -name 'predeploy_*' -mtime +30 -delete
  exit 0
fi

log "LOI: $NEW khong vuot qua kiem tra suc khoe -> tu dong quay lui"
docker logs --tail 40 lms-backend-1 2>&1 | tail -40 > "$APP_DIR/last_failed_deploy.log" || true
if [ -n "$CUR" ]; then
  restore_db "$DUMP"
  set_version "$CUR"
  $COMPOSE up -d --remove-orphans
  if wait_healthy; then log "Da quay lui ve $CUR thanh cong. Xem loi tai last_failed_deploy.log"; else log "CANH BAO: quay lui ve $CUR nhung kiem tra van loi!"; fi
fi
exit 1
