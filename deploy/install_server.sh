#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVICE_NAME="${SERVICE_NAME:-virtual-pet}"
DOMAIN="${DOMAIN:-eand.cn}"
WWW_DOMAIN="${WWW_DOMAIN:-www.eand.cn}"
APP_PORT="${APP_PORT:-5173}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
APP_USER="${APP_USER:-root}"
APP_GROUP="${APP_GROUP:-root}"
ENABLE_HTTPS="${ENABLE_HTTPS:-false}"

if [[ -z "${NODE_BIN}" ]]; then
  echo "node not found in PATH"
  exit 1
fi

ENV_FILE="${APP_DIR}/.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_FILE="/etc/nginx/conf.d/${DOMAIN}.conf"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${APP_DIR}/.env.production.example" "${ENV_FILE}"
  echo "created ${ENV_FILE} from .env.production.example"
fi

cd "${APP_DIR}"
npm install --production
npm --prefix prototype/react-app install
npm --prefix prototype/react-app run build

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Virtual Pet Prototype
After=network.target mysql.service
Wants=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
Environment=NODE_ENV=production
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=always
RestartSec=5
User=${APP_USER}
Group=${APP_GROUP}

[Install]
WantedBy=multi-user.target
EOF

cat > "${NGINX_FILE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    client_max_body_size 10m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

if [[ "${ENABLE_HTTPS}" == "true" ]]; then
cat >> "${NGINX_FILE}" <<EOF

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
fi

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager

nginx -t
systemctl reload nginx

echo
echo "deployment completed"
echo "env file: ${ENV_FILE}"
echo "systemd: ${SERVICE_FILE}"
echo "nginx: ${NGINX_FILE}"
if [[ "${ENABLE_HTTPS}" == "true" ]]; then
  echo "https nginx block enabled"
else
  echo "http-only nginx config installed"
  echo "to enable https later, obtain certs first and rerun with:"
  echo "ENABLE_HTTPS=true bash deploy/install_server.sh"
fi
