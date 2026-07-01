#!/usr/bin/env bash
# Rigoo Marine — Production Server Setup
# Tested on Ubuntu 22.04 / 24.04 — works on both x86_64 and ARM64 (Oracle Ampere A1).
# Run once as root on a fresh instance.
#
# ORACLE CLOUD USERS — read before running:
#   This script configures the HOST firewall (ufw + iptables).
#   Oracle Cloud has a SECOND layer: the VCN Security List in the OCI console.
#   You must ALSO open ports 80, 443, and 22 there, or the host will be
#   unreachable from the internet even after this script succeeds.
#   Console path: Networking → Virtual Cloud Networks → your VCN →
#                 Security Lists → Default Security List → Add Ingress Rules
#
# Usage: curl -fsSL https://raw.githubusercontent.com/HamaRigo/rigoo-marine/production/deploy/setup-server.sh | bash
set -euo pipefail

DOMAIN_API="api.rigoomarine.com"
DOMAIN_FRONTEND="rigoomarine.com"
DEPLOY_DIR="/opt/rigoo-marine-prod"
DEPLOY_USER="rigoo"

echo "=== Rigoo Marine — Server Setup ==="
echo "    Architecture : $(uname -m)"
echo "    OS           : $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"

# ── 1. System packages ───────────────────────────────────────────────────────
apt-get update -qq
apt-get install -y --no-install-recommends \
    curl wget git ufw fail2ban nginx certbot python3-certbot-nginx \
    ca-certificates gnupg lsb-release iptables-persistent

# ── 2. Docker (architecture-aware) ───────────────────────────────────────────
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
# Also add the default Oracle Cloud SSH user to the docker group so SSH-based
# GitHub Actions deploys (appleboy/ssh-action as ubuntu) can run docker compose.
usermod -aG docker ubuntu 2>/dev/null || true

# ── 4. Deploy directory ───────────────────────────────────────────────────────
mkdir -p "$DEPLOY_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"

# ── 5. Firewall ───────────────────────────────────────────────────────────────
# Oracle Cloud Ubuntu images ship with restrictive iptables rules that sit
# BELOW ufw and silently drop traffic even when ufw says "ALLOW".
# We flush those rules first, then let ufw own the host firewall going forward.
#
# NOTE: On Oracle you still need to open 80/443/22 in the OCI console
#       Security List — this only covers the host-level firewall.

echo "--- Configuring host firewall ---"

# Flush Oracle's default iptables rules (INPUT chain drops everything by default)
iptables  -F INPUT  2>/dev/null || true
iptables  -F FORWARD 2>/dev/null || true
iptables  -P INPUT  ACCEPT
iptables  -P FORWARD ACCEPT
ip6tables -F INPUT  2>/dev/null || true
ip6tables -P INPUT  ACCEPT

# Now configure ufw as the authoritative host firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
# Allow GitHub Actions runner IPs to reach SSH for CD pipeline.
# GitHub publishes their IP ranges at https://api.github.com/meta (hooks key).
# The ranges below are the current Actions runner CIDRs (update periodically).
# Alternatively, replace with your office/bastion IP for tighter control.
for cidr in \
    4.148.0.0/16 \
    4.175.0.0/16 \
    13.64.0.0/11 \
    20.0.0.0/8 \
    40.74.0.0/15 \
    51.4.0.0/15 \
    52.224.0.0/11 \
    64.225.0.0/16 \
    138.91.0.0/16 \
    140.82.112.0/20 \
    185.199.108.0/22 \
    192.30.252.0/22 \
; do
    ufw allow from "$cidr" to any port 22 comment "GitHub Actions runner" 2>/dev/null || true
done
ufw --force enable

# Persist iptables so they survive reboot (iptables-persistent)
netfilter-persistent save 2>/dev/null || true

# ── 6. Fail2ban — brute-force SSH protection ──────────────────────────────────
systemctl enable --now fail2ban

# ── 7. Nginx + SSL ───────────────────────────────────────────────────────────
cp "$(dirname "$0")/nginx.conf" /etc/nginx/sites-available/rigoomarine
ln -sf /etc/nginx/sites-available/rigoomarine /etc/nginx/sites-enabled/rigoomarine
rm -f /etc/nginx/sites-enabled/default

# Obtain SSL certificates (requires DNS A records pointing to this server for both domains)
certbot --nginx -d "$DOMAIN_API" --non-interactive --agree-tos \
    --email admin@rigoomarine.com --redirect || \
    echo "WARNING: certbot failed for $DOMAIN_API — DNS may not point here yet. Run manually."
certbot --nginx -d "$DOMAIN_FRONTEND" -d "www.$DOMAIN_FRONTEND" --non-interactive --agree-tos \
    --email admin@rigoomarine.com --redirect || \
    echo "WARNING: certbot failed for $DOMAIN_FRONTEND — DNS may not point here yet. Run manually."

nginx -t && systemctl reload nginx

# ── 8. Env file template ──────────────────────────────────────────────────────
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    cat > "$DEPLOY_DIR/.env" << 'ENVTEMPLATE'
# Copy this file and fill in every value — no defaults in production.
# Generate secrets:  openssl rand -hex 64

# Docker Hub image tag (set by CI to git SHA; keep 'latest' for manual deploys)
DOCKERHUB_USERNAME=rigoomarine
DOCKER_TAG=latest

# Database
DB_USERNAME=rigoo
DB_PASSWORD=CHANGE_ME_strong_db_password

# Redis
REDIS_PASSWORD=CHANGE_ME_strong_redis_password

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=CHANGE_ME_min_64_chars

# Internal service token — generate with: openssl rand -hex 32
INTERNAL_API_TOKEN=CHANGE_ME_min_32_chars

# Public API URL (used in uploaded-file links returned by the API)
PUBLIC_API_URL=https://api.rigoomarine.com

# CORS — accepted browser origins
ALLOWED_ORIGINS=https://rigoomarine.com

# Frontend base URL (for email links, Stripe redirects)
FRONTEND_BASE_URL=https://rigoomarine.com

# WhatsApp verify token — any secret string
WHATSAPP_META_VERIFY_TOKEN=CHANGE_ME

# Optional integrations (leave empty to disable)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
MAIL_ENABLED=false
SPRING_MAIL_HOST=smtp.gmail.com
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
fi

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "=== Setup complete ==="
echo ""
echo "ORACLE CLOUD — manual steps still required:"
echo "  1. OCI Console → Networking → VCN → Security List"
echo "     Add Ingress Rules for: TCP 22, TCP 80, TCP 443"
echo "     (without this the server is unreachable from the internet)"
echo ""
echo "  2. GitHub Actions CD secrets to set in repo Settings → Secrets:"
echo "     PROD_SSH_PRIVATE_KEY  — private key matching ~/.ssh/authorized_keys on this host"
echo "     PROD_SSH_USER         — $DEPLOY_USER"
echo "     PROD_SERVER_HOST      — public IP of this instance"
echo "     PROD_DOMAIN           — $DOMAIN_API"
echo "     DOCKERHUB_USERNAME    — rigoomarine"
echo "     DOCKERHUB_TOKEN       — Docker Hub access token"
echo ""
echo "Next steps:"
echo "  1. Edit $DEPLOY_DIR/.env — fill in all secrets"
echo "  2. Copy docker-compose.yml to $DEPLOY_DIR/"
echo "  3. cd $DEPLOY_DIR && docker compose up -d"
echo "  4. Set VITE_API_BASE_URL=https://$DOMAIN_API in Vercel dashboard"
