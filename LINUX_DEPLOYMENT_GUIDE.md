# 🚀 Azure VM Deployment Guide - E-Commerce Platform (Traditional Linux Approach)

> **Mục đích**: Deploy ứng dụng E-Commerce lên Azure VM (Ubuntu 22.04) sử dụng SSH, Nginx, Gunicorn, và Supervisor
> 
> **Dành cho**: Developers biết Linux, SSH, và muốn hiểu Deep cách deploy thực tế
>
> **⏱️ Thời gian**: ~1 giờ setup + 30 phút troubleshooting = ~1.5 giờ tổng cộng  
> **💰 Chi phí**: ~$15-30/tháng (B1s VM) - rẻ hơn Container Apps  
> **🎯 Tại sao VM**: Control tuyệt đối, học hỏi Linux sâu, flexible scaling

---

## 📋 Mục Lục

1. [So Sánh: Container Apps vs VM](#-so-sánh-container-apps-vs-vm)
2. [Architecture](#-architecture)
3. [Yêu Cầu](#-yêu-cầu)
4. [BƯỚC 1: Tạo Azure VM](#bước-1-tạo-azure-vm)
5. [BƯỚC 2: Setup Initial Linux](#bước-2-setup-initial-linux)
6. [BƯỚC 3: Cài Dependencies](#bước-3-cài-dependencies)
7. [BƯỚC 4: Deploy Backend (Django + Gunicorn)](#bước-4-deploy-backend-django--gunicorn)
8. [BƯỚC 5: Deploy Frontend (Next.js)](#bước-5-deploy-frontend-nextjs)
9. [BƯỚC 6: Setup Nginx Reverse Proxy](#bước-6-setup-nginx-reverse-proxy)
10. [BƯỚC 7: Setup SSL/HTTPS (Let's Encrypt)](#bước-7-setup-ssltls-letsencrypt)
11. [BƯỚC 8: Database Setup](#bước-8-database-setup)
12. [BƯỚC 9: Storage (Azure Blob)](#bước-9-storage-azure-blob)
13. [BƯỚC 10: Monitoring & Logs](#bước-10-monitoring--logs)
14. [BƯỚC 11: Auto-restart & Systemd](#bước-11-auto-restart--systemd)

---

## 📊 So Sánh: Container Apps vs VM

| Tiêu Chí | Container Apps | VM (Traditional) |
|---------|-----------------|-----------------|
| **Setup Time** | 20 phút | 1-2 giờ |
| **Complexity** | Dễ (CLI commands) | Khó (Linux config) |
| **Control** | Limited | Tuyệt đối |
| **Learning Value** | Không nhiều | Rất cao |
| **Cost** | $1.50/test | $15-30/tháng |
| **Scaling** | Auto | Manual/Script |
| **SSH Access** | Hạn chế | Đầy đủ |
| **Debugging** | Khó | Dễ |
| **Production Ready** | Có | Có |
| **Job Market** | Ít | Rất nhiều |

**Khi dùng VM:**
- ✅ Muốn hiểu Linux sâu
- ✅ Muốn learning path chuyên nghiệp
- ✅ Muốn full control
- ✅ Budget limited ($15/tháng)
- ✅ Dự án nhỏ/startup

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Azure VM (Ubuntu 22.04)             │
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
│  │ Blob Storage (Azure) - Images, Files               │    │
│  │ cdn.example.com/media                              │    │
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
    └──→ MySQL  Redis  Blob Storage
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
- ✅ Azure CLI (để tạo VM)
- ✅ Text editor (VSCode remote SSH là tốt)

**Azure Resources:**
- ✅ Azure account (free tier OK)
- ✅ Resource group
- ✅ Virtual Machine (Ubuntu 22.04 LTS)
- ✅ (Optional) Azure Database for MySQL
- ✅ (Optional) Azure Cache for Redis
- ✅ Storage Account (Blob)

---

## BƯỚC 1: Tạo Azure VM

### 1.1 Chuẩn Bị Variables

```bash
# Set variables
RESOURCE_GROUP="ecommerce-rg"
VM_NAME="ecommerce-vm"
LOCATION="eastasia"
IMAGE="UbuntuLTS"
SIZE="Standard_B2s"  # 2 vCPU, 4GB RAM (đủ cho dev/staging)
ADMIN_USERNAME="azureuser"
SSH_KEY_PATH="$HOME/.ssh/id_rsa.pub"

# Nếu chưa có SSH key, tạo:
# ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

### 1.2 Tạo Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Output:
# {
#   "id": "/subscriptions/.../resourceGroups/ecommerce-rg",
#   "location": "eastasia",
#   "name": "ecommerce-rg",
#   "properties": {
#     "provisioningState": "Succeeded"
#   }
# }
```

✅ **Resource Group created!**

### 1.3 Tạo Network Security Group (Firewall)

```bash
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name ecommerce-nsg

# Add rules
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name ecommerce-nsg \
  --name allow-ssh \
  --priority 1000 \
  --source-address-prefixes '*' \
  --destination-address-prefixes '*' \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 22

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name ecommerce-nsg \
  --name allow-http \
  --priority 1001 \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 80

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name ecommerce-nsg \
  --name allow-https \
  --priority 1002 \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443
```

✅ **Firewall rules created!**

### 1.4 Tạo Virtual Network (VNet)

```bash
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name ecommerce-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name default \
  --subnet-prefix 10.0.0.0/24

# Output:
# {
#   "newVNet": {
#     "addressSpace": {
#       "addressPrefixes": [
#         "10.0.0.0/16"
#       ]
#     },
#     "id": "...",
#     "name": "ecommerce-vnet",
#     ...
#   }
# }
```

✅ **VNet created!**

### 1.5 Tạo VM

```bash
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image $IMAGE \
  --size $SIZE \
  --admin-username $ADMIN_USERNAME \
  --ssh-key-values $SSH_KEY_PATH \
  --nsg ecommerce-nsg \
  --vnet-name ecommerce-vnet \
  --subnet default \
  --public-ip-sku Standard \
  --os-disk-size-gb 64 \
  --os-disk-name ecommerce-osdisk

# Output:
# {
#   "fqdns": "",
#   "id": "/subscriptions/.../resourceGroups/ecommerce-rg/providers/Microsoft.Compute/virtualMachines/ecommerce-vm",
#   "identity": null,
#   "location": "eastasia",
#   "macAddress": "00:0D:3A:...",
#   "powerState": "VM running",
#   "privateIpAddress": "10.0.0.4",
#   "publicIpAddress": "20.195.xxx.xxx",  ← ⭐ GHI LẠI IP NÀY
#   "resourceGroup": "ecommerce-rg",
#   "zones": []
# }
```

✅ **VM created!**
💾 **Lưu public IP: `20.195.xxx.xxx`**

---

## BƯỚC 2: Setup Initial Linux

### 2.1 SSH vào VM

```bash
# Thay IP bằng public IP từ output trên
ssh azureuser@20.195.xxx.xxx

# Nếu được hỏi "Are you sure want to continue?"
# → Type: yes

# Output:
# Welcome to Ubuntu 22.04.1 LTS (GNU/Linux 5.15.0-... x86_64)
# ...
# azureuser@ecommerce-vm:~$
```

✅ **SSH login successful!**

### 2.2 Update System

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

### 2.3 Setup Firewall (UFW)

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

### 2.4 Create App Directory

```bash
# Tạo thư mục chứa apps
sudo mkdir -p /var/www

# Set permissions
sudo chown -R azureuser:azureuser /var/www
chmod -R 755 /var/www

# Verify
ls -la /var/www
# Output:
# drwxr-xr-x  2 azureuser azureuser 4096 Dec 16 10:00 .
# drwxr-xr-x 13 root      root      4096 Dec 16 09:55 ..
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

# Option B: Dùng Azure Database for MySQL (nếu muốn)
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
sudo chown -R azureuser:azureuser /opt/E-Commerce

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
ALLOWED_HOSTS=localhost,127.0.0.1,20.195.xxx.xxx,example.com

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

# Azure Blob Storage (sẽ config ở BƯỚC 9)
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
AZURE_STORAGE_ACCOUNT_KEY=your-account-key
AZURE_CONTAINER_NAME=media
AZURE_CUSTOM_DOMAIN=yourstorageaccount.blob.core.windows.net

# Ctrl+X → Y → Enter để save
```

⚠️ **QUAN TRỌNG**:

- Thay `DB_PASSWORD` từ `admin123` → **strong password** cho production
- Thay `STRIPE_SECRET_KEY` → real Stripe keys
- Thay `20.195.xxx.xxx` → public IP của VM bạn
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
# curl http://20.195.xxx.xxx:8000/api/products/

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
user=azureuser
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
# curl http://20.195.xxx.xxx:3000

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
sudo pm2 startup systemd -u azureuser --hp /home/azureuser

# Output:
# [PM2] Creating /etc/systemd/system/pm2-azureuser.service
# [PM2] systemctl daemon-reload
# [PM2] Loaded PM2 startup script in systemd:
#
# [PM2] Service started. System will start PM2 on boot.

# Verify
sudo systemctl status pm2-azureuser
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
curl http://20.195.xxx.xxx

# Hoặc mở browser:
# http://20.195.xxx.xxx

# Nếu thấy frontend homepage → ✅ Success!
# Nếu error → check logs:
sudo tail -f /var/log/nginx/error.log
```

---

## BƯỚC 7: Setup SSL/HTTPS (Let's Encrypt)

### 7.1 Setup Domain (Nếu Có)

```bash
# Nếu bạn có domain, point DNS tới VM's public IP
# Ví dụ: example.com → 20.195.xxx.xxx

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
sudo certbot certonly --standalone -d 20.195.xxx.xxx

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

### Option B: Azure Database for MySQL (Managed)

```bash
# Create Azure MySQL server
MYSQL_SERVER="ecommerce-mysql-$(date +%s)"
MYSQL_ADMIN="admin"
MYSQL_PASSWORD="YourSecurePassword123!@#"

az mysql flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --location $LOCATION \
  --admin-user $MYSQL_ADMIN \
  --admin-password $MYSQL_PASSWORD \
  --sku-name Standard_B1s \
  --storage-size 32 \
  --tier Burstable

# Output:
# {
#   "fullyQualifiedDomainName": "ecommerce-mysql-1734351234.mysql.database.azure.com",
#   ...
# }

# Get hostname
MYSQL_HOST="ecommerce-mysql-1734351234.mysql.database.azure.com"

# Allow VM to connect
az mysql flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --rule-name allow-vm \
  --start-ip-address 10.0.0.4 \
  --end-ip-address 10.0.0.4

# Update .env
nano /var/www/backend/.env
# Change:
# DB_HOST=ecommerce-mysql-1734351234.mysql.database.azure.com
# DB_PASSWORD=YourSecurePassword123!@#

# Create database
mysql -h $MYSQL_HOST -u $MYSQL_ADMIN -p \
  -e "CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4;"

# Restart backend
sudo supervisorctl restart ecommerce-backend
```

---

## BƯỚC 9: Storage (Azure Blob)

### 9.1 Create Storage Account

```bash
STORAGE_ACCOUNT="ecommercestorage$(date +%s)"

az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Get connection string
STORAGE_CONN=$(az storage account show-connection-string \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  -o tsv)

# Get account key
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query [0].value -o tsv)
```

### 9.2 Create Blob Container

```bash
# Create container
az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --name media \
  --public-access blob

# Verify
az storage container list --account-name $STORAGE_ACCOUNT
```

### 9.3 Update Django Settings

```bash
# Edit Django settings
nano /var/www/backend/backend/settings.py

# Add at end:
# Azure Blob Storage
if not DEBUG:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.azure_storage.AzureStorage",
            "ACCOUNT_NAME": os.getenv("AZURE_STORAGE_ACCOUNT_NAME"),
            "ACCOUNT_KEY": os.getenv("AZURE_STORAGE_ACCOUNT_KEY"),
            "AZURE_CONTAINER": os.getenv("AZURE_CONTAINER_NAME", "media"),
            "AZURE_CUSTOM_DOMAIN": f"{os.getenv('AZURE_STORAGE_ACCOUNT_NAME')}.blob.core.windows.net",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    STATIC_URL = f"https://{ACCOUNT_NAME}.blob.core.windows.net/staticfiles/"
    MEDIA_URL = f"https://{ACCOUNT_NAME}.blob.core.windows.net/media/"

# Update .env
nano /var/www/backend/.env

# Add:
AZURE_STORAGE_ACCOUNT_NAME=ecommercestorage1734351234
AZURE_STORAGE_ACCOUNT_KEY=your-key-here
AZURE_CONTAINER_NAME=media

# Install django-storages
source /var/www/backend/venv/bin/activate
pip install django-storages[azure]

# Collect static files to Azure
cd /var/www/backend
python manage.py collectstatic --noinput

# Restart backend
sudo supervisorctl restart ecommerce-backend
```

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
sudo journalctl -u pm2-azureuser -f
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
curl http://20.195.xxx.xxx

# Test API
curl http://20.195.xxx.xxx/api/products/

# Test Admin
curl http://20.195.xxx.xxx/admin/

# Test Database
mysql -u admin -p e_commerce -e "SELECT COUNT(*) FROM products_product;"

# Test Blob Storage (upload file via API and check in Azure)
# ... depends on implementation
```

---

## 📋 Checklist

- [ ] VM created (public IP noted)
- [ ] SSH login working
- [ ] System updated & firewall enabled
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
- [ ] Azure Blob Storage configured
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
mysql -u ecommerce_user -p ecommerce_db -e "SELECT 1"

# Check .env file
cat /var/www/backend/.env | grep -E "DB_|REDIS_"

# Test MySQL connection
mysql -u admin -p e_commerce -e "SELECT 1"
# Output: 1 (connection OK)

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
mysqldump -u ecommerce_user -p ecommerce_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup to Azure
az storage blob upload \
  --account-name $STORAGE_ACCOUNT \
  --container-name backups \
  --name backup.sql \
  --file backup.sql
```

### SSH Tricks

```bash
# SCP file to VM
scp -r /local/path azureuser@20.195.xxx.xxx:/var/www/backend/

# SSH with port forwarding
ssh -L 3000:localhost:3000 azureuser@20.195.xxx.xxx
# Mở browser: http://localhost:3000

# Mount via SSH (macOS)
sshfs azureuser@20.195.xxx.xxx:/var/www ~/vm-mount
```

---

## ✅ Sau khi Deploy

**Bây giờ bạn đã có:**
1. ✅ Production server (Ubuntu 22.04)
2. ✅ Backend API running on port 8000 (Gunicorn + Supervisor)
3. ✅ Frontend running on port 3000 (Node.js + PM2)
4. ✅ Nginx reverse proxy on port 80/443
5. ✅ MySQL database (local hoặc Azure managed)
6. ✅ Redis cache (local hoặc Azure managed)
7. ✅ Azure Blob Storage for media
8. ✅ SSL/HTTPS (Let's Encrypt)
9. ✅ Auto-restart & monitoring
10. ✅ Full Linux knowledge!

**Access:**
- Frontend: `https://example.com` (hoặc IP)
- Backend API: `https://example.com/api/`
- Admin: `https://example.com/admin/`

---

## 🎓 Learning Value

Deploy trên VM dạy bạn:
- ✅ Linux system administration
- ✅ Process management (systemd, supervisor)
- ✅ Web server configuration (Nginx)
- ✅ SSL/TLS certificate management
- ✅ Database administration
- ✅ Application debugging
- ✅ Production deployment practices
- ✅ Monitoring & logging
- ✅ Backup & disaster recovery

**This is enterprise-level DevOps knowledge!** 🚀

---

## 🐳 So Sánh: Traditional vs Docker

Nếu thêm Docker vào guide này, sẽ trở thành **VM + Docker Hybrid Approach**.

### Cách Traditional (Guide Hiện Tại)

```bash
# Cài trực tiếp lên VM:
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
- Cloud deployment (AWS ECS, Azure ACI)

---

### Hybrid: Traditional + Docker (Best of Both Worlds)

```
VM (Ubuntu 22.04) + Docker Engine

┌─────────────────────────────────┐
│  Azure VM (Ubuntu)              │
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

### Cách Chuyển từ Traditional → Docker

Nếu bạn theo guide Traditional hiện tại, sau này có thể dễ dàng chuyển sang Docker:

**Step 1: Tạo Dockerfile cho Backend**

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    gcc pkg-config default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "backend.wsgi:application"]
```

**Step 2: Tạo docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=mysql
      - DB_NAME=ecommerce_db
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root123
      - MYSQL_DATABASE=ecommerce_db
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

**Step 3: Deploy**

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

**Step 4: Update Nginx (vẫn trên VM)**

```nginx
# backend now at container port 8000
upstream backend {
    server 127.0.0.1:8000;
}

# frontend now at container port 3000
upstream frontend {
    server 127.0.0.1:3000;
}

# Rest of Nginx config is the same!
```

✅ **Done! Chuyển sang Docker chỉ cần 2 files + docker-compose**

---

### Recommendation cho Bạn

1. **Bắt đầu với Traditional** (Guide hiện tại)
   - Hiểu Linux sâu
   - Hiểu cách mọi thứ chạy
   - Có SSH access để debug

2. **Sau đó thêm Docker** (Optional)
   - Tạo Dockerfile
   - Tạo docker-compose
   - Thấy benefits của Docker
   - Học Kubernetes sau

3. **Hoặc bỏ qua Docker, tập trung Traditional**
   - Đủ cho learning purpose
   - Đủ cho small-medium apps
   - Hiểu sâu Linux (valuable skill)

---
