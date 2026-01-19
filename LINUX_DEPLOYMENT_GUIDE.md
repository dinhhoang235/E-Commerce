# 🚀 Deployment Guide - E-Commerce Platform

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DigitalOcean Droplet (Ubuntu 22.04)       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Frontend (Next.js)                                 │    │
│  │ Port 3000 (PM2/Systemd)                            │    │
│  │ /var/www/frontend                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                            ↑                                │
│                     Nginx Reverse Proxy                     │
│                        (Port 80/443)                        │
│                            ↓                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Backend (Django + Gunicorn)                        │    │
│  │ Port 8000 (Supervisor + Gunicorn)                  │    │
│  │ /var/www/backend                                   │    │
│  └────────────────────────────────────────────────────┘    │
│         ↓                         ↓                         │
│    MySQL 8.0              Redis (local/managed)            │
│    Port 3306              Port 6379                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Media Storage (Local VPS) - /var/www/backend/media │    │
│  │ Served via Nginx                                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User (Browser)
    ↓
HTTPS (Port 443)
    ↓
Nginx (Public IP)
    ↓
Frontend (Next.js) ← → Backend API (Django)
    ↓                      ↓
    |              ┌───────┼───────┐
    |              ↓       ↓       ↓
    └──→ MySQL  Redis  Media (Local)
```

---

## ✅ Yêu Cầu

**Kiến Thức:**
- ✅ SSH basics (login, commands)
- ✅ Linux terminal (cd, mkdir, chmod, etc)
- ✅ Vim hoặc nano editor
- ✅ Basic bash scripting
- ✅ Process management (ps, kill, systemctl)

**Tools:**
- ✅ SSH client (Terminal/PowerShell)
- ✅ DigitalOcean CLI - `doctl` (optional, có thể dùng Web UI)
- ✅ Text editor (VSCode remote SSH là tốt)

**DigitalOcean Resources:**
- ✅ DigitalOcean account (free $200 credit cho 60 ngày)
- ✅ Droplet (Ubuntu 22.04 LTS) - 2GB RAM recommended
- ✅ (Optional) Managed Database for MySQL
- ✅ (Optional) Managed Redis

---

## BƯỚC 1: Tạo DigitalOcean Droplet

### 1.1 Option A: Tạo Droplet qua Web UI (Recommended cho người mới)

1. **Đăng nhập**: Vào [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. **Tạo Droplet**: Click "Create" → "Droplets"
3. **Chọn Image**: Ubuntu 22.04 LTS (x64)
4. **Chọn Size**: 
   - **Basic Plan** → Regular (Disk type: SSD)
   - **CPU Option**: Regular Intel
   - **Droplet Size**: `$6/month` (1GB RAM, 1 vCPU, 25GB SSD) hoặc `$12/month` (2GB RAM, 1 vCPU, 50GB SSD)
5. **Chọn Region**: Singapore (sgp1) hoặc gần bạn nhất
6. **Authentication**: 
   - Chọn "Password"
   - Nhập password mạnh (ít nhất 12 ký tự, bao gồm chữ hoa, chữ thường, số, ký tự đặc biệt)
   - **Lưu password này lại!** Bạn sẽ cần nó để SSH vào server
7. **Hostname**: `ecommerce-droplet`
8. **Tags**: `ecommerce`, `production`
9. Click **"Create Droplet"**

⏱️ **Chờ ~55 giây** → Droplet sẽ sẵn sàng!

✅ **Droplet created via Web UI!**

### 1.2 Option B: Tạo Droplet qua CLI (Advanced)

```bash
# Install doctl
# macOS:
brew install doctl

