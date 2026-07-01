# DNS Records — rigoomarine.com
# Cloudflare zone — configure exactly as below
# New server IP: 84.8.99.36 (Oracle Cloud me-riyadh-1)
# Updated: 2026-07-02

## Required A Records

| Name       | Type | Value        | TTL  | Proxy         |
|------------|------|--------------|------|---------------|
| @          | A    | 84.8.99.36   | Auto | DNS only ☁️  |
| www        | A    | 84.8.99.36   | Auto | DNS only ☁️  |
| api        | A    | 84.8.99.36   | Auto | DNS only ☁️  |

> IMPORTANT: All three must be "DNS only" (grey cloud), NOT proxied (orange cloud).
> Certbot / Let's Encrypt performs HTTP-01 verification directly against the
> server IP — a Cloudflare proxy would break the certificate issuance.
> After TLS is working you MAY enable the orange cloud on @ and www,
> but keep api DNS-only (WebSocket proxying requires a paid Cloudflare plan).

## What each record does

- `@`   (rigoomarine.com)      → nginx → port 3080 → React frontend
- `www` (www.rigoomarine.com)  → nginx → 301 redirect to https://rigoomarine.com
- `api` (api.rigoomarine.com)  → nginx → port 8080 → Spring Cloud API Gateway

## Current state (before your change)

| Name | Old value          | New value  |
|------|--------------------|------------|
| @    | 145.241.105.140    | 84.8.99.36 |
| www  | (missing / old IP) | 84.8.99.36 |
| api  | 145.241.105.140    | 84.8.99.36 |

## Steps in Cloudflare dashboard

1. Login → rigoomarine.com → DNS → Records
2. Edit the `@` A record  → set IPv4: 84.8.99.36 → click **Save**
3. Edit the `api` A record → set IPv4: 84.8.99.36 → click **Save**
4. Edit (or Add) the `www` A record → set IPv4: 84.8.99.36 → click **Save**
   - If www doesn't exist: click "Add record", Type=A, Name=www, IPv4=84.8.99.36, Save
5. Verify all three show 84.8.99.36 and grey cloud icon

Changes are live on Cloudflare's authoritative servers within ~10 seconds of saving.
Global propagation (other resolvers flushing their cache) can take up to the old TTL
— usually 5 minutes for Cloudflare-managed zones.

## After DNS propagates — TLS (run once via SSH)

```bash
# Step 1 — API cert
sudo certbot --nginx -d api.rigoomarine.com \
  --non-interactive --agree-tos -m mohamed.bouallagui001@gmail.com

# Step 2 — Frontend cert (covers www too)
sudo certbot --nginx -d rigoomarine.com -d www.rigoomarine.com \
  --non-interactive --agree-tos -m mohamed.bouallagui001@gmail.com

# Step 3 — Replace temp nginx config with full SSL config
sudo curl -fsSL \
  https://raw.githubusercontent.com/HamaRigo/rigoo-marine/production/deploy/nginx.conf \
  -o /etc/nginx/sites-available/rigoomarine
sudo nginx -t && sudo systemctl reload nginx

# Step 4 — Verify
curl -I https://rigoomarine.com
curl -I https://api.rigoomarine.com/actuator/health
```

## Optional — Email records (if you use email on this domain)

These are NOT required for the app to work. Add only if you send/receive
email from @rigoomarine.com addresses.

| Name | Type | Value                        | Notes           |
|------|------|------------------------------|-----------------|
| @    | MX   | mail.rigoomarine.com (pri 10) | mail server      |
| @    | TXT  | v=spf1 ...                  | SPF anti-spam    |
| _dmarc | TXT | v=DMARC1; p=none; ...      | DMARC policy     |

Currently no MX or TXT records exist in the zone — no email is configured.
