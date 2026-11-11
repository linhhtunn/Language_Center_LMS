#!/bin/bash
# Chay tren MAY DEV (Git Bash) tu thu muc goc repo:  deploy/release.sh v1.1.0
# Dong goi ma nguon hien tai -> gui len VPS -> chay deploy.sh (build, sao luu, doi phien ban,
# kiem tra, tu quay lui neu loi). Can SSH alias "linhnt" trong ~/.ssh/config.
set -euo pipefail
VER="${1:?Cach dung: deploy/release.sh v1.2.3}"
HOST="${DEPLOY_HOST:-linhnt}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PKG="$(mktemp -d)/release_$VER.tgz"
tar --force-local -czf "$PKG" \
  --exclude='node_modules' --exclude='dist' \
  --exclude='.env' --exclude='.env.*' \
  --exclude='scratch' --exclude='*.pid' \
  backend frontend
echo "Da dong goi $VER ($(du -h "$PKG" | cut -f1))"

# Cap nhat luon file cau hinh van hanh (compose, Caddy, script) cung phien ban.
ssh "$HOST" "mkdir -p /opt/lms/database"
scp -q docker-compose.prod.yml Caddyfile deploy/deploy.sh deploy/rollback.sh "$HOST:/opt/lms/"
scp -q database/01_schema.sql database/02_seed.sql "$HOST:/opt/lms/database/"
scp -q "$PKG" "$HOST:/tmp/release_$VER.tgz"
ssh "$HOST" "set -e; cd /opt/lms; chmod +x deploy.sh rollback.sh; mkdir -p releases/$VER; \
  tar -xzf /tmp/release_$VER.tgz -C releases/$VER; rm -f /tmp/release_$VER.tgz; ./deploy.sh $VER"
