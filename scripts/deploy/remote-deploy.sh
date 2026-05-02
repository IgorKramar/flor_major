#!/usr/bin/env bash
# Удалённый deploy-скрипт. Запускается через ssh bash -s "$TS" < remote-deploy.sh.
# Получает timestamp релиза в $1.

set -euo pipefail
TS="${1:?usage: remote-deploy.sh <timestamp>}"
RELEASE="/opt/flormajor/releases/$TS"

mkdir -p "$RELEASE"
tar -xzf "/tmp/bundle-${TS}.tar.gz" -C "$RELEASE"
rm "/tmp/bundle-${TS}.tar.gz"

ln -sf /opt/flormajor/shared/.env "$RELEASE/.env"

ln -sfn "$RELEASE" /opt/flormajor/current

pm2 reload /opt/flormajor/shared/ecosystem.config.cjs --update-env

for i in {1..15}; do
  if curl -fs http://127.0.0.1:3000/api/health >/dev/null; then
    echo "✓ health OK after $((i * 2))s"
    break
  fi
  sleep 2
  if [ "$i" -eq 15 ]; then
    echo "✗ health check failed after 30s"
    exit 1
  fi
done

ls -1t /opt/flormajor/releases | tail -n +6 | \
  xargs -I{} rm -rf "/opt/flormajor/releases/{}"

echo "✓ deploy $TS complete"
