# 🚀 DigitalOcean Droplet Deployment Guide - E-Commerce Platform (Traditional Linux Approach)

> **Mục đích**: Deploy ứng dụng E-Commerce lên DigitalOcean Droplet (Ubuntu 22.04) sử dụng SSH, Nginx, Gunicorn, và Supervisor
> 
> **Dành cho**: Developers biết Linux, SSH, và muốn hiểu Deep cách deploy thực tế
>
> **⏱️ Thời gian**: ~45 phút setup + 15 phút troubleshooting = ~1 giờ tổng cộng  
> **💰 Chi phí**: ~$6-12/tháng (Basic Droplet) - rẻ nhất thị trường  
> **🎯 Tại sao DigitalOcean**: Simple, rẻ, documentation tốt, community lớn

---

## 📋 Mục Lục

1. [Architecture](#-architecture)
2. [Yêu Cầu](#-yêu-cầu)
3. [BƯỚC 1: Tạo DigitalOcean Droplet](#bước-1-tạo-digitalocean-droplet)
4. [BƯỚC 2: Setup Initial Linux](#bước-2-setup-initial-linux)
5. [BƯỚC 3: Cài Dependencies](#bước-3-cài-dependencies)
6. [BƯỚC 4: Deploy Backend (Django + Gunicorn)](#bước-4-deploy-backend-django--gunicorn)
7. [BƯỚC 5: Deploy Frontend (Next.js)](#bước-5-deploy-frontend-nextjs)
8. [BƯỚC 6: Setup Nginx Reverse Proxy](#bước-6-setup-nginx-reverse-proxy)
9. [BƯỚC 7: Setup SSL/HTTPS (Let's Encrypt)](#bước-7-setup-ssltls-letsencrypt)
10. [BƯỚC 8: Database Setup](#bước-8-database-setup)
11. [BƯỚC 9: Storage Setup (Local Media)](#bước-9-storage-setup-local-media-files)
12. [BƯỚC 10: Monitoring & Logs](#bước-10-monitoring--logs)
13. [BƯỚC 11: Auto-restart & Systemd](#bước-11-auto-restart--systemd)


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

---

## 💰 Cost Estimate (Monthly)

| Service | SKU | Cost |
|---------|-----|------|
| VM (Compute) | Standard_B2s | ~$30 |
| Storage Account | Standard_LRS | ~$2 |
| (Optional) MySQL | Standard_B1s | ~$20 |
| (Optional) Redis | Basic C0 | ~$5 |
| **Total** | | **~$32-57/month** |

**vs Container Apps: $1.50/test → ~$50-100/month persistent**

---

## � Cost Estimate (Monthly)

| Service | SKU | Cost (USD) |
|---------|-----|------------|
| Droplet (Compute) | Basic 2GB | $12 |
| (Optional) Managed MySQL | Basic 1GB | $15 |
| (Optional) Managed Redis | Basic 1GB | $15 |
| **Total (Local DB)** | | **~$12/month** |
| **Total (Managed DB+Redis)** | | **~$42/month** |

**So với Azure:**
- Azure VM B1s: $15-30/month
- Azure Blob: $2-5/month
- **DigitalOcean rẻ hơn ~30-40%**

**Free Credits:**
- New account: $200 credit for 60 days
- GitHub Student Pack: $200 credit

---

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

## 🐳 So Sánh: Traditional vs Docker

Nếu thêm Docker vào guide này, sẽ trở thành **Droplet + Docker Hybrid Approach**.

### Cách Traditional (Guide Hiện Tại)

```bash
# Cài trực tiếp lên Droplet:
sudo apt install python3.11
sudo apt install nodejs
sudo apt install mysql-server
sudo apt install redis-server
sudo apt install nginx

# Clone code
cd /var/www/backend
pip install -r requirements.txt

# Run với Gunicorn + Supervisor
sudo supervisorctl start ecommerce-backend
```

**Ưu điểm:**
- ✅ Simple, straightforward
- ✅ Dễ debug (SSH vào VM, tìm log)
- ✅ Dễ modify config
- ✅ Resource efficient
- ✅ **Tốt cho learning**

**Nhược điểm:**
- ❌ Setup phức tạp (cài từng cái một)
- ❌ Dễ "dependency hell" (xung đột version)
- ❌ Khó redeploy (cài lại từ đầu)
- ❌ Khó scale (nhân bản)
- ❌ Environment không consistent

---

### Cách Docker (Hybrid Approach)

```bash
# Cài Docker trên VM
curl https://get.docker.com | sh

# Tạo Dockerfile cho Backend
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "backend.wsgi:application"]

# Tạo Dockerfile cho Frontend
FROM node:22-slim
COPY package.json .
RUN npm install
COPY . .
CMD ["npm", "run", "start"]

# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

# Deploy
docker-compose up -d
```

**Ưu điểm:**
- ✅ Setup nhanh (docker-compose up)
- ✅ Easy rebuild/redeploy
- ✅ Environment consistent (dev = production)
- ✅ Dễ scale (nhân bản container)
- ✅ Dễ move (push/pull images)
- ✅ Isolation (không ảnh hưởng VM)
- ✅ **Tốt cho production**

**Nhược điểm:**
- ❌ Thêm complexity (Docker learning curve)
- ❌ Resource overhead (Docker daemon chạy)
- ❌ Debug hơi khó (SSH vào container phức tạp)
- ❌ Logs tập trung (không thấy system logs)

---

### So Sánh Chi Tiết

| Tiêu Chí | Traditional | Docker |
|---------|-----------|--------|
| **Setup Time** | 1-2 giờ | 30 phút |
| **Knowledge** | Linux deep | Docker basics |
| **Rebuild** | 30 phút (manual) | 5 phút (docker build) |
| **Redeploy** | 10 phút (scp + restart) | 1 phút (docker-compose restart) |
| **Version Control** | Git only | Docker image tags |
| **Dependency** | Có xung đột | Isolated |
| **Environment** | Dev ≠ Prod | Dev = Prod |
| **Debug** | SSH + tail logs | docker logs + exec |
| **Scaling** | Manual | docker-compose scale |
| **Cost** | Rẻ hơn | Hơi đắt (RAM/CPU) |
| **Learning Value** | **Rất cao** | Trung bình |
| **Job Market** | **Rất cao** | Rất cao |

---

### Learning Path Recommendation

#### **Path 1: Traditional First (Recommended for Interns)**

```
Week 1-2: Traditional Approach (Guide hiện tại)
  ├─ Hiểu cách app chạy
  ├─ Hiểu Linux sâu
  ├─ Hiểu process management
  └─ Hiểu networking & firewall

Week 3-4: Thêm Docker vào
  ├─ Tạo Dockerfile
  ├─ Tạo docker-compose
  ├─ Deploy với Docker
  └─ So sánh với Traditional

Week 5+: Advanced
  ├─ Multi-stage builds
  ├─ Docker networks
  ├─ Volume management
  └─ Kubernetes basics
```

**Lợi ích:**
- Hiểu sâu cơ chế trước (Traditional)
- Sau đó đánh giá được Docker dùng tốt hay không
- Khi debug, biết vấn đề ở đâu (OS, app, network)

---

#### **Path 2: Docker First (For Fast Learners)**

```
Week 1: Quick Traditional Setup
  └─ Understand basic deployment

Week 2-3: Docker All The Way
  ├─ Dockerfile for all services
  ├─ docker-compose orchestration
  ├─ Easy rebuild/redeploy
  └─ Move to any server

Week 4+: Kubernetes
  ├─ Helm charts
  ├─ Deployments
  ├─ Services
  └─ Production scaling
```

**Lợi ích:**
- Nhanh đến production
- Dễ collaborate (Dockerfile is the spec)
- Dễ scale

---

### Khi Nào Dùng Traditional?

✅ **Dùng Traditional (Cài Tay):**
- Learning (muốn hiểu sâu)
- Debugging (dễ thấy issue)
- Small apps (cost savings)
- Full OS control
- Job interviews (show Linux skills)

---

### Khi Nào Dùng Docker?

✅ **Dùng Docker:**
- Production (consistency)
- Team collaboration (everyone same env)
- Microservices (multiple apps)
- Scaling (easy to replicate)
- CI/CD pipelines (automated builds)
- Cloud deployment (AWS ECS, DigitalOcean App Platform, Azure ACI)

---

### Hybrid: Traditional + Docker (Best of Both Worlds)

```
Droplet (Ubuntu 22.04) + Docker Engine

┌─────────────────────────────────┐
│  DigitalOcean Droplet (Ubuntu)  │
│                                 │
│  SSH Access ✅                  │
│  └─ Manage, Debug, Monitor      │
│                                 │
│  ┌────────────────────────────┐ │
│  │ Docker Engine              │ │
│  │                            │ │
│  │ [Backend Container]        │ │
│  │ [Frontend Container]       │ │
│  │ [MySQL Container]          │ │
│  │ [Redis Container]          │ │
│  │                            │ │
│  └────────────────────────────┘ │
│                                 │
│  Nginx (Host) ← Reverse Proxy   │
│  SSL Cert (Host)                │
└─────────────────────────────────┘
```

**Benefits:**
- ✅ SSH access + VM control
- ✅ Docker convenience (rebuild, redeploy)
- ✅ Easy debugging (SSH vào container hoặc VM)
- ✅ Cost effective
- ✅ Scalable
- ✅ **Tốt nhất cho production + learning**

---

## 🐳 BƯỚC 12: Deploy với Docker (Alternative Approach)

> **Khi nào dùng**: Sau khi setup manual thành công, muốn deploy nhanh hơn cho lần sau hoặc môi trường khác
> 
> **Lợi ích**: Setup ở local, push lên Git, chỉ cần `git pull && docker-compose up` trên VM
> 
> **⏱️ Thời gian**: ~30 phút setup local + 10 phút deploy trên VM

### 12.1 Chuẩn Bị Files Docker ở Local

#### Bước 1: Tạo Dockerfile cho Backend

```bash
# Ở local machine
cd /path/to/E-Commerce/backend

# Tạo Dockerfile
cat > Dockerfile << 'EOF'
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

# Copy and set entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8000", "backend.wsgi:application"]
EOF
```

✅ **Backend Dockerfile created!**

#### Bước 2: Tạo Dockerfile cho Frontend

```bash
# Ở local machine
cd /path/to/E-Commerce/frontend

# Tạo Dockerfile (multi-stage build for optimization)
cat > Dockerfile << 'EOF'
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
EOF
```

✅ **Frontend Dockerfile created!**

#### Bước 3: Tạo docker-compose.yml ở Root

```bash
# Ở local machine
cd /path/to/E-Commerce

# Tạo docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: ecommerce-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-Admin123@}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-e_commerce}
      MYSQL_USER: ${MYSQL_USER:-admin}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-Admin123@}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - ecommerce-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: ecommerce-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - ecommerce-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Django Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ecommerce-backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./backend/staticfiles:/app/staticfiles
      - ./backend/media:/app/media
    ports:
      - "8000:8000"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ecommerce-network
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py collectstatic --noinput &&
             gunicorn --workers 4 --bind 0.0.0.0:8000 backend.wsgi:application"

  # Next.js Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ecommerce-frontend
    restart: unless-stopped
    env_file:
      - ./frontend/.env.local
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - ecommerce-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: ecommerce-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./backend/staticfiles:/var/www/staticfiles:ro
      - ./backend/media:/var/www/media:ro
      - nginx_certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend
    networks:
      - ecommerce-network

networks:
  ecommerce-network:
    driver: bridge

volumes:
  mysql_data:
  nginx_certs:
EOF
```

✅ **docker-compose.yml created!**

#### Bước 4: Tạo .dockerignore Files

```bash
# Backend .dockerignore
cat > backend/.dockerignore << 'EOF'
__pycache__
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info
dist
build
.env
venv/
env/
.venv/
.git
.gitignore
*.md
.DS_Store
.coverage
htmlcov/
*.log
EOF

# Frontend .dockerignore
cat > frontend/.dockerignore << 'EOF'
node_modules
.next
.env.local
.env*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git
.gitignore
*.md
.DS_Store
coverage
.vercel
EOF
```

✅ **.dockerignore files created!**

#### Bước 5: Tạo Environment Files Template

```bash
# Backend .env.example
cat > backend/.env.docker << 'EOF'
# Django Settings
DEBUG=False
SECRET_KEY=your-production-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com,your-vm-ip

# Database (Docker services)
DB_ENGINE=django.db.backends.mysql
DB_NAME=e_commerce
DB_USER=admin
DB_PASSWORD=Admin123@
DB_HOST=mysql
DB_PORT=3306

# Redis (Docker service)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Backend Configuration
DJANGO_PORT=8000

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://your-droplet-ip/api
NEXT_PUBLIC_WS_HOST=your-droplet-ip
FRONTEND_URL=http://your-droplet-ip

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Media files served from local VPS (no object storage needed)
EOF

# Frontend .env.local.docker
cat > frontend/.env.local.docker << 'EOF'
NEXT_PUBLIC_API_URL=http://your-droplet-ip/api
NEXT_PUBLIC_WS_HOST=your-droplet-ip
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
EOF
```

✅ **Environment templates created!**

### 12.2 Test Docker Setup ở Local

```bash
# Ở local machine, tại root E-Commerce/
cd /path/to/E-Commerce

# Copy environment files
cp backend/.env.docker backend/.env
cp frontend/.env.local.docker frontend/.env.local

# Update với thông tin thật (IP, domain, keys)
nano backend/.env
nano frontend/.env.local

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Test services
curl http://localhost:8000/api/products/  # Backend API
curl http://localhost:3000                 # Frontend
curl http://localhost                      # Nginx

# Stop services
docker-compose down
```

✅ **Docker setup tested locally!**

### 12.3 Push Docker Files lên GitHub

```bash
# Ở local machine
cd /path/to/E-Commerce

# Add Docker files
git add backend/Dockerfile
git add backend/.dockerignore
git add frontend/Dockerfile
git add frontend/.dockerignore
git add docker-compose.yml
git add backend/.env.docker
git add frontend/.env.local.docker

# Commit
git commit -m "Add Docker configuration for easy deployment"

# Push
git push origin main
```

✅ **Docker files pushed to GitHub!**

### 12.4 Deploy lên DigitalOcean Droplet với Docker

#### Bước 1: Cài Docker trên Droplet

```bash
# SSH vào Droplet
ssh deploy@128.199.xxx.xxx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again để apply group
exit
ssh deploy@128.199.xxx.xxx

# Verify Docker
docker --version
# Output: Docker version 24.x.x

# Install Docker Compose (v2)
sudo apt update
sudo apt install -y docker-compose-plugin

# Verify Docker Compose
docker compose version
# Output: Docker Compose version v2.x.x
```

✅ **Docker installed on Droplet!**

#### Bước 2: Pull Code và Setup Environment

```bash
# SSH vào Droplet
ssh deploy@128.199.xxx.xxx

# Pull code mới nhất (hoặc clone nếu chưa có)
cd /opt/E-Commerce
git pull origin main

# Hoặc clone lần đầu:
# cd /opt
# sudo git clone https://github.com/dinhhoang235/E-Commerce.git
# sudo chown -R deploy:deploy /opt/E-Commerce

# Copy và update environment files
cd /opt/E-Commerce
cp backend/.env.docker backend/.env
cp frontend/.env.local.docker frontend/.env.local

# Update với thông tin production
nano backend/.env
# Sửa:
# - ALLOWED_HOSTS=localhost,127.0.0.1,20.2.82.70
# - NEXT_PUBLIC_API_URL=http://20.2.82.70/api
# - FRONTEND_URL=http://20.2.82.70
# - DB_HOST=mysql (giữ nguyên)
# - REDIS_HOST=redis (giữ nguyên)

nano frontend/.env.local
# Sửa:
# - NEXT_PUBLIC_API_URL=http://20.2.82.70/api
# - NEXT_PUBLIC_WS_HOST=20.2.82.70
```

✅ **Environment configured!**

#### Bước 3: Start Docker Services

```bash
# Tại /opt/E-Commerce
cd /opt/E-Commerce

# Build images
docker compose build

# Start all services
docker compose up -d

# Check services status
docker compose ps

# Output:
# NAME                   STATUS      PORTS
# ecommerce-backend      running     0.0.0.0:8000->8000/tcp
# ecommerce-frontend     running     0.0.0.0:3000->3000/tcp
# ecommerce-mysql        running     0.0.0.0:3306->3306/tcp
# ecommerce-redis        running     0.0.0.0:6379->6379/tcp
# ecommerce-nginx        running     0.0.0.0:80->80/tcp

# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

✅ **Docker services running!**

#### Bước 4: Run Django Setup Commands

```bash
# Tại /opt/E-Commerce

# Run migrations
docker compose exec backend python manage.py migrate

# Create superuser
docker compose exec backend python manage.py createsuperuser

# Seed database (optional)
docker compose exec backend python manage.py seed_categories
docker compose exec backend python manage.py seed_colors
docker compose exec backend python manage.py seed_products
docker compose exec backend python manage.py seed_productVariant

# Collect static files (đã auto run nhưng có thể run lại)
docker compose exec backend python manage.py collectstatic --noinput
```

✅ **Django setup completed!**

#### Bước 5: Nginx Configuration với Docker

> **Lưu ý**: File `nginx/default.conf` đã có sẵn trong repo và được mount vào nginx container qua docker-compose.yml

Nginx container đã được config sẵn trong `docker-compose.yml`:

```yaml
# Đã có trong docker-compose.yml
nginx:
  image: nginx:alpine
  container_name: ecommerce-nginx
  ports:
    - "80:80"
  volumes:
    - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    - ./backend/staticfiles:/var/www/staticfiles:ro
    - ./backend/media:/var/www/media:ro
```

Nginx config (`nginx/default.conf`) dùng Docker service names:

```nginx
# upstream backend {
#     server backend:8000;  # ← Tên Docker service, không phải localhost
# }
# 
# upstream frontend {
#     server frontend:3000;  # ← Tên Docker service
# }
```

**Không cần sửa gì**, config đã đúng cho Docker! Chỉ cần:

```bash
# Stop nginx host nếu đang chạy (tránh port conflict)
sudo systemctl stop nginx
sudo systemctl disable nginx

# Nginx container sẽ handle tất cả requests
docker compose ps nginx
# Output: ecommerce-nginx   running   0.0.0.0:80->80/tcp
```

✅ **Nginx configured!**

### 12.5 Test Full Stack với Docker

```bash
# Test từ VM
curl http://localhost              # Nginx → Frontend
curl http://localhost/api/products/  # Nginx → Backend API
curl http://localhost/django-admin/  # Django Admin

# Test từ local machine
curl http://20.2.82.70
curl http://20.2.82.70/api/products/

# Hoặc mở browser:
# http://20.2.82.70
# http://20.2.82.70/django-admin/
```

✅ **Full stack working!**

### 12.6 Docker Management Commands

#### Stop/Start Services

```bash
# Stop all services
docker compose down

# Start all services
docker compose up -d

# Restart specific service
docker compose restart backend
docker compose restart frontend

# View logs
docker compose logs -f backend
docker compose logs backend --tail 100

# Execute command in container
docker compose exec backend python manage.py shell
docker compose exec mysql mysql -u admin -p e_commerce
```

#### Update Code & Rebuild

```bash
# Pull code mới từ GitHub
cd /opt/E-Commerce
git pull origin main

# Rebuild changed services
docker compose build backend
docker compose build frontend

# Restart với images mới
docker compose up -d

# Run migrations nếu có
docker compose exec backend python manage.py migrate

# Restart services
docker compose restart backend frontend
```

#### View Container Stats

```bash
# Resource usage
docker stats

# List containers
docker ps

# List images
docker images

# Inspect container
docker compose exec backend env
docker compose exec backend ps aux
```

### 12.7 Auto-restart Docker on Boot

```bash
# Docker containers đã có restart: unless-stopped
# Nhưng cần ensure Docker daemon start on boot

# Enable Docker service
sudo systemctl enable docker

# Start on boot
sudo systemctl start docker

# Verify
sudo systemctl status docker

# Test reboot
sudo reboot

# Sau khi Droplet restart, check:
ssh deploy@128.199.xxx.xxx
docker compose ps
# All services should be running
```

✅ **Auto-restart configured!**

### 12.8 Backup & Restore với Docker

#### Backup Database

```bash
# Backup MySQL container
docker compose exec mysql mysqldump -u admin -pAdmin123@ e_commerce > backup_$(date +%Y%m%d).sql

# Hoặc backup volume
docker run --rm \
  -v ecommerce_mysql_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysql_backup_$(date +%Y%m%d).tar.gz /data
```

#### Restore Database

```bash
# Restore SQL dump
cat backup_20251223.sql | docker compose exec -T mysql mysql -u admin -pAdmin123@ e_commerce

# Hoặc restore volume
docker run --rm \
  -v ecommerce_mysql_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mysql_backup_20251223.tar.gz -C /
```

### 12.9 Troubleshooting Docker

#### Container không start

```bash
# Check logs
docker compose logs backend

# Check container status
docker compose ps

# Rebuild image
docker compose build --no-cache backend
docker compose up -d backend
```

#### Port conflicts

```bash
# Check port usage
sudo ss -tlnp | grep 8000

# Stop conflicting service
sudo supervisorctl stop ecommerce-backend  # Traditional deployment
sudo systemctl stop nginx                   # Host nginx

# Restart Docker containers
docker compose restart
```

#### Database connection errors

```bash
# Check MySQL container
docker compose logs mysql

# Check network
docker compose exec backend ping mysql

# Check environment variables
docker compose exec backend env | grep DB_
```

#### Out of disk space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused containers
docker container prune

# Check disk usage
df -h
docker system df
```

### 12.10 So Sánh: Traditional vs Docker Deployment

| Feature | Traditional (Manual) | Docker |
|---------|---------------------|--------|
| **Setup Time** | 1-2 giờ | 30 phút |
| **Update Code** | `git pull` + restart services | `git pull` + `docker compose up -d` |
| **Dependencies** | Cài manual từng cái | Docker images có sẵn |
| **Rollback** | Phức tạp | `git checkout` + rebuild |
| **Environment** | Phụ thuộc VM OS | Consistent mọi nơi |
| **Resource** | Ít overhead | Hơi nhiều (containers) |
| **Debugging** | SSH + logs | `docker exec` + logs |
| **Port Conflicts** | Dễ xảy ra | Isolated |
| **Team Work** | Setup khác nhau | Giống nhau (Dockerfile) |
| **Learning** | Hiểu Linux sâu | Hiểu Docker |

### 12.11 Best Practices Docker Deployment

✅ **Development:**
```bash
# Dùng docker-compose với hot reload
docker compose -f docker-compose.dev.yml up
```

✅ **Staging:**
```bash
# Dùng docker-compose production
docker compose up -d
```

✅ **Production:**
```bash
# Thêm health checks
# Thêm resource limits
# Setup monitoring (Prometheus, Grafana)
# Setup automated backups
# Setup CI/CD pipeline
```

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

---

## �📊 Summary: Deployment Options

Bạn có **3 cách deploy**:

### 1️⃣ Traditional Manual (BƯỚC 1-11)
- ✅ Full control
- ✅ Hiểu Linux sâu
- ✅ Resource efficient
- ❌ Setup phức tạp
- ❌ Update code cần nhiều bước

**Khi nào dùng**: Learning, debugging, small apps

### 2️⃣ Docker Compose (BƯỚC 12)
- ✅ Setup nhanh (30 phút)
- ✅ Update dễ (`git pull` + `docker compose up`)
- ✅ Consistent environment
- ❌ Overhead (RAM/CPU)
- ❌ Debugging hơi khó hơn

**Khi nào dùng**: Team work, multiple environments, production

### 3️⃣ Hybrid (Traditional + Docker)
- ✅ Dùng Docker cho apps
- ✅ Dùng host nginx/SSL
- ✅ Easy debugging (SSH)
- ✅ Best of both worlds

**Khi nào dùng**: Production với full control

---

## 🎯 Recommendation

**Bước học:**
1. ✅ **Bắt đầu với Traditional** (BƯỚC 1-11) → Hiểu cơ chế
2. ✅ **Chuyển sang Docker** (BƯỚC 12) → Production ready
3. ✅ **Setup CI/CD** (GitHub Actions) → Auto deploy

**Production:**
- Small app (< 1000 users): Traditional hoặc Docker đều OK
- Medium app (1K-10K users): Docker + monitoring
- Large app (> 10K users): Kubernetes + auto-scaling

---
