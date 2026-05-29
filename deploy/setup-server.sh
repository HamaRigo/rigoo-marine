#!/usr/bin/env bash
# Rigoo Marine — Production Server Setup
# Run once on a fresh Ubuntu 22.04 / 24.04 VPS as root.
# Usage: curl -fsSL https://raw.githubusercontent.com/HamaRigo/rigoo-marine/production/deploy/setup-server.sh | bash
set -euo pipefail

DOMAIN_API="api.rigoomarine.com"
DEPLOY_DIR="/opt/rigoo-marine-prod"
DEPLOY_USER="rigoo"

echo "=== Rigoo Marine — Server Setup ==="

# ── 1. System packages ───────────────────────────────────────────────────────
apt-get update -qq
apt-get install -y --no-install-recommends \
    curl wget git ufw fail2ban nginx certbot python3-certbot-nginx \
    ca-certificates gnupg lsb-release

# ── 2. Docker ────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
fi

# ── 3. Dedicated deploy user ──────────────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
fi

# ── 4. Deploy directory ───────────────────────────────────────────────────────
mkdir -p "$DEPLOY_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"

# ── 5. Firewall — allow only SSH, HTTP, HTTPS ─────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ── 6. Fail2ban — block brute-force SSH ──────────────────────────────────────
systemctl enable --now fail2ban

# ── 7. Nginx + SSL ───────────────────────────────────────────────────────────
cp "$(dirname "$0")/nginx.conf" /etc/nginx/sites-available/rigoomarine
ln -sf /etc/nginx/sites-available/rigoomarine /etc/nginx/sites-enabled/rigoomarine
rm -f /etc/nginx/sites-enabled/default

# Obtain SSL certificates (requires DNS pointing to this server)
certbot --nginx -d "$DOMAIN_API" --non-interactive --agree-tos \
    --email admin@rigoomarine.com --redirect || \
    echo "WARNING: certbot failed — DNS may not be configured yet. Run manually: certbot --nginx -d $DOMAIN_API"

nginx -t && systemctl reload nginx

# ── 8. Env file reminder ─────────────────────────────────────────────────────
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    cat > "$DEPLOY_DIR/.env" << 'ENVTEMPLATE'
# Copy this file and fill in every value — no defaults in production.

# Database
DB_USERNAME=rigoo
DB_PASSWORD=CHANGE_ME_strong_db_password

# Redis
REDIS_PASSWORD=CHANGE_ME_strong_redis_password

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=CHANGE_ME_min_64_chars

# Internal service token — generate with: openssl rand -hex 32
INTERNAL_API_TOKEN=CHANGE_ME_min_32_chars

# CORS — your Vercel production URL
ALLOWED_ORIGINS=https://rigoo-marine-frontend.vercel.app

# Frontend base URL (for email links, Stripe redirects)
FRONTEND_BASE_URL=https://rigoo-marine-frontend.vercel.app

# WhatsApp verify token — any secret string
WHATSAPP_META_VERIFY_TOKEN=CHANGE_ME

# Optional integrations (leave empty to disable)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
MAIL_ENABLED=false
SPRING_MAIL_HOST=
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=
SPRING_MAIL_PASSWORD=
MAIL_FROM=no-reply@rigoomarine.qa
WHATSAPP_ENABLED=false
WHATSAPP_TWILIO_ACCOUNT_SID=
WHATSAPP_TWILIO_AUTH_TOKEN=
WHATSAPP_TWILIO_FROM=
WHATSAPP_META_PHONE_NUMBER_ID=
WHATSAPP_META_ACCESS_TOKEN=
ENVTEMPLATE
    chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR/.env"
    chmod 600 "$DEPLOY_DIR/.env"
    echo ""
    echo ">>> IMPORTANT: Edit $DEPLOY_DIR/.env and fill in all secrets before starting services."
fi

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Edit $DEPLOY_DIR/.env — fill in DB_PASSWORD, JWT_SECRET, etc."
echo "  2. Copy docker-compose.yml to $DEPLOY_DIR/"
echo "  3. cd $DEPLOY_DIR && docker compose up -d"
echo "  4. Set VITE_API_BASE_URL=https://$DOMAIN_API in Vercel dashboard"
