# 🌐 Domain & SSL Setup Guide (HTTPS)

> **Khi nào dùng**: Sau khi deploy thành công với IP, muốn dùng domain name và bảo mật với HTTPS
> 
> **Lợi ích**: Domain name dễ nhớ, HTTPS bảo mật, SEO tốt hơn, tin cậy từ users
> 
> **⏱️ Thời gian**: ~1 giờ (domain propagation + SSL setup)

## 📋 Table of Contents

1. [Mua Domain Name](#1-mua-domain-name)
2. [Point DNS to VPS](#2-point-dns-to-vps)
3. [Update Environment với Domain](#3-update-environment-với-domain)
4. [Update Nginx Configuration for SSL](#4-update-nginx-configuration-for-ssl)
5. [Install SSL Certificate với Certbot](#5-install-ssl-certificate-với-certbot)
6. [Mount SSL Certificates vào Nginx Container](#6-mount-ssl-certificates-vào-nginx-container)
7. [Rebuild Frontend & Restart Services](#7-rebuild-frontend--restart-services)
8. [Test HTTPS](#8-test-https)
9. [Setup Auto-Renewal for SSL](#9-setup-auto-renewal-for-ssl)
10. [Optional: Enable Cloudflare Proxy](#10-optional-enable-cloudflare-proxy)
11. [Troubleshooting SSL](#11-troubleshooting-ssl)

---

## 1. Mua Domain Name

### Chọn Domain Provider

**Recommended Options:**

#### 1. **Cloudflare Registrar** (Cheapest)
- Cost: ~$9-10/year (.com)
- Free SSL, Free DNS, Free DDoS protection
- Link: https://www.cloudflare.com/products/registrar/

#### 2. **Namecheap** (Popular)
- Cost: ~$10-12/year (.com)
- Free WhoisGuard (privacy protection)
- Link: https://www.namecheap.com

#### 3. **Google Domains** → **Squarespace Domains**
- Cost: ~$12/year (.com)
- Clean interface, good support
- Link: https://domains.google

### Steps

```bash
1. Chọn domain name (vd: myecommerce.com)
2. Search availability
3. Add to cart
4. Complete payment
5. Note down your domain name
```

✅ **Domain purchased!**

---

## 2. Point DNS to VPS

### Configure DNS A Records

**Ví dụ với Cloudflare:**

```bash
1. Login vào Cloudflare Dashboard
2. Select your domain
3. Click "DNS" tab
4. Add 2 A records:

Record 1:
- Type: A
- Name: @ (hoặc để trống)
- IPv4 address: 178.128.216.11 (VPS IP của bạn)
- TTL: Auto
- Proxy status: DNS only (grey cloud)

Record 2:
- Type: A
- Name: www
- IPv4 address: 178.128.216.11 (VPS IP của bạn)
- TTL: Auto
- Proxy status: DNS only (grey cloud)
```

**⚠️ Important:**
- `@` record = root domain (example.com)
- `www` record = www subdomain (www.example.com)
- **Turn OFF Cloudflare proxy (grey cloud)** khi setup SSL lần đầu
- Sau khi SSL work, có thể bật proxy (orange cloud) để có DDoS protection

### Check DNS Propagation

```bash
# Wait 5-30 minutes for DNS propagation
# Check từ local machine:

# Option 1: dig command
dig example.com
dig www.example.com

# Should show:
# ;; ANSWER SECTION:
# example.com.    300    IN    A    178.128.216.11

# Option 2: nslookup
nslookup example.com
nslookup www.example.com

# Option 3: Online tool
# https://dnschecker.org
# Enter: example.com
# Should show green checkmarks globally
```

✅ **DNS configured!**

---

## 3. Update Environment với Domain

### SSH vào VPS

```bash
ssh deploy@178.128.216.11
cd /opt/E-Commerce
```

### Update .env File

```bash
# Backup current .env
cp .env .env.backup

# Edit .env
nano .env
```

**Thay đổi các dòng sau:**

```bash
# ===== BEFORE (IP-based) =====
ALLOWED_HOSTS=178.128.216.11
NEXT_PUBLIC_API_URL=http://178.128.216.11/api
NEXT_PUBLIC_WS_HOST=178.128.216.11
FRONTEND_URL=http://178.128.216.11
CORS_ALLOWED_ORIGINS=http://178.128.216.11

# ===== AFTER (Domain-based with HTTPS) =====
ALLOWED_HOSTS=example.com,www.example.com,178.128.216.11
NEXT_PUBLIC_API_URL=https://example.com/api
NEXT_PUBLIC_WS_HOST=example.com
FRONTEND_URL=https://example.com
CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com

# Note: Keep IP in ALLOWED_HOSTS for direct access
# Use HTTPS in URLs (will work after SSL setup)
```

**Ctrl+X → Y → Enter to save**

### Update Frontend Environment

```bash
# Extract NEXT_PUBLIC_* to frontend/.env.production
grep "^NEXT_PUBLIC" .env > frontend/.env.production

# Verify
cat frontend/.env.production

# Should show:
# NEXT_PUBLIC_API_URL=https://example.com/api
# NEXT_PUBLIC_WS_HOST=example.com
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

✅ **Environment updated!**

---

## 4. Update Nginx Configuration for SSL

```bash
cd /opt/E-Commerce

# Backup current config
cp nginx/default.conf nginx/default.conf.backup

# Edit nginx config
nano nginx/default.conf
```

**Replace entire content với:**

```nginx
# HTTP server - Redirect to HTTPS (except for Certbot validation)
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    
    # Certbot verification path
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;
    
    client_max_body_size 10M;
    
    # SSL certificates (will be created by Certbot)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    # SSL configuration (modern security)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Backend API
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
    
    # Django Admin
    location /django-admin/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /app/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias /app/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**⚠️ Important: Replace `example.com` với domain thực của bạn!**

**Ctrl+X → Y → Enter to save**

✅ **Nginx config updated!**

---

## 5. Install SSL Certificate với Certbot

### Stop Nginx Container

```bash
cd /opt/E-Commerce

# Stop nginx để Certbot có thể bind port 80
docker compose -f docker-compose.prod.yml stop nginx
```

### Install Certbot

```bash
# Update packages
sudo apt update

# Install Certbot
sudo apt install -y certbot
```

### Obtain SSL Certificate

```bash
# Get certificate với standalone mode
sudo certbot certonly --standalone \
  -d example.com \
  -d www.example.com

# Follow prompts:

# 1. Enter email address: your-email@example.com
# 2. Agree to Terms of Service: Y
# 3. Share email with EFF: N (optional)

# Output:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/example.com/fullchain.pem
# Key is saved at: /etc/letsencrypt/live/example.com/privkey.pem
# This certificate expires on 2026-04-13.
```

### Verify Certificates

```bash
# List certificates
sudo certbot certificates

# Check files exist
sudo ls -la /etc/letsencrypt/live/example.com/

# Output:
# fullchain.pem -> ../../archive/example.com/fullchain1.pem
# privkey.pem -> ../../archive/example.com/privkey1.pem
# cert.pem -> ../../archive/example.com/cert1.pem
# chain.pem -> ../../archive/example.com/chain1.pem
```

✅ **SSL certificate obtained!**

---

## 6. Mount SSL Certificates vào Nginx Container

### Update docker-compose.prod.yml

```bash
cd /opt/E-Commerce
nano docker-compose.prod.yml
```

**Find nginx service và thêm volumes:**

```yaml
  nginx:
    image: nginx:alpine
    container_name: ecommerce-nginx-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"  # Add HTTPS port
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - ./backend/staticfiles:/app/staticfiles
      - ./backend/media:/app/media
      - /etc/letsencrypt:/etc/letsencrypt:ro  # ← Add this line
      - /var/www/certbot:/var/www/certbot:ro   # ← Add this line
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_started
    networks:
      - ecommerce-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

**Ctrl+X → Y → Enter to save**

### Create Certbot Webroot

```bash
# Create directory for Certbot validation
sudo mkdir -p /var/www/certbot
sudo chown -R deploy:deploy /var/www/certbot
```

✅ **Docker Compose updated!**

---

## 7. Rebuild Frontend & Restart Services

### Rebuild Frontend với Domain URLs

```bash
cd /opt/E-Commerce

# Rebuild frontend với new environment
docker compose -f docker-compose.prod.yml build --no-cache frontend

# Output:
# Building frontend...
# [+] Building 45.2s (15/15) FINISHED
```

### Restart All Containers

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Output:
# Creating ecommerce-db-prod
# Creating ecommerce-redis-prod
# Creating ecommerce-backend-prod
# Creating ecommerce-frontend-prod
# Creating ecommerce-nginx-prod

# Check status
docker compose -f docker-compose.prod.yml ps

# All should be "Up"
```

### View Nginx Logs

```bash
# Check for SSL errors
docker compose -f docker-compose.prod.yml logs nginx -f

# Ctrl+C to exit

# Should see:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
# No SSL errors
```

✅ **Services restarted with SSL!**

---

## 8. Test HTTPS

### Test từ VPS

```bash
# Test HTTPS
curl -I https://example.com

# Output:
# HTTP/2 200
# server: nginx
# strict-transport-security: max-age=31536000; includeSubDomains

# Test API
curl https://example.com/api/products/

# Should return JSON response
```

### Test từ Browser

```bash
# Mở browser và access:
https://example.com

# ✅ Should see:
# - Green padlock icon 🔒
# - "Connection is secure"
# - Frontend loads correctly

# Test API endpoint:
https://example.com/api/products/

# Should return JSON

# Test Admin:
https://example.com/django-admin/

# Should show Django admin login
```

### Test HTTP Redirect

```bash
# Try HTTP (should redirect to HTTPS)
curl -I http://example.com

# Output:
# HTTP/1.1 301 Moved Permanently
# Location: https://example.com/
```

### SSL Check Tools

```bash
# Check SSL configuration
# Open: https://www.ssllabs.com/ssltest/
# Enter: example.com
# Should get: A or A+ rating

# Check certificate info
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates

# Output:
# notBefore=Jan 13 00:00:00 2026 GMT
# notAfter=Apr 13 23:59:59 2026 GMT
```

✅ **HTTPS working!**

---

## 9. Setup Auto-Renewal for SSL

Let's Encrypt certificates expire sau **90 ngày**. Setup auto-renewal:

### Test Renewal

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Output:
# Congratulations, all simulated renewals succeeded
```

### Option A: Systemd Timer (Recommended)

```bash
# Certbot tự động tạo systemd timer khi install
# Verify timer exists
sudo systemctl list-timers | grep certbot

# Output:
# certbot.timer    Thu 2026-01-14 00:00:00 UTC  certbot.service

# Enable timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check status
sudo systemctl status certbot.timer

# Output: active (waiting)
```

### Option B: Cron Job (Alternative)

```bash
# Edit root crontab
sudo crontab -e

# Add line (renew daily at 3 AM, restart nginx if renewed):
0 3 * * * certbot renew --quiet --deploy-hook "cd /opt/E-Commerce && docker compose -f docker-compose.prod.yml restart nginx"

# Save and exit
```

### Create Renewal Hook Script

```bash
# Create script to restart nginx after renewal
sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh

# Add content:
#!/bin/bash
cd /opt/E-Commerce
docker compose -f docker-compose.prod.yml restart nginx
echo "Nginx restarted after SSL renewal at $(date)" >> /var/log/certbot-renewal.log

# Save and make executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh
```

### Test Renewal with Hook

```bash
# Force renewal (for testing only)
sudo certbot renew --force-renewal

# Check if nginx restarted
docker compose -f docker-compose.prod.yml ps

# Check log
cat /var/log/certbot-renewal.log
```

✅ **Auto-renewal configured!**

---

## 10. Optional: Enable Cloudflare Proxy

Nếu dùng Cloudflare, có thể enable proxy để có thêm:
- DDoS protection
- CDN caching
- WAF (Web Application Firewall)

```bash
# 1. Vào Cloudflare Dashboard
# 2. Select domain → DNS
# 3. Click orange cloud icon cho A records
# 4. Should change from grey (DNS only) to orange (Proxied)

# ⚠️ Note: Khi enable Cloudflare proxy:
# - SSL mode: Full (strict) trong SSL/TLS settings
# - Origin certificate có thể dùng thay vì Let's Encrypt
# - Cloudflare terminates SSL, then re-encrypts to origin
```

---

## 11. Troubleshooting SSL

### Nginx không start sau add SSL

```bash
# Check nginx config syntax
docker run --rm \
  -v $(pwd)/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  nginx:alpine nginx -t

# Check certificates exist
sudo ls -la /etc/letsencrypt/live/example.com/

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx --tail 50
```

### Certificate not found error

```bash
# Error: cannot load certificate "/etc/letsencrypt/live/example.com/fullchain.pem"

# Check if certificates exist on host
sudo ls -la /etc/letsencrypt/live/example.com/

# Check docker-compose.yml has volume mounted
grep -A 10 "nginx:" docker-compose.prod.yml | grep letsencrypt

# Should show: - /etc/letsencrypt:/etc/letsencrypt:ro

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### DNS not resolving

```bash
# Check DNS from VPS
dig example.com @8.8.8.8

# Should return VPS IP

# Check from local machine
dig example.com

# Wait longer if DNS not propagated (up to 48 hours max)
```

### Browser shows "Not Secure"

```bash
# Check certificate validity
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates

# Check if nginx serving correct cert
curl -vI https://example.com 2>&1 | grep -E "subject:|issuer:"

# Force browser refresh: Ctrl+Shift+R (hard refresh)
```

### Mixed content warnings

```bash
# Frontend loads but API calls fail with mixed content

# Check frontend .env.production
cat frontend/.env.production

# Should be HTTPS:
# NEXT_PUBLIC_API_URL=https://example.com/api  ← Must be HTTPS

# If HTTP, update and rebuild:
nano .env
# Change to HTTPS
grep "^NEXT_PUBLIC" .env > frontend/.env.production
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml restart frontend
```

---

## 🎯 Summary

**Domain & SSL Setup Complete!** 🎉

**Bây giờ bạn đã có:**
1. ✅ Custom domain name (example.com)
2. ✅ HTTPS encryption (TLS 1.2/1.3)
3. ✅ Valid SSL certificate (Let's Encrypt)
4. ✅ Auto HTTP → HTTPS redirect
5. ✅ Auto SSL renewal (every 90 days)
6. ✅ Security headers enabled
7. ✅ A+ SSL rating
8. ✅ Professional production setup

**Access URLs:**
- Frontend: `https://example.com`
- API: `https://example.com/api/`
- Admin: `https://example.com/django-admin/`

**Cost:**
- Domain: ~$10/year
- SSL: **FREE** (Let's Encrypt)

**Security Features:**
- ✅ TLS 1.2/1.3 encryption
- ✅ Strong cipher suites
- ✅ HSTS (Strict-Transport-Security)
- ✅ X-Frame-Options protection
- ✅ XSS protection headers
- ✅ Content-Type sniffing protection

**Maintenance:**
- SSL auto-renews every 90 days
- No manual intervention needed
- Check renewal logs: `/var/log/letsencrypt/letsencrypt.log`

**Next Steps:**
- Muốn auto-deploy khi push code? → Xem CI/CD với GitHub Actions
- Muốn monitor uptime? → Setup UptimeRobot hoặc Pingdom
- Muốn improve SEO? → Add sitemap.xml và robots.txt
