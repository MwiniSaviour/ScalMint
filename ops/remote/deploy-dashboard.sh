#!/usr/bin/env bash
# Remote half of .github/workflows/deploy.yml. Executed ON the VPS (as root)
# via appleboy/ssh-action script_path. Must be safe to re-run: every step is
# idempotent (fetch, fast-forward, npm ci, migrate deploy, build, restart).
#
# This is an in-place deploy, so the guards matter:
#   - tracked server edits are refused, never reset away;
#   - server-only commits are refused, never discarded;
#   - the commit is only moved forward (origin/<ref> must contain HEAD).
set -euo pipefail

APP_DIR="/opt/scalmint"
REF="${DEPLOY_REF:-main}"
SERVICE="scalmint"

cd "$APP_DIR"

echo "[deploy] repo=$APP_DIR ref=$REF"

git fetch --prune origin

DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "$DIRTY" ]; then
  echo "[deploy] ERROR: tracked files are modified on the server; refusing to deploy over them:" >&2
  echo "$DIRTY" >&2
  exit 1
fi

if ! git merge-base --is-ancestor HEAD "origin/$REF"; then
  echo "[deploy] ERROR: server HEAD $(git rev-parse --short HEAD) has commits that are not on origin/$REF; refusing to discard them." >&2
  exit 1
fi

git checkout -q -B "$REF" "origin/$REF"
echo "[deploy] now at $(git rev-parse --short HEAD) - $(git log -1 --format=%s)"

# NEXT_PUBLIC_* values are inlined during `next build`; Next.js loads .env from
# the project root, which is the same behaviour the manual deploys relied on.
echo "[deploy] installing dependencies"
npm ci

echo "[deploy] applying migrations"
npx prisma migrate deploy

echo "[deploy] building"
npm run build

# start.sh (pm2 script) sources /opt/scalmint/.env before `npm start`, so a
# plain restart picks up both the new build and the current environment.
echo "[deploy] restarting $SERVICE"
pm2 restart "$SERVICE"

# The probe worker runs the same checkout; restart it too so it is not left on
# the previous commit. Guarded so a fresh box without the worker still deploys.
if pm2 describe scalmint-probe >/dev/null 2>&1; then
  echo "[deploy] restarting scalmint-probe"
  pm2 restart scalmint-probe
fi

pm2 save

# Smoke through the production middleware: admin routes are only served on the
# admin host, so the Host header is required (without it the app 308s away).
echo "[deploy] smoke check"
CODE=""
for attempt in $(seq 1 30); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -H 'Host: admin.scalmint.com' http://127.0.0.1:3002/admin/login || true)"
  if [ "$CODE" = "200" ]; then
    echo "[deploy] healthy: GET /admin/login -> 200 (attempt $attempt)"
    exit 0
  fi
  sleep 2
done

echo "[deploy] ERROR: /admin/login did not return 200 within 60s (last: ${CODE:-no response})" >&2
pm2 logs "$SERVICE" --lines 50 --nostream >&2 || true
exit 1
