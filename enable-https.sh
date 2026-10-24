#!/usr/bin/env bash
# Enable HTTPS for NinaivuKalanjiyam with a free Let's Encrypt certificate.
# Browsers only allow microphone access on HTTPS pages, so recording needs this.
#
# Usage (on the EC2 server, from the repo root):
#   sudo ./enable-https.sh <email> [domain]
#
# If no domain is given, a free sslip.io hostname for this server's public IP is used,
# e.g. 13.127.18.210 -> 13-127-18-210.sslip.io
#
# Prerequisite: the EC2 security group must allow inbound TCP 80 and 443.
set -euo pipefail

EMAIL="${1:-}"
DOMAIN="${2:-}"

if [ -z "$EMAIL" ]; then
    echo "Usage: sudo ./enable-https.sh <email> [domain]"
    exit 1
fi

if [ -z "$DOMAIN" ]; then
    PUBLIC_IP="$(curl -s -m 5 https://checkip.amazonaws.com | tr -d '[:space:]')"
    if [ -z "$PUBLIC_IP" ]; then
        echo "Could not detect the public IP; pass a domain explicitly."
        exit 1
    fi
    DOMAIN="${PUBLIC_IP//./-}.sslip.io"
fi
echo "Using domain: $DOMAIN"

# Find the enabled Nginx site that proxies to the Node backend.
SITE_FILE="$(grep -lsRE "proxy_pass http://(127\.0\.0\.1|localhost):5002" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ | head -n 1 || true)"
if [ -z "$SITE_FILE" ]; then
    echo "Could not find the NinaivuKalanjiyam Nginx site (no 'proxy_pass' to port 5002)."
    exit 1
fi
SITE_FILE="$(readlink -f "$SITE_FILE")"
echo "Nginx site: $SITE_FILE"

# Append the domain to server_name (keeping existing names) so certbot can match this block.
if ! grep -qE "server_name[^;]*\b${DOMAIN//./\\.}\b" "$SITE_FILE"; then
    cp "$SITE_FILE" "$SITE_FILE.bak.$(date +%s)"
    sed -i -E "0,/server_name([^;]*);/s//server_name\1 ${DOMAIN};/" "$SITE_FILE"
    grep -n "server_name" "$SITE_FILE"
fi
nginx -t
systemctl reload nginx

# Install certbot and obtain the certificate; --redirect sends HTTP to HTTPS.
if ! command -v certbot >/dev/null 2>&1; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi
certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos -m "$EMAIL"

nginx -t
systemctl reload nginx
echo
echo "HTTPS is enabled: https://$DOMAIN"
echo "Certificates renew automatically (certbot.timer)."
