#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BRANCH="${BRANCH:-}"
SERVICE_NAME="${SERVICE_NAME:-virtual-pet}"

cd "${APP_DIR}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "working tree is not clean, aborting redeploy"
  echo "run 'git status --short' and handle local changes first"
  exit 1
fi

if [[ -n "${BRANCH}" ]]; then
  git pull --no-rebase origin "${BRANCH}"
else
  git pull --no-rebase
fi

npm install --production
npm --prefix prototype/react-app install
npm --prefix prototype/react-app run build
npm run check

sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl status "${SERVICE_NAME}" --no-pager

if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t
  sudo systemctl reload nginx
fi

curl --fail --silent --show-error http://127.0.0.1:5173/healthz
echo
echo "redeploy completed"
