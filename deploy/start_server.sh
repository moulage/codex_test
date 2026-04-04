#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVICE_NAME="${SERVICE_NAME:-virtual-pet}"
APP_PORT="${APP_PORT:-5173}"
APP_HOST="${APP_HOST:-127.0.0.1}"
HEALTH_PATH="${HEALTH_PATH:-/healthz}"
CHECK_NGINX="${CHECK_NGINX:-true}"

if [[ ! -f "${APP_DIR}/server.js" ]]; then
  echo "server.js not found under ${APP_DIR}"
  exit 1
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo ".env not found under ${APP_DIR}"
  echo "create ${APP_DIR}/.env before starting the service"
  exit 1
fi

cd "${APP_DIR}"
npm --prefix prototype/react-app install
npm --prefix prototype/react-app run build
npm run check

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager -l

if [[ "${CHECK_NGINX}" == "true" ]] && command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
  systemctl status nginx --no-pager -l
fi

curl --fail --silent --show-error "http://${APP_HOST}:${APP_PORT}${HEALTH_PATH}" >/dev/null

echo
echo "start completed"
echo "service: ${SERVICE_NAME}"
echo "health: http://${APP_HOST}:${APP_PORT}${HEALTH_PATH}"