# Linux:
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz
tar xf doctl-1.94.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate (lấy token tại: https://cloud.digitalocean.com/account/api/tokens)
doctl auth init
# Paste API token khi được hỏi

# Set variables
DROPLET_NAME="ecommerce-droplet"
REGION="sgp1"  # Singapore
SIZE="s-1vcpu-2gb"  # $12/month: 1 vCPU, 2GB RAM, 50GB SSD
IMAGE="ubuntu-22-04-x64"

# Create droplet (sẽ gửi password qua email)
doctl compute droplet create $DROPLET_NAME \
  --region $REGION \
  --size $SIZE \
  --image $IMAGE \
  --tag-names ecommerce,production \
  --wait

# Output:
# ID          Name        FingerPrint
# 12345678    my-laptop   xx:xx:xx:...

# Set variables
DROPLET_NAME="ecommerce-droplet"
REGION="sgp1"  # Singapore
SIZE="s-1vcpu-2gb"  # $12/month: 1 vCPU, 2GB RAM, 50GB SSD
IMAGE="ubuntu-22-04-x64"

# Create droplet (sẽ gửi password qua email)
doctl compute droplet create $DROPLET_NAME \
  --region $REGION \
  --size $SIZE \
  --image $IMAGE \
  --tag-names ecommerce,production \
  --wait

# Output:
# ID           Name                 Public IPv4      Status
# 123456789    ecommerce-droplet    128.199.xxx.xxx  active

# Get droplet info
doctl compute droplet get 123456789

# Or list all droplets
doctl compute droplet list
```

> **⚠️ Lưu ý**: Root password sẽ được gửi qua email đã đăng ký với DigitalOcean

✅ **Droplet created via CLI!**

### 1.3 Lấy Public IP

```bash
# Từ Web UI: Vào Droplets → Click vào droplet → Xem "ipv4"
# Từ CLI:
doctl compute droplet list --format Name,PublicIPv4

# Output:
# Name                 Public IPv4
# ecommerce-droplet    128.199.xxx.xxx
```

💾 **Lưu public IP: `128.199.xxx.xxx`**

### 1.4 Setup Firewall (Cloud Firewall)

```bash
# Option A: Via Web UI
# 1. Vào "Networking" → "Firewalls"
# 2. Click "Create Firewall"
# 3. Name: "ecommerce-firewall"
# 4. Inbound Rules:
#    - SSH (22) → All IPv4, All IPv6
#    - HTTP (80) → All IPv4, All IPv6
#    - HTTPS (443) → All IPv4, All IPv6
# 5. Outbound Rules: All TCP, All UDP, All ICMP
# 6. Apply to Droplets: ecommerce-droplet
# 7. Click "Create Firewall"

# Option B: Via CLI
doctl compute firewall create \
  --name ecommerce-firewall \
  --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:80,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:443,address:0.0.0.0/0,address:::/0" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0,address:::/0 protocol:udp,ports:all,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0" \
  --droplet-ids 123456789

# Verify
doctl compute firewall list
```

✅ **Firewall created!**

---

## BƯỚC 2: Setup Initial Linux

### 2.1 SSH vào Droplet

```bash
# Thay IP bằng public IP của Droplet
ssh root@128.199.xxx.xxx

# Nhập password khi được hỏi (từ email hoặc password đã đặt khi tạo Droplet)

# Nếu được hỏi "Are you sure want to continue?"
# → Type: yes

# Output:
# Welcome to Ubuntu 22.04.1 LTS (GNU/Linux 5.15.0-... x86_64)
# ...
# root@ecommerce-droplet:~#
```

✅ **SSH login successful!**

> **Note**: DigitalOcean mặc định dùng user `root`. Sau này ta sẽ tạo user mới để bảo mật hơn.

### 2.2 Tạo Non-root User (Security Best Practice)

```bash
# Tạo user mới
adduser deploy
# Nhập password khi được hỏi (tạo password mới cho user deploy)
# Các câu hỏi khác có thể Enter để skip

# Add user vào sudo group
usermod -aG sudo deploy

# Switch sang user mới
su - deploy

# Test sudo
sudo ls -la /root
# Nhập password của user deploy

# Output: Nếu thấy files → sudo working!
```

✅ **Non-root user created!**

> **Lưu ý**: Từ giờ dùng `ssh deploy@128.199.xxx.xxx` thay vì root

### 2.3 Update System

```bash
# Update packages
sudo apt update
sudo apt upgrade -y

# Install essential tools
sudo apt install -y \
  build-essential \
  curl \
  wget \
  git \
  vim \
  htop \
  net-tools \
  ufw

# Thay đổi timezone (nếu cần)
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Check thời gian
date
```

✅ **System updated!**

### 2.4 Setup Firewall (UFW)

> **Note**: UFW là software firewall trên server. DigitalOcean Cloud Firewall đã được setup ở BƯỚC 1.5

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (rất quan trọng, không bị lock out)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
# Output:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
# ...
```

✅ **Firewall configured!**

### 2.5 Create App Directory

```bash
# Tạo thư mục chứa apps
sudo mkdir -p /var/www

# Set permissions (thay azureuser thành deploy)
sudo chown -R deploy:deploy /var/www
chmod -R 755 /var/www

# Verify
ls -la /var/www
# Output:
# drwxr-xr-x  2 deploy deploy 4096 Jan 12 10:00 .
# drwxr-xr-x 13 root   root   4096 Jan 12 09:55 ..
```

✅ **Directories created!**

---

## BƯỚC 3: Cài Dependencies

### 3.1 Cài Python 3.11

```bash
# Add Python repository
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# ⚠️ IMPORTANT: Cài MySQL development headers (cho mysqlclient)
sudo apt install -y pkg-config default-libmysqlclient-dev

# Cài Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Check version
python3.11 --version
# Output: Python 3.11.X
```

✅ **Python 3.11 installed!**

> **Note**: Virtual environment sẽ được tạo sau khi clone repository ở BƯỚC 4.2

> **Note**: Nếu gặp lỗi `pkg-config: not found` khi `pip install -r requirements.txt`, chạy:
> ```bash
> sudo apt install -y pkg-config default-libmysqlclient-dev
> pip install -r requirements.txt
> ```

### 3.2 Cài Node.js 22

```bash
# Cách 1: Từ NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
# Output: v22.x.x
npm --version
# Output: x.x.x

# Upgrade npm
sudo npm install -g npm@latest

# (Optional) Cài PM2 cho auto-restart
sudo npm install -g pm2
```

✅ **Node.js 22 installed!**

### 3.3 Cài MySQL

```bash
# Option A: MySQL Server (local) - Recommended for small apps
sudo apt install -y mysql-server mysql-client

# Secure MySQL
sudo mysql_secure_installation
# Follow prompts:
# - Remove anonymous users? → Y
# - Disable root login remotely? → Y
# - Remove test database? → Y
# - Reload privilege tables? → Y

# Check status
sudo systemctl status mysql

# Verify
mysql --version
# Output: mysql  Ver 8.0.X...

# Option B: Dùng DigitalOcean Managed MySQL (xem BƯỚC 8 Option B)
# → Skip MySQL install, config connection string thay vào
```

✅ **MySQL 8.0 installed!**

### 3.4 Cài Redis

```bash
# Cài Redis
sudo apt install -y redis-server

# Check status
sudo systemctl status redis-server

# Verify
redis-cli --version
# Output: redis-cli X.X.X

# Test connection
redis-cli ping
# Output: PONG

# (Optional) Set Redis password
sudo nano /etc/redis/redis.conf
# Tìm: # requirepass foobared
# Sửa thành: requirepass your_strong_password_here
# Ctrl+X → Y → Enter

# Restart Redis
sudo systemctl restart redis-server

# Test with password
redis-cli -a your_strong_password_here ping
# Output: PONG
```

✅ **Redis installed!**

### 3.5 Cài Nginx

```bash
sudo apt install -y nginx

# Check status
sudo systemctl status nginx

# Verify
nginx -v
# Output: nginx/X.X.X
```

✅ **Nginx installed!**

### 3.6 Cài Supervisor (Process Manager)

```bash
sudo apt install -y supervisor

# Check status
sudo systemctl status supervisor

# Verify
supervisorctl --version
```

✅ **Supervisor installed!**

### 3.7 Cài Certbot (SSL/TLS)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Verify
certbot --version
```

✅ **Certbot installed!**

---

## BƯỚC 4: Deploy Backend (Django + Gunicorn)

### 4.1 Clone Repository (Monorepo với Symlink)

> **Note**: Vì repo chứa cả backend + frontend (monorepo), ta sẽ clone vào `/opt/E-Commerce` và tạo symlink

```bash
# Clone toàn bộ repo vào /opt/E-Commerce
cd /opt
sudo git clone https://github.com/dinhhoang235/E-Commerce.git
sudo chown -R deploy:deploy /opt/E-Commerce

# Tạo symlink cho backend và frontend
sudo ln -s /opt/E-Commerce/backend /var/www/backend
sudo ln -s /opt/E-Commerce/frontend /var/www/frontend

# Verify symlinks
ls -la /var/www/
# Output:
# lrwxrwxrwx  1 root root   27 Dec 22 10:00 backend -> /opt/E-Commerce/backend
# lrwxrwxrwx  1 root root   28 Dec 22 10:00 frontend -> /opt/E-Commerce/frontend

# Verify backend files
ls -la /var/www/backend
# Output:
# -rw-r--r--  manage.py
# -rw-r--r--  requirements.txt
# -rwxr-xr-x  entrypoint.sh
# ...
```

✅ **Repository cloned & symlinks created!**

> **Lợi ích của cách này:**
> - ✅ Clone 1 lần, dùng cho cả backend + frontend
> - ✅ Update code dễ dàng: `cd /opt/E-Commerce && git pull`
> - ✅ Quản lý version tập trung
> - ✅ Dễ rollback nếu cần

### 4.2 Install Python Dependencies

```bash
cd /var/www/backend

# Create virtual environment (vì backend là symlink từ /opt/E-Commerce/backend)
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install from requirements.txt
pip install -r requirements.txt

# Output:
# Successfully installed Django==5.1.2 mysqlclient==2.2.5 ...

# Verify key packages
pip list | grep -E "Django|gunicorn|redis"
# Output:
# Django        5.1.2
# gunicorn      22.0.0
# redis         5.0.1
# ...
```

✅ **Backend dependencies installed!**

### 4.3 Setup Environment Variables (Backend)

> **Note**: Vì bạn dùng **Monorepo**, tạo 2 file riêng:
> - `/var/www/backend/.env` (Django)
> - `/var/www/frontend/.env.local` (Next.js)

```bash
# Create .env file for backend
nano /var/www/backend/.env

# Add content 
DEBUG=False
SECRET_KEY=...
ALLOWED_HOSTS=localhost,127.0.0.1,128.199.xxx.xxx,example.com

# Database setting
DB_ENGINE=django.db.backends.mysql
DB_NAME=e_commerce
DB_USER=admin
DB_PASSWORD=Admin123@
DB_HOST=localhost
DB_PORT=3306

# Database Configuration
MYSQL_ROOT_PASSWORD=Admin123@
MYSQL_DATABASE=e_commerce
MYSQL_USER=admin
MYSQL_PASSWORD=Admin123@

# Redis Configuration 
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Backend Configuration
DJANGO_PORT=8000

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_WS_HOST=localhost
FRONTEND_URL=http://localhost

# Payment Key (Stripe - sẽ config sau)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here

# Media files được serve từ local VPS (xem BƯỚC 9)
# Không cần object storage credentials

# Ctrl+X → Y → Enter để save
```

⚠️ **QUAN TRỌNG**:

- Thay `DB_PASSWORD` từ `Admin123@` → **strong password** cho production
- Thay `STRIPE_SECRET_KEY` → real Stripe keys
- Thay `128.199.xxx.xxx` → public IP của Droplet bạn
- Nếu có domain, thay `example.com` vào `ALLOWED_HOSTS`

✅ **.env file created!**

### 4.4 Setup MySQL Database

```bash
# Login to MySQL
mysql -u root -p
# Enter password (từ mysql_secure_installation)

# In MySQL shell:
CREATE DATABASE e_commerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'Admin123@';
GRANT ALL PRIVILEGES ON e_commerce.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Verify
mysql -u admin -p -D e_commerce -e "SELECT 1"
# Output: 1 (connection OK)
```

✅ **MySQL database created!**

### 4.5 Django Migrations & Static Files

```bash
cd /var/www/backend
source venv/bin/activate

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Output:
# Running migrations:
#   Applying admin.0001_initial... OK
#   Applying auth.0001_initial... OK
#   ...

# Collect static files (IMPORTANT for production)
python manage.py collectstatic --noinput

# Output:
# Found X static files to collect
# Installed X collected files to '/var/www/backend/staticfiles'.

# Create superuser (optional, để login admin)
python manage.py createsuperuser
# Follow prompts...
```

✅ **Database migrations done!**

### 4.6 Test Backend Locally

```bash
cd /var/www/backend
source venv/bin/activate

# Run with Gunicorn (chỉ test, không phải production yet)
gunicorn --bind 0.0.0.0:8000 backend.wsgi:application

# Output:
# [2024-12-16 10:30:00 +0000] [12345] [INFO] Listening at: http://0.0.0.0:8000

# Mở terminal khác test:
curl http://localhost:8000/api/products/
# Hoặc từ local machine:
# curl http://128.199.xxx.xxx:8000/api/products/

# Ctrl+C để stop
```

✅ **Backend running!**

### 4.7 Setup Gunicorn + Supervisor (Auto-restart)

```bash
# Create Supervisor config file
sudo nano /etc/supervisor/conf.d/ecommerce-backend.conf

# Add content:
[program:ecommerce-backend]
directory=/var/www/backend
command=/var/www/backend/venv/bin/gunicorn --workers 4 --worker-class sync --bind 127.0.0.1:8000 --access-logfile /var/log/ecommerce-backend-access.log --error-logfile /var/log/ecommerce-backend-error.log backend.wsgi:application
user=deploy
autostart=true
autorestart=true
stopwaitsecs=10
numprocs=1
priority=999
startsecs=10
# Add log:
stdout_logfile=/var/log/ecommerce-backend-stdout.log
stderr_logfile=/var/log/ecommerce-backend-stderr.log
# Ctrl+X → Y → Enter

# Reread supervisor
sudo supervisorctl reread

# Add/update program
sudo supervisorctl add ecommerce-backend
# hoặc
sudo supervisorctl update

# Check status
sudo supervisorctl status ecommerce-backend
# Output: ecommerce-backend        RUNNING   pid 12345, uptime 0:00:30

# View logs
sudo tail -f /var/log/ecommerce-backend-error.log
```

✅ **Backend deployed with Supervisor!**

---

## BƯỚC 5: Deploy Frontend (Next.js)

### 5.1 Verify Frontend Symlink

> **Note**: Frontend đã được symlink từ BƯỚC 4.1, không cần clone lại

```bash
# Verify symlink
ls -la /var/www/frontend
# Output: lrwxrwxrwx -> /opt/E-Commerce/frontend

# Verify files
ls -la /var/www/frontend/
# Output:
# -rw-r--r--  package.json
# -rw-r--r--  next.config.ts
# drwxr-xr-x  src
# ...
```

✅ **Frontend symlink verified!**

### 5.2 Install Node Dependencies

```bash
cd /var/www/frontend

# Install
npm install

# Output:
# added X packages in Xs

# Verify
npm list next
# Output: next@15.x.x
```

✅ **Frontend dependencies installed!**

### 5.3 Setup Environment Variables (Frontend)

```bash
# Create .env.local file for frontend
nano /var/www/frontend/.env.local

# Add content (only NEXT_PUBLIC_* variables):
NEXT_PUBLIC_API_URL=http://***/api
NEXT_PUBLIC_WS_HOST=***
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Ctrl+X → Y → Enter
```

✅ **.env.local file created!**

> **Note**: Next.js chỉ access variables có prefix `NEXT_PUBLIC_`, nên không cần `SECRET_KEY`, `DB_PASSWORD`, v.v.
> 
> Các secret keys (Stripe Secret, DB Password) **chỉ ở backend .env**

### 5.4 Build Next.js

```bash
cd /var/www/frontend

# Build for production
npm run build

# Output:
# ✓ Compiled client and server successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages (X/X)
# ✓ Finalizing page optimization
# Route (pages)                              Size       First Load JS
# ┌ ○ /                                      123 kB          234 kB
# ├ ○ /_app                                  12.3 kB         XX kB
# ...
# ✓ Build completed successfully in 2.5m

# Verify build
ls -la /var/www/frontend/.next
```

✅ **Frontend built!**

### 5.5 Test Frontend Locally

```bash
cd /var/www/frontend

# Start production server
npm run start

# Output:
#   ▲ Next.js 15.x.x
#   - Local:        http://localhost:3000
#   - Environments: .env.local
#
#  ✓ Ready in 0.5s

# Test từ local machine:
# curl http://128.199.xxx.xxx:3000

# Ctrl+C để stop
```

✅ **Frontend running!**

### 5.6 Setup PM2 + Systemd (Auto-restart)

```bash
# Install PM2 globally (already done in BƯỚC 3.2)
# Verify PM2
pm2 --version
# Output: X.X.X

# Start frontend with PM2
cd /var/www/frontend
pm2 start npm --name "ecommerce-frontend" -- start

# Check status
pm2 status
# Output:
# ┌─────────────────────┬────┬─────────┬──────┬──────────┬
# │ Name                │ id │ version │ mode │ status   │
# ├─────────────────────┼────┼─────────┼──────┼──────────┤
# │ ecommerce-frontend  │ 0  │ 15.x.x  │ fork │ online   │
# └─────────────────────┴────┴─────────┴──────┴──────────┘

# Save PM2 config to auto-start on reboot
pm2 save

# Setup systemd integration
sudo pm2 startup systemd -u deploy --hp /home/deploy

# Output:
# [PM2] Creating /etc/systemd/system/pm2-deploy.service
# [PM2] systemctl daemon-reload
# [PM2] Loaded PM2 startup script in systemd:
#
# [PM2] Service started. System will start PM2 on boot.

# Verify
sudo systemctl status pm2-deploy
# Output: active (running)

# View logs
pm2 logs ecommerce-frontend
```

✅ **Frontend deployed with PM2!**

---

## BƯỚC 6: Setup Nginx Reverse Proxy

### 6.1 Create Nginx Config

```bash
# Create config file
sudo nano /etc/nginx/sites-available/ecommerce

# Add content:
upstream backend {
    server 127.0.0.1:8000;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;  # Catch-all, sẽ thay domain sau

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Django Admin (changed to avoid conflict with Next.js admin)
    location /django-admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (từ collectstatic)
    location /staticfiles/ {
        alias /var/www/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files (serve from local)
    location /media/ {
        alias /var/www/backend/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
}

# Ctrl+X → Y → Enter
```

### 6.2 Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/

# Test config
sudo nginx -t
# Output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is OK
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

✅ **Nginx configured!**

### 6.3 Test

```bash
# Test từ VM
curl http://localhost

# Test từ local machine
curl http://128.199.xxx.xxx

# Hoặc mở browser:
# http://128.199.xxx.xxx

# Nếu thấy frontend homepage → ✅ Success!
# Nếu error → check logs:
sudo tail -f /var/log/nginx/error.log
```

---

## BƯỚC 7: Setup SSL/HTTPS (Let's Encrypt)

### 7.1 Setup Domain (Nếu Có)

```bash
# Nếu bạn có domain, point DNS tới Droplet's public IP
# Ví dụ: example.com → 128.199.xxx.xxx

# Verify DNS
dig example.com
# hoặc
nslookup example.com

# Verify từ VM
curl http://example.com
```

### 7.2 Get SSL Certificate

```bash
# Nếu có domain
sudo certbot --nginx -d example.com

# Hoặc dùng IP (self-signed, không recommended cho production):
sudo certbot certonly --standalone -d 128.199.xxx.xxx

# Certbot sẽ auto-update Nginx config
# Output:
# Congratulations! Your certificate has been issued.
# Certificate is saved at: /etc/letsencrypt/live/example.com/fullchain.pem
# Key is saved at: /etc/letsencrypt/live/example.com/privkey.pem

# Check certificate
sudo certbot certificates
```

✅ **SSL certificate installed!**

### 7.3 Auto-Renew

```bash
# Certbot auto-renewal (already enabled)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check renewal
sudo systemctl status certbot.timer
# Output: active (running)

# Manual test renew
sudo certbot renew --dry-run
```

✅ **Auto-renewal setup!**

---

## BƯỚC 8: Database Setup

### Option A: Local MySQL (Already Done in BƯỚC 3.3 & 4.4)

✅ MySQL local is running

### Option B: DigitalOcean Managed Database for MySQL

```bash
# Via Web UI (Recommended):
# 1. Vào "Databases" → "Create Database Cluster"
# 2. Database Engine: MySQL 8
# 3. Plan: Basic ($15/month - 1GB RAM, 1 vCPU, 10GB Storage)
# 4. Datacenter: Singapore (sgp1) - same region as Droplet
# 5. Database cluster name: ecommerce-mysql-db
# 6. Tags: ecommerce, production
# 7. Click "Create Database Cluster"

# Via CLI:
doctl databases create ecommerce-mysql-db \
  --engine mysql \
  --region sgp1 \
  --size db-s-1vcpu-1gb \
  --version 8

# Wait ~10 minutes for provisioning...

# Get connection info
doctl databases connection ecommerce-mysql-db

# Output:
# host      = ecommerce-mysql-db-do-user-123456-0.b.db.ondigitalocean.com
# port      = 25060
# user      = doadmin
# password  = random_generated_password
# database  = defaultdb
# sslmode   = require

# Add Droplet to trusted sources
doctl databases firewalls append ecommerce-mysql-db \
  --rule ip_addr:128.199.xxx.xxx

# Or via Web UI:
# 1. Click vào database cluster
# 2. "Settings" → "Trusted Sources"
# 3. Add: ecommerce-droplet

# Create database
mysql -h ecommerce-mysql-db-do-user-123456-0.b.db.ondigitalocean.com \
  -P 25060 \
  -u doadmin \
  -p \
  --ssl-mode=REQUIRED \
  -e "CREATE DATABASE e_commerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Update .env
nano /var/www/backend/.env
# Change:
# DB_HOST=ecommerce-mysql-db-do-user-123456-0.b.db.ondigitalocean.com
# DB_PORT=25060
# DB_USER=doadmin
# DB_PASSWORD=random_generated_password

# Restart backend
sudo supervisorctl restart ecommerce-backend
```

✅ **Managed MySQL setup!**

---

## BƯỚC 9: Storage Setup (Local Media Files)

> **Note**: Trong setup này, media files sẽ được lưu trực tiếp trên VPS thay vì dùng object storage. Phù hợp cho:
> - Dự án nhỏ/vừa
> - Budget hạn chế
> - Ít file upload
> - Không cần CDN

### 9.1 Setup Media Directory

```bash
# Create media directory
cd /var/www/backend
mkdir -p media

# Set permissions
sudo chown -R deploy:deploy media
chmod -R 755 media

# Verify
ls -la media/
# Output:
# drwxr-xr-x  2 deploy deploy 4096 Jan 12 10:00 .
```

✅ **Media directory created!**

### 9.2 Configure Django Settings

```bash
# Edit Django settings
nano /var/www/backend/backend/settings.py

# Verify/Update media settings (should be already configured):
# MEDIA_URL = '/media/'
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# For production, ensure this is set:
# STORAGES = {
#     "default": {
#         "BACKEND": "django.core.files.storage.FileSystemStorage",
#     },
#     "staticfiles": {
#         "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
#     },
# }

# Save and exit
```

✅ **Django settings verified!**

### 9.3 Nginx Configuration (Already Done in BƯỚC 6)

> **Note**: Nginx đã được cấu hình để serve media files ở BƯỚC 6.1:
> ```nginx
> location /media/ {
>     alias /var/www/backend/media/;
>     expires 7d;
>     add_header Cache-Control "public";
> }
> ```

### 9.4 Test Media Upload

```bash
# Test upload via Django admin
# 1. Login to admin: http://128.199.xxx.xxx/admin/
# 2. Upload một file (product image, category image, etc.)
# 3. Verify file trong media directory:
ls -la /var/www/backend/media/

# Test access file:
curl http://128.199.xxx.xxx/media/products/test-image.jpg
# Should return image data or 404 if not exists
```

✅ **Media storage working!**

### 9.5 Setup Backup cho Media Files (Recommended)

```bash
# Create backup script
nano ~/backup-media.sh

# Add content:
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz -C /var/www/backend media/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "media_*.tar.gz" -mtime +7 -delete

echo "Media backup completed: $BACKUP_DIR/media_$DATE.tar.gz"

# Save and exit
chmod +x ~/backup-media.sh

# Test backup
~/backup-media.sh

# Add to crontab (daily backup at 2 AM)
crontab -e
# Add line:
# 0 2 * * * /home/deploy/backup-media.sh >> /home/deploy/backup.log 2>&1

# Verify crontab
crontab -l
```

✅ **Media backup configured!**

> **💡 Tip**: Nếu sau này cần scale hoặc muốn dùng CDN, có thể migrate sang DigitalOcean Spaces:
> - Cost: ~$5/month for 250GB storage + CDN
> - Better performance với CDN
> - Dễ scale khi traffic tăng

---

## BƯỚC 10: Monitoring & Logs

### 10.1 View Logs

```bash
# Backend logs
sudo tail -f /var/log/ecommerce-backend-error.log

# Frontend logs
pm2 logs ecommerce-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u ecommerce-backend -f
sudo journalctl -u pm2-deploy -f
```

### 10.2 Monitor Resources

```bash
# CPU, Memory, Disk
htop

# Disk usage
df -h

# Process info
ps aux | grep gunicorn
ps aux | grep node
```

### 10.3 Check Services Status

```bash
# Supervisor
sudo supervisorctl status

# PM2
pm2 status

# Nginx
sudo systemctl status nginx

# MySQL
sudo systemctl status mysql

# Redis
sudo systemctl status redis-server
```

---

## BƯỚC 11: Auto-restart & Systemd

### 11.1 Already Configured

- ✅ Supervisor → auto-restart gunicorn (Django)
- ✅ PM2 + systemd → auto-restart Node.js (Next.js)
- ✅ Nginx → auto-restart on reboot
- ✅ MySQL → auto-restart on reboot

### 11.2 Update Code từ Git (Production Workflow)

```bash
# Khi có code mới trên GitHub, update như sau:

# 1. Pull code mới từ GitHub
cd /opt/E-Commerce
git pull origin main

# 2. Update backend dependencies (nếu có thay đổi requirements.txt)
cd /var/www/backend
source venv/bin/activate
pip install -r requirements.txt

# 3. Run migrations (nếu có thay đổi models)
python manage.py migrate

# 4. Collect static files (nếu có thay đổi static)
python manage.py collectstatic --noinput

# 5. Restart backend
sudo supervisorctl restart ecommerce-backend

# 6. Update frontend dependencies (nếu có thay đổi package.json)
cd /var/www/frontend
npm install

# 7. Rebuild frontend
npm run build

# 8. Restart frontend
pm2 restart ecommerce-frontend

# 9. Check logs
sudo tail -f /var/log/ecommerce-backend-error.log
pm2 logs ecommerce-frontend --lines 50
```

✅ **Code updated & deployed!**

> **💡 Tip**: Tạo deployment script để tự động hóa:
> ```bash
> nano ~/deploy.sh
> # Paste nội dung trên vào file
> chmod +x ~/deploy.sh
> # Lần sau chỉ cần: ~/deploy.sh
> ```

### 11.3 Test Auto-restart

```bash
# Kill backend process
sudo supervisorctl stop ecommerce-backend

# Check status (should restart auto)
sleep 5
sudo supervisorctl status ecommerce-backend
# Output: RUNNING

# Kill frontend process
pm2 delete ecommerce-frontend

# Check status (should restart auto)
sleep 5
pm2 status
# Output: online
```

---

## 🧪 Final Testing

### 11.4 Test Full Stack

```bash
# Test Frontend
curl http://128.199.xxx.xxx

# Test API
curl http://128.199.xxx.xxx/api/products/

# Test Admin
curl http://128.199.xxx.xxx/admin/

# Test Database
mysql -u admin -p e_commerce -e "SELECT COUNT(*) FROM products_product;"

# Test Media Upload (upload file via admin and check in /var/www/backend/media/)
ls -la /var/www/backend/media/
```

---

## 📋 Checklist

- [ ] Droplet created (public IP noted)
- [ ] Non-root user created & SSH login working
- [ ] System updated & firewall enabled (UFW + Cloud Firewall)
- [ ] Python 3.11 installed
- [ ] Node.js 22 installed
- [ ] MySQL 8.0 installed & database created
- [ ] Redis installed & running
- [ ] Nginx installed & running
- [ ] Backend cloned & dependencies installed
- [ ] Frontend cloned & dependencies installed
- [ ] Django migrations done
- [ ] Gunicorn + Supervisor configured
- [ ] PM2 + Next.js configured
- [ ] Nginx reverse proxy working
- [ ] SSL/HTTPS working (if domain available)
- [ ] Media storage configured (local VPS)
- [ ] All services auto-restart on reboot
- [ ] Logs monitored & accessible
- [ ] Full stack test passed

---

## 🆘 Troubleshooting

### Backend không kết nối Database

```bash
# Check MySQL running
sudo systemctl status mysql

# Check connection
mysql -u admin -p e_commerce -e "SELECT 1"

# Check .env file
cat /var/www/backend/.env | grep -E "DB_|REDIS_"

# Check Supervisor logs
sudo tail -f /var/log/ecommerce-backend-error.log

# Manual test Django
cd /var/www/backend
source venv/bin/activate
python manage.py dbshell
# Nếu kết nối được → ✅ Database OK
```

### Frontend không thấy Backend API

```bash
# Check NEXT_PUBLIC_API_URL
cat /var/www/frontend/.env.local

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check proxy pass
sudo nginx -T | grep -A 10 "location /api"

# Rebuild frontend
cd /var/www/frontend
npm run build
pm2 restart ecommerce-frontend
```

### Nginx 502 Bad Gateway

```bash
# Check backend running
sudo supervisorctl status ecommerce-backend

# Check port listening
sudo ss -tlnp | grep 8000

# Restart backend
sudo supervisorctl restart ecommerce-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### High Memory/CPU Usage

```bash
# Find resource hogs
top

# Kill process
kill -9 <PID>

# Increase workers
sudo nano /etc/supervisor/conf.d/ecommerce-backend.conf
# Change: --workers 4 → --workers 2 (hoặc tùy)

# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update ecommerce-backend
```

## 📚 Reference Commands

### Quick Restart All

```bash
# Restart everything
sudo systemctl restart mysql
sudo systemctl restart redis-server
sudo systemctl restart nginx
sudo supervisorctl restart ecommerce-backend
pm2 restart ecommerce-frontend
```

### Backup

```bash
# Backup MySQL
mysqldump -u admin -p e_commerce > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup to Spaces (using s3cmd)
# Install s3cmd first:
sudo apt install -y s3cmd
s3cmd --configure
# Enter Spaces credentials...

# Upload backup
s3cmd put backup_*.sql s3://ecommerce-media/backups/

# Or using doctl:
doctl spaces upload ecommerce-media backup_$(date +%Y%m%d_%H%M%S).sql --region sgp1
```

### SSH Tricks

```bash
# SCP file to Droplet
scp -r /local/path deploy@128.199.xxx.xxx:/var/www/backend/

# SSH with port forwarding
ssh -L 3000:localhost:3000 deploy@128.199.xxx.xxx
# Mở browser: http://localhost:3000

# Mount via SSH (macOS)
sshfs deploy@128.199.xxx.xxx:/var/www ~/droplet-mount
```

### Droplet Management

```bash
# List droplets
doctl compute droplet list

# Power on/off
doctl compute droplet-action power-off 123456789
doctl compute droplet-action power-on 123456789

# Reboot
doctl compute droplet-action reboot 123456789

# Create snapshot (backup)
doctl compute droplet-action snapshot 123456789 --snapshot-name "ecommerce-backup-$(date +%Y%m%d)"

# Resize droplet (change plan)
doctl compute droplet-action resize 123456789 --size s-2vcpu-4gb --wait
```

---

## ✅ Sau khi Deploy

**Bây giờ bạn đã có:**
1. ✅ Production server (Ubuntu 22.04 on DigitalOcean)
2. ✅ Backend API running on port 8000 (Gunicorn + Supervisor)
3. ✅ Frontend running on port 3000 (Node.js + PM2)
4. ✅ Nginx reverse proxy on port 80/443
5. ✅ MySQL database (local hoặc managed)
6. ✅ Redis cache (local hoặc managed)
7. ✅ Local media storage (served via Nginx)
8. ✅ SSL/HTTPS (Let's Encrypt)
9. ✅ Auto-restart & monitoring
10. ✅ Full Linux knowledge!

**Access:**
- Frontend: `https://example.com` (hoặc IP)
- Backend API: `https://example.com/api/`
- Admin: `https://example.com/admin/`

---

## 🎓 Learning Value

Deploy trên DigitalOcean Droplet dạy bạn:
- ✅ Linux system administration (Ubuntu)
- ✅ Process management (systemd, supervisor, PM2)
- ✅ Web server configuration (Nginx)
- ✅ SSL/TLS certificate management (Let's Encrypt)
- ✅ Database administration (MySQL)
- ✅ Caching strategies (Redis)
- ✅ File storage & serving (Nginx)
- ✅ Application debugging & troubleshooting
- ✅ Production deployment practices
- ✅ Monitoring & logging
- ✅ Backup & disaster recovery
- ✅ **Cloud platform (DigitalOcean)**

**This is enterprise-level DevOps knowledge!** 🚀

---

## 🌐 Next Steps

### 1. Setup Domain Name

```bash
# Buy domain từ:
# - Namecheap
# - Google Domains  
# - Cloudflare

# Point DNS A record:
# example.com → 128.199.xxx.xxx
# www.example.com → 128.199.xxx.xxx

# Wait for DNS propagation (5-30 minutes)
# Check:
dig example.com
```

### 2. Enable HTTPS

```bash
# After domain is ready:
sudo certbot --nginx -d example.com -d www.example.com

# Test auto-renewal:
sudo certbot renew --dry-run
```

### 3. Setup Monitoring

```bash
# Option 1: DigitalOcean Monitoring (Free)
# 1. Vào Droplet → Monitoring tab
# 2. Enable "Enhanced Metrics" (CPU, RAM, Disk, Network)
# 3. View real-time graphs

# Option 2: Install Netdata (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
# Access: http://128.199.xxx.xxx:19999

# Option 3: External monitoring (recommended)
# - UptimeRobot (free) - https://uptimerobot.com
# - Pingdom
# - StatusCake
```

### 4. Setup Automatic Backups

```bash
# DigitalOcean Droplet Backups (recommended)
# Via Web UI: Droplet → Backups → Enable
# Cost: 20% of droplet cost ($2.4/month for $12 droplet)

# Via CLI:
doctl compute droplet-action enable-backups 123456789

# Or create manual snapshot:
doctl compute droplet-action snapshot 123456789 \
  --snapshot-name "ecommerce-backup-$(date +%Y%m%d)"
```

### 5. Implement CI/CD

```bash
# GitHub Actions for auto-deploy on git push
# Create .github/workflows/deploy.yml in your repo
# Example workflow:
# - On push to main branch
# - SSH to droplet
# - Pull latest code
# - Run migrations
# - Restart services
```

---

### Hybrid: Traditional + Docker (Best of Both Worlds)

## 🐳 BƯỚC 12: Deploy với Docker (Alternative Approach)

> **Khi nào dùng**: Sau khi setup manual thành công, muốn deploy nhanh hơn cho lần sau hoặc môi trường khác
> 
> **Lợi ích**: Setup ở local, push lên Git, chỉ cần `git pull && docker compose up` trên VM
> 
> **⏱️ Thời gian**: ~30 phút setup local + 10 phút deploy trên VM

### 12.1 Cấu Trúc Docker Files

Project đã có đầy đủ Docker configuration:

```
E-Commerce/
├── docker-compose.yml           # Development setup
├── docker-compose.prod.yml      # Production setup
├── .env.prod.example            # Production environment template
├── DOCKER_DEPLOYMENT.md         # Full Docker deployment guide
├── backend/
│   ├── dockerfile               # Development Dockerfile
│   ├── Dockerfile.prod          # Production Dockerfile (optimized)
│   ├── .dockerignore
│   └── entrypoint.sh
├── frontend/
│   ├── dockerfile               # Development Dockerfile
│   ├── Dockerfile.prod          # Production Dockerfile (multi-stage)
│   └── .dockerignore
└── nginx/
    └── default.conf
```

### 12.2 Development vs Production Dockerfiles

#### **Backend Dockerfiles:**

**Development (`backend/dockerfile`):**
```dockerfile
# Development Dockerfile
FROM python:3.12-slim

# Install system dependencies (including netcat for wait scripts)
RUN apt-get update && apt-get install -y \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

# Use entrypoint for development (with uvicorn --reload)
CMD ["/app/entrypoint.sh"]
```

**Production (`backend/Dockerfile.prod`):**
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/staticfiles /app/media

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Run migrations and start Gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn --workers 4 --bind 0.0.0.0:8000 backend.wsgi:application"]

```

#### **Frontend Dockerfiles:**

**Development (`frontend/dockerfile`):**
```dockerfile
# Development Dockerfile
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --no-audit --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Expose Next.js development port
EXPOSE 3000

# Start Next.js in development mode with hot reload
CMD ["npm", "run", "dev"]
```

**Production (`frontend/Dockerfile.prod`):**
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["npm", "run", "start"]
```

**Key Differences:**
- **Backend Dev**: Python 3.12, netcat included, Uvicorn with reload
- **Backend Prod**: Python 3.11, minimal deps, Gunicorn 4 workers, auto migrations
- **Frontend Dev**: Node 22-slim, npm dev, hot reload
- **Frontend Prod**: Node 22-alpine, multi-stage build, optimized bundle

### 12.3 Quick Start - Development (Test ở Local)

```bash
# Clone repository
git clone https://github.com/dinhhoang235/E-Commerce.git
cd E-Commerce

# Create environment file
cp .env.example .env
# Edit .env with your settings
nano .env

# Start all services
docker compose up --build

# Access:
# - Frontend: http://localhost
# - Backend API: http://localhost:8080/api
# - Admin: http://localhost:8080/admin

# Stop services
docker compose down
```

✅ **Development environment running!**

---

### 12.4 Production Deployment on VPS

#### **Bước 1: SSH vào VPS & Chuẩn Bị**

```bash
# SSH vào VPS (sử dụng user deploy đã tạo ở BƯỚC 2)
ssh deploy@128.199.xxx.xxx

# Clone repository vào /opt
cd /opt
sudo git clone https://github.com/dinhhoang235/E-Commerce.git
sudo chown -R deploy:deploy /opt/E-Commerce
cd /opt/E-Commerce

# Verify files
ls -la
# Output: docker-compose.prod.yml, .env.prod.example, backend/, frontend/, nginx/
```

✅ **Repository cloned!**

#### **Bước 2: Create Production Environment File**

```bash
cd /opt/E-Commerce

# Create .env.prod from template
cp .env.prod.example .env.prod

# Edit với production values
nano .env.prod
```

**⚠️ IMPORTANT - Production Values:**

```bash
# Security
DEBUG=False
SECRET_KEY=your-random-50-character-secret-key-here
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,128.199.xxx.xxx

# Database (strong passwords!)
DB_ENGINE=django.db.backends.mysql
DB_NAME=e_commerce
DB_USER=admin
DB_PASSWORD=Your-Strong-DB-Password-123!
DB_HOST=db
DB_PORT=3306

MYSQL_ROOT_PASSWORD=Your-Strong-Root-Password-456!
MYSQL_DATABASE=e_commerce
MYSQL_USER=admin
MYSQL_PASSWORD=Your-Strong-DB-Password-123!

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Backend
DJANGO_PORT=8000

# Frontend URLs
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_WS_HOST=your-domain.com
FRONTEND_URL=https://your-domain.com

# Payment (Live Stripe keys)
STRIPE_SECRET_KEY=sk_live_your_real_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_real_stripe_publishable_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_real_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Ctrl+X → Y → Enter to save
```

✅ **.env.prod created!**

#### **Bước 3: Install Docker & Docker Compose**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker deploy

# Docker Compose v2 đã được tích hợp sẵn trong Docker
# Không cần install riêng như v1

# Verify installation
docker --version
# Output: Docker version 24.x.x

docker compose version
# Output: Docker Compose version v2.x.x

# ⚠️ IMPORTANT: Logout and login again for group changes
exit
ssh deploy@128.199.xxx.xxx

# Verify docker group
groups
# Output: deploy sudo docker
```

✅ **Docker installed!**

#### **Bước 3.5: Create Frontend Environment File**

> **⚠️ CRITICAL**: Next.js needs `NEXT_PUBLIC_*` variables at **BUILD TIME**, not runtime.

```bash
cd /opt/E-Commerce

# Extract NEXT_PUBLIC_* variables from .env to frontend/.env.production
grep "^NEXT_PUBLIC" .env > frontend/.env.production

# Verify file created
cat frontend/.env.production

# Should show:
# NEXT_PUBLIC_API_URL=http://178.128.216.11/api
# NEXT_PUBLIC_WS_HOST=178.128.216.11
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### **Bước 4: Build & Start Production Containers**

```bash
cd /opt/E-Commerce

# Build production images (first time)
docker compose -f docker-compose.prod.yml build --no-cache

# Output:
# Building db...
# Building redis...
# Building backend...
# Building frontend...
# Building nginx...

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Output:
# Creating network "ecommerce_default" with driver "bridge"
# Creating volume "ecommerce_mysql_data"
# Creating volume "ecommerce_redis_data"
# Creating ecommerce-db-prod
# Creating ecommerce-redis-prod
# Creating ecommerce-backend-prod
# Creating ecommerce-frontend-prod
# Creating ecommerce-nginx-prod

# Check status
docker compose -f docker-compose.prod.yml ps

# Output:
# Name                         State    Ports
# ecommerce-db-prod            Up       0.0.0.0:3306->3306/tcp
# ecommerce-redis-prod         Up       6379/tcp
# ecommerce-backend-prod       Up       8000/tcp
# ecommerce-frontend-prod      Up       3000/tcp
# ecommerce-nginx-prod         Up       0.0.0.0:80->80/tcp

# View logs
docker compose -f docker-compose.prod.yml logs -f
# Ctrl+C to exit logs
```

✅ **All containers running!**

#### **Bước 5: Initialize Database**

```bash
cd /opt/E-Commerce

# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Output:
# Running migrations:
#   Applying contenttypes.0001_initial... OK
#   Applying auth.0001_initial... OK
#   ...

# Create superuser
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Follow prompts:
# Username: admin
# Email: admin@example.com
# Password: ********
# Password (again): ********

# Collect static files (already done in Dockerfile, but verify)
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

✅ **Database initialized!**

#### **Bước 6: Test Deployment**

```bash
# Test từ VPS
curl http://localhost
# Should return frontend HTML

curl http://localhost/api/products/
# Should return JSON API response

# Test từ local machine
curl http://128.199.xxx.xxx
curl http://128.199.xxx.xxx/api/products/

# Hoặc mở browser:
# http://128.199.xxx.xxx
# http://128.199.xxx.xxx/admin
```

✅ **Deployment successful!**

#### **Bước 7: Setup SSL/HTTPS (Optional - Nếu có domain)**

```bash
# Install certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts và certbot sẽ tự config Nginx

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

✅ **SSL configured!**

---

### 12.5 Docker Management Commands

#### **Stop/Start Services**

```bash
cd /opt/E-Commerce

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend

# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs backend --tail 100

# Execute command in container
docker compose -f docker-compose.prod.yml exec backend python manage.py shell
docker compose -f docker-compose.prod.yml exec db mysql -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE}
```

#### **Update Code & Rebuild**

```bash
# Pull code mới từ GitHub
cd /opt/E-Commerce
git pull origin main

# Rebuild changed services
docker compose -f docker-compose.prod.yml build backend frontend

# Restart với images mới
docker compose -f docker-compose.prod.yml up -d

# Run migrations nếu có
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Restart services
docker compose -f docker-compose.prod.yml restart backend frontend
```

#### **View Container Stats**

```bash
# Resource usage (real-time)
docker stats

# List containers
docker ps
docker compose -f docker-compose.prod.yml ps

# List images
docker images

# Inspect container
docker compose -f docker-compose.prod.yml exec backend env
docker compose -f docker-compose.prod.yml exec backend ps aux

# Check container health
docker inspect --format='{{.State.Health.Status}}' ecommerce-backend-prod
```

---

```bash
# Docker containers đã có restart: unless-stopped trong docker-compose.prod.yml
# Chỉ cần ensure Docker daemon start on boot

# Enable Docker service
sudo systemctl enable docker

# Start Docker daemon
sudo systemctl start docker

# Verify
sudo systemctl status docker
# Output: active (running)

# Test reboot (optional)
sudo reboot

# After reboot, SSH lại và check:
ssh deploy@128.199.xxx.xxx
docker compose -f docker-compose.prod.yml ps

# Output: All services should be UP
# Name                         State    Ports
# ecommerce-db-prod            Up       0.0.0.0:3306->3306/tcp
# ecommerce-redis-prod         Up       6379/tcp
# ecommerce-backend-prod       Up       8000/tcp
# ecommerce-frontend-prod      Up       3000/tcp
# ecommerce-nginx-prod         Up       0.0.0.0:80->80/tcp
```

✅ **Auto-restart configured!**

---

### 12.7 Backup & Restore với Docker

#### **Backup Database**

```bash
cd /opt/E-Commerce

# Option 1: Backup via mysqldump (recommended)
docker compose -f docker-compose.prod.yml exec db mysqldump \
  -u admin -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} > backup_$(date +%Y%m%d).sql

# Option 2: Backup entire volume
docker run --rm \
  -v ecommerce_mysql_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysql_backup_$(date +%Y%m%d).tar.gz /data

# List backups
ls -lh backup_*.sql mysql_backup_*.tar.gz
```

#### **Restore Database**

```bash
cd /opt/E-Commerce

# Option 1: Restore from SQL dump
cat backup_20260112.sql | docker compose -f docker-compose.prod.yml exec -T db mysql \
  -u admin -p${MYSQL_PASSWORD} ${MYSQL_DATABASE}

# Option 2: Restore from volume backup
docker run --rm \
  -v ecommerce_mysql_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mysql_backup_20260112.tar.gz -C /
  
# Restart backend after restore
docker compose -f docker-compose.prod.yml restart backend
```

#### **Automated Backup Script**

```bash
# Create backup script
nano ~/backup-docker.sh

# Add content:
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
cd /opt/E-Commerce
docker compose -f docker-compose.prod.yml exec -T db mysqldump \
  -u admin -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} > $BACKUP_DIR/db_$DATE.sql

# Backup media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz -C /opt/E-Commerce/backend media/

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "media_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"

# Save and exit (Ctrl+X → Y → Enter)
chmod +x ~/backup-docker.sh

# Test backup
~/backup-docker.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/deploy/backup-docker.sh >> /home/deploy/backup.log 2>&1
```

✅ **Backup configured!**

---

### 12.8 Troubleshooting Docker

#### **Container không start**

```bash
cd /opt/E-Commerce

# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Check container status
docker compose -f docker-compose.prod.yml ps

# Rebuild image
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml up -d backend
```

#### **Port conflicts**

```bash
# Check port usage
sudo ss -tlnp | grep -E '80|3000|8000|3306'

# Stop conflicting services
sudo supervisorctl stop ecommerce-backend  # If traditional deployment exists
sudo systemctl stop nginx                   # If host nginx running
sudo systemctl stop mysql                   # If host MySQL running

# Restart Docker containers
docker compose -f docker-compose.prod.yml restart
```

#### **Database connection errors**

```bash
cd /opt/E-Commerce

# Check MySQL container
docker compose -f docker-compose.prod.yml logs db

# Check network connectivity
docker compose -f docker-compose.prod.yml exec backend ping db

# Check environment variables
docker compose -f docker-compose.prod.yml exec backend env | grep DB_

# Restart database
docker compose -f docker-compose.prod.yml restart db backend
```

#### **Out of disk space**

```bash
# Check disk usage
df -h
docker system df

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused containers
docker container prune

# Clean everything (careful!)
docker system prune -a --volumes
```

#### **View detailed container logs**

```bash
cd /opt/E-Commerce

# Backend logs
docker compose -f docker-compose.prod.yml logs backend --tail 200

# Frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail 200

# Nginx logs
docker compose -f docker-compose.prod.yml logs nginx --tail 200

# All logs
docker-compose -f docker-compose.prod.yml logs --tail 200
```

✅ **Troubleshooting guide complete!**

## 🎯 BƯỚC 12 Summary

**Docker deployment đã complete với:**
1. ✅ Development và Production Dockerfiles riêng biệt
2. ✅ Quick start local development (30 giây)
3. ✅ Production VPS deployment guide (7 bước rõ ràng)
4. ✅ Docker management commands đầy đủ
5. ✅ Auto-restart on boot
6. ✅ Backup & restore scripts
7. ✅ Troubleshooting guide
8. ✅ So sánh Traditional vs Docker
9. ✅ Best practices và security checklist

**Next Steps:**
- Muốn auto-deploy khi push code? → Xem **BƯỚC 13: CI/CD với GitHub Actions**
- Muốn scale horizontally? → Xem Docker Swarm hoặc Kubernetes
- Muốn monitoring? → Setup Prometheus + Grafana



---

## � BƯỚC 13: Setup CI/CD với GitHub Actions (Auto Deploy)

> **Khi nào dùng**: Sau khi deploy manual/Docker thành công, muốn tự động deploy mỗi khi push code
> 
> **Lợi ích**: Push code → Auto test → Auto deploy → Zero downtime
> 
> **⏱️ Thời gian**: ~30 phút setup → Deploy chỉ 5-10 phút mỗi lần

### 13.1 Overview: CI/CD Pipeline

```
Developer                GitHub Actions         DigitalOcean Droplet
    ↓                          ↓                         ↓
git push main          →  Workflow triggered     →  SSH vào Droplet
                           ↓                          ↓
                       Run tests                  Pull code
                           ↓                          ↓
                       Build (if needed)          Restart services
                           ↓                          ↓
                       Deploy to Droplet          Live!
                           ↓
                       Send notification
```

### 13.2 Prerequisites

Trước khi setup CI/CD, cần có:

```bash
✅ Droplet đã deploy thành công (Traditional hoặc Docker)
✅ GitHub repository với code
✅ SSH access vào Droplet với password
✅ GitHub account với repository admin access
```

### 13.3 Setup Password Authentication cho GitHub Actions

> **Note**: Vì dùng password authentication, ta sẽ dùng `sshpass` để tự động nhập password trong CI/CD

#### Không cần setup gì thêm

Vì dùng password authentication, không cần tạo SSH keys. Chỉ cần add password vào GitHub Secrets.

✅ **Password authentication ready!**

### 13.4 Setup GitHub Secrets

#### Add Secrets vào GitHub

```
1. Mở GitHub repository: https://github.com/dinhhoang235/E-Commerce
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"

Tạo các secrets sau:

Secret 1:
- Name: SSH_HOST
- Value: 128.199.xxx.xxx (IP Droplet)

Secret 2:
- Name: SSH_USER
- Value: deploy

Secret 3:
- Name: SSH_PASSWORD
- Value: (password của user deploy)

Secret 4:
- Name: SSH_PORT
- Value: 22
```

✅ **GitHub Secrets configured!**

### 13.5 Create GitHub Actions Workflow

#### Option A: CI/CD cho Traditional Deployment

```bash
# Ở local machine
cd /path/to/E-Commerce

# Tạo workflow directory
mkdir -p .github/workflows

# Tạo workflow file
cat > .github/workflows/deploy-traditional.yml << 'EOF'
name: Deploy Traditional (Manual)

on:
  push:
    branches:
      - main
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install sshpass
        run: sudo apt-get update && sudo apt-get install -y sshpass

      - name: Deploy to Droplet
        env:
          SSHPASS: ${{ secrets.SSH_PASSWORD }}
        run: |
          sshpass -e ssh -o StrictHostKeyChecking=no ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'ENDSSH'
            set -e
            
            echo "🚀 Starting deployment..."
            
            # Pull latest code
            cd /opt/E-Commerce
            git pull origin main
            
            # Backend deployment
            echo "📦 Updating backend..."
            cd /var/www/backend
            source venv/bin/activate
            pip install -r requirements.txt
            python manage.py migrate --noinput
            python manage.py collectstatic --noinput
            deactivate
            
            # Restart backend
            sudo supervisorctl restart ecommerce-backend
            echo "✅ Backend restarted"
            
            # Frontend deployment
            echo "📦 Updating frontend..."
            cd /var/www/frontend
            npm install
            npm run build
            
            # Restart frontend
            pm2 restart ecommerce-frontend
            echo "✅ Frontend restarted"
            
            # Verify services
            sleep 5
            sudo supervisorctl status ecommerce-backend
            pm2 status ecommerce-frontend
            
            echo "🎉 Deployment completed successfully!"
          ENDSSH

      - name: Verify deployment
        run: |
          sleep 10
          curl -f http://${{ secrets.SSH_HOST }}/api/products/ || exit 1
          echo "✅ API is responding"

      - name: Notify on success
        if: success()
        run: echo "✅ Deployment successful!"

      - name: Notify on failure
        if: failure()
        run: echo "❌ Deployment failed!"
EOF
```

✅ **Traditional workflow created!**

#### Option B: CI/CD cho Docker Deployment

```bash
# Tạo workflow cho Docker
cat > .github/workflows/deploy-docker.yml << 'EOF'
name: Deploy Docker

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install sshpass
        run: sudo apt-get update && sudo apt-get install -y sshpass

      - name: Deploy to Droplet
        env:
          SSHPASS: ${{ secrets.SSH_PASSWORD }}
        run: |
          sshpass -e ssh -o StrictHostKeyChecking=no ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'ENDSSH'
            set -e
            
            echo "🚀 Starting deployment..."
            
            # Pull latest code
            cd /opt/E-Commerce
            git pull origin main
            
            # Rebuild and restart containers
            echo "🐳 Rebuilding Docker images..."
            docker compose build
            
            echo "🔄 Restarting containers..."
            docker compose up -d
            
            # Run migrations
            echo "📊 Running migrations..."
            docker compose exec -T backend python manage.py migrate --noinput
            
            # Collect static files
            echo "📦 Collecting static files..."
            docker compose exec -T backend python manage.py collectstatic --noinput
            
            # Verify services
            echo "🔍 Verifying services..."
            docker compose ps
            
            echo "🎉 Docker deployment completed successfully!"
          ENDSSH

      - name: Verify deployment
        run: |
          sleep 15
          curl -f http://${{ secrets.SSH_HOST }}/api/products/ || exit 1
          echo "✅ API is responding"

      - name: Notify on success
        if: success()
        run: echo "✅ Deployment successful!"

      - name: Notify on failure
        if: failure()
        run: echo "❌ Deployment failed!"
EOF
```

✅ **Docker workflow created!**

### 13.6 Advanced Workflow với Tests & Notifications

```bash
# Workflow với testing và Slack notification
cat > .github/workflows/deploy-advanced.yml << 'EOF'
name: Deploy with Tests

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run Django tests
        run: |
          cd backend
          python manage.py test

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Run frontend tests
        run: |
          cd frontend
          npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install sshpass
        run: sudo apt-get update && sudo apt-get install -y sshpass

      - name: Deploy to Droplet
        env:
          SSHPASS: ${{ secrets.SSH_PASSWORD }}
        run: |
          sshpass -e ssh -o StrictHostKeyChecking=no ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'ENDSSH'
            set -e
            cd /opt/E-Commerce
            git pull origin main
            
            # Docker deployment
            docker compose build
            docker compose up -d
            docker compose exec -T backend python manage.py migrate --noinput
            docker compose exec -T backend python manage.py collectstatic --noinput
          ENDSSH

      - name: Verify deployment
        run: |
          sleep 15
          curl -f http://${{ secrets.SSH_HOST }}/api/products/

      # Optional: Slack notification
      # - name: Notify Slack
      #   if: always()
      #   uses: 8398a7/action-slack@v3
      #   with:
      #     status: ${{ job.status }}
      #     webhook_url: ${{ secrets.SLACK_WEBHOOK }}
EOF
```

✅ **Advanced workflow created!**

### 13.7 Commit và Push Workflows

```bash
# Add workflows to git
git add .github/workflows/

# Commit
git commit -m "Add GitHub Actions CI/CD workflows"

# Push to trigger first deployment
git push origin main
```

✅ **Workflows pushed to GitHub!**

### 13.8 Monitor Deployment

```
1. Mở GitHub repository
2. Click tab "Actions"
3. Xem workflow đang chạy

Output sẽ như:
┌─────────────────────────────────────┐
│ ✅ Checkout code                    │
│ ✅ Setup SSH                        │
│ ⏳ Deploy to VM (running...)        │
│    └─ 🚀 Starting deployment...     │
│    └─ 📦 Updating backend...        │
│    └─ ✅ Backend restarted          │
│    └─ 📦 Updating frontend...       │
│    └─ ✅ Frontend restarted         │
│ ✅ Verify deployment                │
│ ✅ Notify on success                │
└─────────────────────────────────────┘
```

### 13.9 Test CI/CD Pipeline

```bash
# Make a small change
echo "# CI/CD Test" >> README.md

# Commit and push
git add README.md
git commit -m "Test CI/CD pipeline"
git push origin main

# Check GitHub Actions tab
# → Workflow should trigger automatically
# → Deploy to VM
# → Verify with curl

# After ~5-10 minutes, check VM
ssh azureuser@20.2.82.70
cd /opt/E-Commerce
git log -1  # Should see latest commit
```

✅ **CI/CD pipeline tested!**

### 13.10 Troubleshooting CI/CD

#### Workflow fails at SSH step

```bash
# Check password in GitHub Secrets
# Ensure SSH_PASSWORD is correct

# Test SSH manually
sshpass -p 'your_password' ssh deploy@128.199.xxx.xxx
# Hoặc dùng password prompt:
ssh deploy@128.199.xxx.xxx
```

#### Workflow fails at git pull

```bash
# SSH vào Droplet, check git config
cd /opt/E-Commerce
git config --global --add safe.directory /opt/E-Commerce

# Ensure permissions
sudo chown -R deploy:deploy /opt/E-Commerce
```

#### Workflow fails at Docker build

```bash
# Check Docker permissions
ssh deploy@128.199.xxx.xxx
docker ps  # Should work without sudo

# If not, add user to docker group
sudo usermod -aG docker deploy
# Logout and login again
```

#### Services not restarting

```bash
# Check Supervisor/PM2 status
ssh azureuser@20.2.82.70

# Traditional:
sudo supervisorctl status
pm2 status

# Docker:
docker compose ps
```

### 13.11 Advanced CI/CD Features

#### A. Deployment with Rollback

```yaml
# Add to workflow
- name: Backup before deploy
  run: |
    ssh ... << 'ENDSSH'
      cd /opt/E-Commerce
      git tag backup-$(date +%Y%m%d-%H%M%S)
      git push --tags
    ENDSSH

- name: Rollback on failure
  if: failure()
  run: |
    ssh ... << 'ENDSSH'
      cd /opt/E-Commerce
      LATEST_TAG=$(git describe --tags --abbrev=0)
      git checkout $LATEST_TAG
      docker compose up -d
    ENDSSH
```

#### B. Deployment with Health Checks

```yaml
- name: Health check
  run: |
    for i in {1..30}; do
      if curl -f http://${{ secrets.SSH_HOST }}/api/health/; then
        echo "✅ Health check passed"
        exit 0
      fi
      echo "⏳ Waiting for service... ($i/30)"
      sleep 10
    done
    echo "❌ Health check failed"
    exit 1
```

#### C. Deployment với Environment Variables

```yaml
# Add to GitHub Secrets:
# - DJANGO_SECRET_KEY
# - STRIPE_SECRET_KEY
# - DB_PASSWORD

- name: Update environment variables
  run: |
    ssh ... << 'ENDSSH'
      cd /opt/E-Commerce
      cat > backend/.env << EOF
      SECRET_KEY=${{ secrets.DJANGO_SECRET_KEY }}
      STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}
      DB_PASSWORD=${{ secrets.DB_PASSWORD }}
      EOF
    ENDSSH
```

### 13.12 Best Practices CI/CD

✅ **Security**
```yaml
# Never commit secrets to git
# Always use GitHub Secrets
# Rotate SSH keys regularly
# Use deploy keys instead of personal keys
```

✅ **Testing**
```yaml
# Always run tests before deploy
# Use separate staging environment
# Deploy to staging first, then production
```

✅ **Monitoring**
```yaml
# Add health checks
# Send notifications (Slack, Discord)
# Log deployment history
# Track deployment metrics
```

✅ **Rollback Strategy**
```yaml
# Keep backup of last working version
# Tag releases with git tags
# Quick rollback mechanism
# Database migration rollback plan
```

### 13.13 Example: Full Production Workflow

```yaml
name: Production Deploy

on:
  push:
    tags:
      - 'v*'  # Deploy only on version tags

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: # ... test commands

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: # ... deploy to staging VM

  manual-approval:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Wait for approval
        uses: trstringer/manual-approval@v1
        with:
          approvers: dinhhoang235
          minimum-approvals: 1

  deploy-production:
    needs: manual-approval
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: # ... deploy to production VM
      
      - name: Send notification
        run: # ... notify team
```

### 13.14 Monitoring & Metrics

```bash
# Track deployment frequency
# View in GitHub Actions tab → Insights

# Metrics to monitor:
- Deployment frequency (daily/weekly)
- Deployment success rate (%)
- Mean time to deploy (minutes)
- Rollback frequency
- Downtime during deployment
```
