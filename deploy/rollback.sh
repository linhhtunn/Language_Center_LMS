#!/bin/bash
# Quay ve phien ban truoc (hoac phien ban chi dinh). Chay tren VPS:
#   /opt/lms/rollback.sh              -> ve phien ban ngay truoc
#   /opt/lms/rollback.sh v1.0.0       -> ve dung v1.0.0 (phai con image)
#   /opt/lms/rollback.sh v1.0.0 --restore-db
#        -> them khoi phuc database tu ban sao luu ngay truoc khi trien khai phien ban hien tai.
#           CHU Y: moi du lieu khach nhap SAU thoi diem do se mat. Chi dung khi ban moi lam hong du lieu.
set -euo pipefail
APP_DIR=/opt/lms
cd "$APP_DIR"
# shellcheck disable=SC1091
source .env.prod
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
log() { echo "[$(date '+%F %T')] $*" | tee -a "$APP_DIR/releases.log"; }

CUR=$(cat CURRENT_VERSION)
TARGET="${1:-$(cat PREVIOUS_VERSION 2>/dev/null || true)}"
[ -n "$TARGET" ] || { echo "Khong co phien ban truoc de quay ve."; exit 1; }
docker image inspect "lms-backend:$TARGET" "lms-frontend:$TARGET" >/dev/null 2>&1 \
  || { echo "Khong con image cua $TARGET. Cac phien ban co san:"; docker images --format '{{.Tag}}' lms-backend | sort -u; exit 1; }

if [ "${2:-}" = "--restore-db" ]; then
  DUMP=$(ls -1t /root/backups/predeploy_"${CUR}"_*.sql.gz 2>/dev/null | head -1)
  [ -n "$DUMP" ] || { echo "Khong thay ban sao luu truoc khi trien khai $CUR"; exit 1; }
  log "Sao luu hien trang truoc khi khoi phuc (phong khi can lay lai)"
  docker exec lms-mysql-1 mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction HeThongHocOnline_Final 2>/dev/null \
    | gzip > "/root/backups/before_rollback_$(date +%F_%H%M%S).sql.gz"
  log "Khoi phuc database tu $DUMP"
  $COMPOSE stop backend
  docker exec -i lms-mysql-1 mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
    -e "DROP DATABASE IF EXISTS HeThongHocOnline_Final; CREATE DATABASE HeThongHocOnline_Final CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL PRIVILEGES ON HeThongHocOnline_Final.* TO '${MYSQL_APP_USER:-qltt_app}'@'%';" </dev/null 2>/dev/null
  zcat "$DUMP" | docker exec -i lms-mysql-1 mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 HeThongHocOnline_Final 2>/dev/null
fi

log "Quay lui: $CUR -> $TARGET"
if grep -q '^APP_VERSION=' .env.prod; then sed -i "s/^APP_VERSION=.*/APP_VERSION=$TARGET/" .env.prod; else echo "APP_VERSION=$TARGET" >> .env.prod; fi
export APP_VERSION="$TARGET"
$COMPOSE up -d --remove-orphans
echo "$CUR" > PREVIOUS_VERSION
echo "$TARGET" > CURRENT_VERSION
log "Dang chay $TARGET"
