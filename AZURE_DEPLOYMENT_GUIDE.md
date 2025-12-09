# 🚀 Azure Deployment Guide - E-Commerce Platform

> **Mục đích**: Deploy ứng dụng E-Commerce lên Azure từ local

**⏱️ Thời gian**: ~20 phút deploy + 5 phút test = 25 phút tổng cộng  
**💰 Chi phí**: ~$1.50 hoặc **MIỄN PHÍ** với Azure for Students ($100/tháng)

---

## 📋 Mục Lục

### PHẦN 1: LÝ THUYẾT (15 phút)
1. [Project Dùng Công Nghệ Gì?](#1️⃣-project-dùng-công-nghệ-gì)
2. [Các Bước Deploy](#2️⃣-các-bước-deploy)
3. [Chi Phí Breakdown](#3️⃣-chi-phí-breakdown)

### PHẦN 2: PRACTICE - Từng Bước Chi Tiết
- **[BƯỚC 1: Setup Local](#bước-1-setup-local-10-phút)**
  - [1.1 Cài Azure CLI](#11-cài-azure-cli)
  - [1.2 Tạo Azure Account](#12-tạo-azure-account)
  - [1.3 Login vào Azure](#13-login-vào-azure-từ-terminal)
  - [1.4 Cài Docker](#14-cài-docker)
  - [1.5 .env File](#15-chuẩn-bị-env-file)

- **[BƯỚC 2: Build & Push Images](#bước-2-build--push-docker-images-10-phút)**
  - [2.0 Dockerfile & docker-compose.prod](#bước-20-hiểu-dockerfile--docker-composeprod)
  - [2.1 Tạo ACR](#21-tạo-azure-container-registry-acr)
  - [2.2 Tạo Registry](#22-tạo-container-registry)
  - [2.3 Login ACR](#23-login-vào-acr)
  - [2.4 Backend Image](#24-build--push-backend-image)
  - [2.5 Frontend Image](#25-build--push-frontend-image)
  - [2.6 Kiểm tra Images](#26-kiểm-tra-images-trong-acr)

- **[BƯỚC 3: Create Services](#bước-3-create-azure-services-5-phút)**
  - [3.1 MySQL](#31-tạo-mysql-database)
  - [3.2 Firewall MySQL](#32-cho-phép-django-app-kết-nối-mysql)
  - [3.3 Database](#33-tạo-database-trong-mysql-server)
  - [3.4 Redis](#34-tạo-redis-cache)
  - [3.5 Storage](#35-tạo-storage-account-cho-ảnh-sản-phẩm)
  - [3.6 Blob Container](#36-tạo-blob-container)

- **[BƯỚC 4: Deploy Apps](#bước-4-deploy-lên-container-apps-5-phút)**
  - [4.1 Environment](#41-tạo-container-apps-environment)
  - [4.2 Backend](#42-deploy-backend-container-app)
  - [4.3 Frontend](#43-deploy-frontend-container-app)

- **[BƯỚC 5: Test](#bước-5-test-5-phút)**
  - [5.1 Frontend](#51-truy-cập-frontend)
  - [5.2 API](#52-test-api-backend)
  - [5.3 Database](#53-kiểm-tra-database-kết-nối)

- **[BƯỚC 6: Cleanup](#bước-6-cleanup---xóa-resources-2-phút)**

### PHẦN 3: REFERENCE
- [So Sánh Azure vs AWS](#-so-sánh-azure-vs-aws)
- [TƯ DUY DEPLOY](#-tư-duy-deploy---cách-nghĩ-khi-deploy)
- [SERVER & NETWORK](#-server--network---cách-servers-nói-chuyện)
- [SECURITY](#-security---bảo-mật-quan-trọng-gì)
- [Troubleshooting](#-troubleshooting)
- [Tips](#-tips)

---

## 📚 PHẦN 1: LÝ THUYẾT (15 phút)

### 1️⃣ Project Dùng Công Nghệ Gì?

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js)  ◄──► Backend (Django)          │
│  Port: 3000          │    Port: 8000                │
│                      │                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ Azure Cloud                                 │   │
│  │ ├─ Container Apps (Chạy Docker containers)   │   │
│  │ ├─ MySQL Database (Lưu data)                │   │
│  │ ├─ Redis Cache (Tốc độ)                     │   │
│  │ └─ Blob Storage (Ảnh, files)                │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Các thành phần:**

| Thành Phần | Công Nghệ | Chức Năng | Azure Service |
|-----------|-----------|----------|---------------|
| Frontend | Next.js 15.2.4 | Web UI | Container Apps |
| Backend | Django 5.1.2 + Uvicorn | API Server | Container Apps |
| Database | MySQL 8.0 | Lưu sản phẩm, đơn hàng, user | Azure Database for MySQL |
| Cache | Redis 7.x | Tốc độ lấy dữ liệu | Azure Cache for Redis |
| Storage | - | Ảnh sản phẩm, avatar | Azure Blob Storage |
| Orchestration | Docker + Container Apps | Chạy containers | Azure Container Apps |

### 2️⃣ Các Bước Deploy

```
BƯỚC 1: Setup Local (10 phút)
   ├─ Cài Azure CLI
   ├─ Tạo Azure Account
   ├─ Login vào Azure
   └─ Chuẩn bị .env file

BƯỚC 2: Build Docker Images (5 phút)
   ├─ Build image backend (Django)
   ├─ Build image frontend (Next.js)
   └─ Push images lên Azure Container Registry

BƯỚC 3: Create Azure Resources (3 phút)
   ├─ Tạo Resource Group
   ├─ Tạo MySQL Database
   ├─ Tạo Redis Cache
   ├─ Tạo Blob Storage
   └─ Tạo Container Apps

BƯỚC 4: Deploy Apps (5 phút)
   ├─ Deploy Backend Container
   ├─ Deploy Frontend Container
   └─ Kết nối database

BƯỚC 5: Test (5 phút)
   ├─ Truy cập frontend URL
   ├─ Test API backend
   └─ Kiểm tra database kết nối

BƯỚC 6: Cleanup (2 phút)
   └─ Xóa resource group (stop tính phí)
```

### 3️⃣ Chi Phí Breakdown

**Chạy 20 phút test:**
- Container Apps: $0.62
- MySQL: $0.50
- Redis Basic: $0.15
- Blob Storage: $0.23
- **TỔNG: ~$1.50**

**Với Azure for Students:**
- Tặng $100/tháng × 12 tháng = $1200 miễn phí ✅
- Có thể test thoải mái!

---

## 🛠️ PHẦN 2: PRACTICE - Từng Bước Chi Tiết

### BƯỚC 1: Setup Local (10 phút)

#### 1.1 Cài Azure CLI

**macOS (Dùng Homebrew):**
```bash
brew install azure-cli
```

**Kiểm tra cài đặt:**
```bash
az --version
# Output:
# azure-cli                         2.56.0
# azure-cli-core                    2.56.0
# ...
```

#### 1.2 Tạo Azure Account

1. Vào https://azure.microsoft.com/free/students/
2. Đăng ký bằng tài khoản Microsoft/GitHub (hoặc tạo account mới)
3. Xác nhận qua email
4. Chọn **Azure for Students** → nhận $100/tháng miễn phí

#### 1.3 Login vào Azure từ Terminal

```bash
az login
```

**Output:**
```
A web browser has been opened at https://login.microsoftonline.com/...
Please continue the login in the web browser. If no web browser is available...
```

→ Trình duyệt sẽ mở, nhập email → Xác nhận → Quay lại terminal

**Kiểm tra login thành công:**
```bash
az account show
# Output:
# {
#   "environmentName": "AzureCloud",
#   "homeTenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "isDefault": true,
#   "name": "Azure for Students",
#   "state": "Enabled",
#   "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "user": {
#     "name": "your-email@example.com",
#     "type": "user"
#   }
# }
```

✅ **Nếu thấy `"name": "Azure for Students"` → OK!**

#### 1.4 Cài Docker

**macOS:** Tải [Docker Desktop](https://www.docker.com/products/docker-desktop/)

**Kiểm tra:**
```bash
docker --version
# Docker version 24.0.0, build abcdef
```

#### 1.5 Chuẩn Bị .env File

```bash
cd /Users/hoang/Documents/code/E-Commerce/backend
cat > .env << 'EOF'
DEBUG=False
SECRET_KEY=your-secret-key-here-min-50-chars-long-xxxxxxxxxxxxxxxx
ALLOWED_HOSTS=localhost,127.0.0.1,*.azurecontainerapps.io

# Database
DB_NAME=ecommerce_db
DB_USER=admin
DB_PASSWORD=YourPassword123!@#
DB_HOST=your-server.mysql.database.azure.com
DB_PORT=3306

# Redis
REDIS_HOST=your-redis.redis.cache.windows.net
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_SSL=True

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
AZURE_STORAGE_ACCOUNT_KEY=your-account-key
AZURE_CONTAINER_NAME=media

# Email (nếu có)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EOF
```

**Hoặc edit file .env sẵn có:**
```bash
nano /Users/hoang/Documents/code/E-Commerce/backend/.env
# Sửa các giá trị cần thiết
```

---

### BƯỚC 2: Build & Push Docker Images (10 phút)

### BƯỚC 2.0: Hiểu Dockerfile & docker-compose.prod

#### Dockerfile Backend

**File: `backend/dockerfile`**
```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

CMD ["/app/entrypoint.sh"]
```

**Giải thích:**
- `FROM python:3.12-slim`: Base image Python
- `RUN apt-get install`: Cài dependencies (MySQL client, build tools)
- `COPY requirements.txt`: Copy file cài đặt packages
- `RUN pip install`: Cài Python packages
- `COPY . .`: Copy tất cả code
- `EXPOSE 8000`: Mở port 8000
- `CMD`: Chạy entrypoint.sh (start Django)

#### Dockerfile Frontend

**File: `frontend/dockerfile`**
```dockerfile
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --no-audit --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

**Giải thích:**
- `FROM node:22-slim`: Base image Node.js
- `COPY package.json`: Copy package definition
- `RUN npm ci`: Cài npm dependencies
- `EXPOSE 3000`: Mở port 3000
- `CMD`: Chạy Next.js dev server

#### docker-compose.prod (Cho Azure)

**File: `docker-compose.prod.yml`** (tạo file này)
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: dockerfile
    image: ${REGISTRY_NAME}.azurecr.io/backend:latest
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - DB_HOST=${DB_HOST}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - ALLOWED_HOSTS=localhost,127.0.0.1,*.azurecontainerapps.io
    depends_on:
      - db
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: dockerfile
    image: ${REGISTRY_NAME}.azurecr.io/frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NODE_ENV=production
    depends_on:
      - backend
    restart: always

  db:
    image: mysql:8.0
    expose:
      - "3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: always

  redis:
    image: redis:alpine
    expose:
      - "6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: always

volumes:
  mysql_data:
  redis_data:
```

**Khác biệt local vs production:**

| Thành Phần | docker-compose.yml (local) | docker-compose.prod.yml (Azure) |
|-----------|---------------------------|--------------------------------|
| Database | MySQL local | Azure Database for MySQL |
| Redis | Local Redis | Azure Cache for Redis |
| Volumes | Local filesystem | N/A (cloud managed) |
| ENV | development | production |
| Restart | no | always |
| Network | Internal | Azure managed |

---

#### 2.1 Tạo Azure Container Registry (ACR)

```bash
# Variables
RESOURCE_GROUP="ecommerce-rg"
REGISTRY_NAME="ecommerceregistry"
LOCATION="Southeast Asia"

# Tạo Resource Group
az group create \
  --name $RESOURCE_GROUP \
  --location "$LOCATION"

# Output:
# {
#   "id": "/subscriptions/xxx/resourceGroups/ecommerce-rg",
#   "location": "southeastasia",
#   "managedBy": null,
#   "name": "ecommerce-rg",
#   "properties": {
#     "provisioningState": "Succeeded"
#   },
#   "tags": null,
#   "type": "Microsoft.Resources/resourceGroups"
# }
```

✅ **Resource Group tạo thành công!**

#### 2.2 Tạo Container Registry

```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME \
  --sku Basic

# Output:
# {
#   "adminUserEnabled": false,
#   "creationDate": "2025-12-09T10:30:45.123456+00:00",
#   "id": "/subscriptions/.../providers/Microsoft.ContainerRegistry/registries/ecommerceregistry",
#   "location": "southeastasia",
#   "name": "ecommerceregistry",
#   "provisioningState": "Succeeded",
#   "resourceGroup": "ecommerce-rg",
#   "sku": {
#     "name": "Basic",
#     "tier": "Basic"
#   },
#   "loginServer": "ecommerceregistry.azurecr.io",
#   ...
# }
```

✅ **Lấy `loginServer`: `ecommerceregistry.azurecr.io`**

#### 2.3 Login vào ACR

```bash
az acr login --name $REGISTRY_NAME

# Output:
# Login Succeeded
```

#### 2.4 Build & Push Backend Image

```bash
cd /Users/hoang/Documents/code/E-Commerce/backend

# Build
docker build -t ecommerceregistry.azurecr.io/backend:latest .

# Output:
# [+] Building 45.2s (12/12) FINISHED                          docker:desktop-linux
# => [internal] load build definition from Dockerfile                           0.0s
# => [internal] load .dockerignore                                             0.0s
# ...
# => exporting to image                                        2.5s
# => exporting layers                                          2.3s
# => exporting manifest sha256:abc123def456...                 0.2s
# => exporting config sha256:xyz789...                         0.0s
# => naming to docker.io/library/backend:latest                0.0s

# Push
docker push ecommerceregistry.azurecr.io/backend:latest

# Output:
# Using default tag: latest
# The push refers to repository [ecommerceregistry.azurecr.io/backend]
# abc123: Pushed
# def456: Pushed
# ghi789: Pushed
# latest: digest: sha256:abc123def456... size: 1234
```

✅ **Backend image pushed!**

#### 2.5 Build & Push Frontend Image

```bash
cd /Users/hoang/Documents/code/E-Commerce/frontend

# Build
docker build -t ecommerceregistry.azurecr.io/frontend:latest .

# Output:
# [+] Building 32.1s (18/18) FINISHED
# ...

# Push
docker push ecommerceregistry.azurecr.io/frontend:latest

# Output:
# Using default tag: latest
# The push refers to repository [ecommerceregistry.azurecr.io/frontend]
# abc123: Pushed
# ...
# latest: digest: sha256:xyz789... size: 5678
```

✅ **Frontend image pushed!**

#### 2.6 Kiểm tra Images trong ACR

```bash
az acr repository list --name $REGISTRY_NAME

# Output:
# [
#   "backend",
#   "frontend"
# ]
```

---

### BƯỚC 3: Create Azure Services (5 phút)

#### 3.1 Tạo MySQL Database

```bash
MYSQL_SERVER="ecommerce-mysql-$(date +%s)"
MYSQL_ADMIN="admin"
MYSQL_PASSWORD="YourPassword123!@#"

az mysql flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --location "$LOCATION" \
  --admin-user $MYSQL_ADMIN \
  --admin-password $MYSQL_PASSWORD \
  --sku-name Standard_B1s \
  --storage-size 32

# Output:
# Creating mysql flexible server...
# {
#   "administratorLogin": "admin",
#   "administratorLoginPassword": null,
#   "availabilityZone": "1",
#   "backup": {
#     "backupRetentionDays": 7,
#     "geoRedundantBackup": "Disabled"
#   },
#   "createMode": null,
#   "createdTime": "2025-12-09T10:45:30.123456+00:00",
#   "fullyQualifiedDomainName": "ecommerce-mysql-1733773530.mysql.database.azure.com",
#   "id": "/subscriptions/.../resourceGroups/ecommerce-rg/providers/Microsoft.DBforMySQL/flexibleServers/ecommerce-mysql-1733773530",
#   "location": "southeastasia",
#   "name": "ecommerce-mysql-1733773530",
#   "resourceGroup": "ecommerce-rg",
#   ...
# }
```

✅ **Lấy hostname: `ecommerce-mysql-1733773530.mysql.database.azure.com`**

#### 3.2 Cho phép Django App kết nối MySQL

```bash
# Mở firewall cho Container Apps
az mysql flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255

# Output:
# {
#   "endIpAddress": "255.255.255.255",
#   "id": "/subscriptions/.../providers/Microsoft.DBforMySQL/flexibleServers/.../firewallRules/AllowAzureServices",
#   "name": "AllowAzureServices",
#   "resourceGroup": "ecommerce-rg",
#   "startIpAddress": "0.0.0.0",
#   "type": "Microsoft.DBforMySQL/flexibleServers/firewallRules"
# }
```

✅ **Firewall rule created!**

#### 3.3 Tạo Database trong MySQL Server

```bash
az mysql flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER \
  --database-name ecommerce_db \
  --charset utf8mb4 \
  --collation utf8mb4_unicode_ci

# Output:
# {
#   "charset": "utf8mb4",
#   "collation": "utf8mb4_unicode_ci",
#   "id": "/subscriptions/.../providers/Microsoft.DBforMySQL/flexibleServers/.../databases/ecommerce_db",
#   "name": "ecommerce_db",
#   "resourceGroup": "ecommerce-rg",
#   "type": "Microsoft.DBforMySQL/flexibleServers/databases"
# }
```

✅ **Database created!**

#### 3.4 Tạo Redis Cache

```bash
REDIS_NAME="ecommerce-redis"

az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location "$LOCATION" \
  --sku Basic \
  --vm-size c0 \
  --minimum-tls-version 1.2

# Output:
# {
#   "accessKeys": {
#     "primaryKey": "abc123xyz789...",
#     "secondaryKey": "def456uvw012..."
#   },
#   "enableNonSslPort": false,
#   "hostName": "ecommerce-redis.redis.cache.windows.net",
#   "id": "/subscriptions/.../resourceGroups/ecommerce-rg/providers/Microsoft.Cache/redis/ecommerce-redis",
#   "location": "southeastasia",
#   "minimumTlsVersion": "1.2",
#   "name": "ecommerce-redis",
#   "port": 6379,
#   "provisioningState": "Succeeded",
#   "resourceGroup": "ecommerce-rg",
#   "sku": {
#     "capacity": 0,
#     "family": "C",
#     "name": "Basic"
#   },
#   ...
# }
```

✅ **Lấy:**
- **hostName**: `ecommerce-redis.redis.cache.windows.net`
- **primaryKey**: `abc123xyz789...` (dùng làm password)

#### 3.5 Tạo Storage Account (cho ảnh sản phẩm)

```bash
STORAGE_ACCOUNT="ecommercestorage$(date +%s)"

az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2

# Output:
# {
#   "accessTier": "Hot",
#   "creationTime": "2025-12-09T10:50:30.123456+00:00",
#   "id": "/subscriptions/.../resourceGroups/ecommerce-rg/providers/Microsoft.Storage/storageAccounts/ecommercestorage1733773530",
#   "kind": "StorageV2",
#   "location": "southeastasia",
#   "name": "ecommercestorage1733773530",
#   "primaryEndpoints": {
#     "blob": "https://ecommercestorage1733773530.blob.core.windows.net/",
#     "dfs": "https://ecommercestorage1733773530.dfs.core.windows.net/",
#     "file": "https://ecommercestorage1733773530.file.core.windows.net/",
#     "queue": "https://ecommercestorage1733773530.queue.core.windows.net/",
#     "table": "https://ecommercestorage1733773530.table.core.windows.net/",
#     "web": "https://ecommercestorage1733773530.web.core.windows.net/"
#   },
#   ...
# }
```

✅ **Storage account created!**

#### 3.6 Tạo Blob Container

```bash
az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --name media

# Output:
# {
#   "created": true,
#   "metadata": {},
#   "name": "media"
# }
```

✅ **Blob container created!**

---

### BƯỚC 4: Deploy lên Container Apps (5 phút)

#### 4.1 Tạo Container Apps Environment

```bash
ENVIRONMENT_NAME="ecommerce-env"

az containerapp env create \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION"

# Output:
# {
#   "id": "/subscriptions/.../resourceGroups/ecommerce-rg/providers/Microsoft.App/managedEnvironments/ecommerce-env",
#   "location": "southeastasia",
#   "name": "ecommerce-env",
#   "provisioningState": "Succeeded",
#   "resourceGroup": "ecommerce-rg",
#   "type": "Microsoft.App/managedEnvironments"
# }
```

✅ **Environment created!**

#### 4.2 Deploy Backend Container App

```bash
# Lấy ACR credentials
ACR_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query 'passwords[0].value' -o tsv)

# Deploy backend
az containerapp create \
  --name backend \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image ecommerceregistry.azurecr.io/backend:latest \
  --registry-server ecommerceregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8000 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    DB_HOST="$MYSQL_SERVER.mysql.database.azure.com" \
    DB_NAME="ecommerce_db" \
    DB_USER="$MYSQL_ADMIN" \
    DB_PASSWORD="$MYSQL_PASSWORD" \
    REDIS_HOST="ecommerce-redis.redis.cache.windows.net" \
    REDIS_PORT="6379" \
    DEBUG="False" \
    ALLOWED_HOSTS="localhost,127.0.0.1,*.azurecontainerapps.io"

# Output:
# {
#   "id": "/subscriptions/.../resourceGroups/ecommerce-rg/providers/Microsoft.App/containerApps/backend",
#   "name": "backend",
#   "properties": {
#     "configuration": {
#       "ingress": {
#         "fqdn": "backend.xxx.azurecontainerapps.io",
#         "targetPort": 8000,
#         ...
#       }
#     }
#   }
# }
```

✅ **Lấy Backend URL: `https://backend.xxx.azurecontainerapps.io`**

#### 4.3 Deploy Frontend Container App

```bash
az containerapp create \
  --name frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image ecommerceregistry.azurecr.io/frontend:latest \
  --registry-server ecommerceregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    NEXT_PUBLIC_API_URL="https://backend.xxx.azurecontainerapps.io"

# Output:
# {
#   "name": "frontend",
#   "properties": {
#     "configuration": {
#       "ingress": {
#         "fqdn": "frontend.xxx.azurecontainerapps.io",
#         "targetPort": 3000,
#         ...
#       }
#     }
#   }
# }
```

✅ **Lấy Frontend URL: `https://frontend.xxx.azurecontainerapps.io`**

---

### BƯỚC 5: Test (5 phút)

#### 5.1 Truy cập Frontend

```bash
# Mở browser
open "https://frontend.xxx.azurecontainerapps.io"
```

**Kiểm tra:**
- ✅ Trang chủ tải bình thường
- ✅ Không có lỗi console (F12 → Console)
- ✅ Có thể scroll, click button

#### 5.2 Test API Backend

```bash
# Lấy danh sách sản phẩm
curl -X GET https://backend.xxx.azurecontainerapps.io/api/products/

# Output:
# {
#   "count": 15,
#   "next": null,
#   "previous": null,
#   "results": [
#     {
#       "id": 1,
#       "name": "iPhone 15",
#       "price": "999.99",
#       "image": "https://..."
#     }
#   ]
# }
```

✅ **API hoạt động!**

#### 5.3 Kiểm tra Database Kết Nối

```bash
# SSH vào backend container
az containerapp exec \
  --name backend \
  --resource-group $RESOURCE_GROUP \
  --command "python manage.py dbshell"

# Trong dbshell:
mysql> SELECT VERSION();
# +-----------+
# | VERSION() |
# +-----------+
# | 8.0.35    |
# +-----------+
mysql> EXIT;
```

✅ **Database kết nối OK!**

---

### BƯỚC 6: Cleanup - Xóa Resources (2 phút)

> ⚠️ **Quan trọng**: Nếu không xóa, Azure sẽ tiếp tục tính phí!

```bash
# Xóa tất cả resources trong group
az group delete \
  --name $RESOURCE_GROUP \
  --yes

# Chờ 2-3 phút để xóa hoàn toàn

# Kiểm tra đã xóa chưa
az group exists --name $RESOURCE_GROUP
# false
```

✅ **Tất cả resources đã xóa! Không còn tính phí!**

---


---

## 📖 PHẦN 3: REFERENCE - TÀI LIỆU THAM KHẢO

## 🔄 So Sánh Azure vs AWS

**Nếu bạn quen AWS, phần này giúp bạn hiểu equivalents trên Azure**

### Dịch Vụ Tương Đương

| Chức Năng | AWS | Azure | Khác Biệt |
|-----------|-----|-------|----------|
| **Container Orchestration** | ECS / Fargate | Container Apps | Azure đơn giản hơn, không cần manage cluster |
| **Container Registry** | ECR | ACR | Tương tự, syntax khác |
| **Database** | RDS MySQL | Azure Database for MySQL | Tương tự, Azure có managed backup |
| **Cache** | ElastiCache Redis | Azure Cache for Redis | Tương tự, cách setup khác |
| **Object Storage** | S3 | Blob Storage | Tương tự, API khác |
| **CLI Tool** | AWS CLI | Azure CLI | Command syntax hoàn toàn khác |

### Ví Dụ So Sánh Commands

#### 1️⃣ Login

**AWS:**
```bash
aws configure
# Nhập Access Key + Secret Key
```

**Azure:**
```bash
az login
# Mở browser để đăng nhập
```

#### 2️⃣ Tạo Container Registry

**AWS (ECR):**
```bash
aws ecr create-repository --repository-name backend --region ap-southeast-1

# Output: repository.repositoryUri
# 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/backend
```

**Azure (ACR):**
```bash
az acr create --resource-group ecommerce-rg --name ecommerceregistry --sku Basic

# Output: loginServer
# ecommerceregistry.azurecr.io
```

#### 3️⃣ Push Image

**AWS:**
```bash
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.ap-southeast-1.amazonaws.com

docker push 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/backend:latest
```

**Azure:**
```bash
az acr login --name ecommerceregistry

docker push ecommerceregistry.azurecr.io/backend:latest
```

#### 4️⃣ Tạo Database

**AWS (RDS):**
```bash
aws rds create-db-instance \
  --db-instance-identifier ecommerce-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password YourPassword123!@#
```

**Azure:**
```bash
az mysql flexible-server create \
  --resource-group ecommerce-rg \
  --name ecommerce-mysql-$(date +%s) \
  --admin-user admin \
  --admin-password YourPassword123!@# \
  --sku-name Standard_B1s
```

#### 5️⃣ Deploy Container

**AWS (Fargate):**
```bash
aws ecs create-service \
  --cluster ecommerce-cluster \
  --service-name backend \
  --task-definition backend:1 \
  --desired-count 1 \
  --launch-type FARGATE
```

**Azure:**
```bash
az containerapp create \
  --name backend \
  --resource-group ecommerce-rg \
  --environment ecommerce-env \
  --image ecommerceregistry.azurecr.io/backend:latest \
  --target-port 8000
```

### Giá So Sánh (20 phút test)

| Service | AWS | Azure | Ghi Chú |
|---------|-----|-------|---------|
| Container (Fargate) | ~$0.96 | ~$0.62 | Azure rẻ hơn 35% |
| Database (RDS) | ~$1.20 | ~$0.50 | Azure rẻ hơn 58% |
| Cache (ElastiCache) | ~$0.20 | ~$0.15 | Tương tự |
| Storage (S3) | ~$0.30 | ~$0.23 | Tương tự |
| **TỔNG** | **~$2.66** | **~$1.50** | **Azure rẻ hơn 44%** |

### Ưu Điểm & Nhược Điểm

#### Azure For Students
✅ **Ưu Điểm:**
- $100/tháng × 12 tháng miễn phí = **$1200 free**
- Đơn giản hơn AWS (ít service hơn)
- Integration tốt với Microsoft services

❌ **Nhược Điểm:**
- Ecosystem nhỏ hơn AWS
- Ít tutorials tiếng Việt
- Marketplace ít hơn

#### AWS
✅ **Ưu Điểm:**
- Ecosystem lớn, services đa dạng
- Tutorials & docs nhiều
- Thị trường lớn, job nhiều

❌ **Nhược Điểm:**
- Phức tạp hơn (quá nhiều choices)
- Free tier hạn chế hơn
- Giá đắt hơn cho simple app

### Chọn Cái Nào?

**Nếu bạn là student → Azure**
- $1200 credit miễn phí
- Đủ test & deploy ứng dụng
- Không cần endorse hay credit card (hoặc minimal)

**Nếu bạn là professional → AWS**
- Ecosystem lớn, job market lớn
- Scaling lên production dễ hơn
- Có free tier: 1 năm 750 giờ/tháng

### Migration Path: AWS → Azure

Nếu bạn quen AWS, đây là cách chuyển sang Azure:

| AWS | Azure | Cách Migrate |
|-----|-------|-------------|
| EC2 | VM hoặc Container Apps | Deploy app lên Container Apps |
| ECS | Container Apps | 1-1 mapping |
| RDS MySQL | Azure Database for MySQL | Database dump + restore |
| S3 | Blob Storage | Sync data với `azcopy` |
| CloudFront | Azure CDN | Update DNS records |
| IAM | Azure RBAC | Assign roles instead |

**Example: Migrate S3 bucket to Blob Storage**

```bash
# Export từ S3
aws s3 sync s3://my-bucket ./local-folder

# Upload to Blob Storage
az storage blob upload-batch \
  --account-name mystorageaccount \
  --destination media \
  --source ./local-folder
```

---

**Một lần chạy hết (nếu setup xong rồi):**

```bash
# Variables
RESOURCE_GROUP="ecommerce-rg"
REGISTRY_NAME="ecommerceregistry"
LOCATION="Southeast Asia"
MYSQL_SERVER="ecommerce-mysql-$(date +%s)"
MYSQL_ADMIN="admin"
MYSQL_PASSWORD="YourPassword123!@#"
REDIS_NAME="ecommerce-redis"
STORAGE_ACCOUNT="ecommercestorage$(date +%s)"
ENVIRONMENT_NAME="ecommerce-env"

# 1. Setup
az group create --name $RESOURCE_GROUP --location "$LOCATION"
az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic
az acr login --name $REGISTRY_NAME

# 2. Build & Push
cd /Users/hoang/Documents/code/E-Commerce/backend
docker build -t ecommerceregistry.azurecr.io/backend:latest .
docker push ecommerceregistry.azurecr.io/backend:latest

cd /Users/hoang/Documents/code/E-Commerce/frontend
docker build -t ecommerceregistry.azurecr.io/frontend:latest .
docker push ecommerceregistry.azurecr.io/frontend:latest

# 3. Services
az mysql flexible-server create --resource-group $RESOURCE_GROUP --name $MYSQL_SERVER --location "$LOCATION" --admin-user $MYSQL_ADMIN --admin-password $MYSQL_PASSWORD --sku-name Standard_B1s --storage-size 32

az mysql flexible-server firewall-rule create --resource-group $RESOURCE_GROUP --name $MYSQL_SERVER --rule-name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 255.255.255.255

az mysql flexible-server db create --resource-group $RESOURCE_GROUP --server-name $MYSQL_SERVER --database-name ecommerce_db --charset utf8mb4

az redis create --resource-group $RESOURCE_GROUP --name $REDIS_NAME --location "$LOCATION" --sku Basic --vm-size c0

# 4. Deploy
az containerapp env create --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP --location "$LOCATION"

ACR_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query 'passwords[0].value' -o tsv)

az containerapp create --name backend --resource-group $RESOURCE_GROUP --environment $ENVIRONMENT_NAME --image ecommerceregistry.azurecr.io/backend:latest --registry-server ecommerceregistry.azurecr.io --registry-username $ACR_USERNAME --registry-password $ACR_PASSWORD --target-port 8000 --ingress external --cpu 0.5 --memory 1Gi

az containerapp create --name frontend --resource-group $RESOURCE_GROUP --environment $ENVIRONMENT_NAME --image ecommerceregistry.azurecr.io/frontend:latest --registry-server ecommerceregistry.azurecr.io --registry-username $ACR_USERNAME --registry-password $ACR_PASSWORD --target-port 3000 --ingress external --cpu 0.5 --memory 1Gi

# 5. Cleanup
az group delete --name $RESOURCE_GROUP --yes
```

---

## 🧠 TƯ DUY DEPLOY - Cách Nghĩ Khi Deploy

### Khi Deploy, Bạn Đang Làm Gì?

**Local (Máy của bạn):**
```
┌─────────────────────────────┐
│ 1. Viết Code (Next.js)      │
│ 2. Viết Code (Django)       │
│ 3. Build Docker Image       │
│ 4. Push lên Azure Registry  │
└─────────────────────────────┘
         ↓ (Network)
┌─────────────────────────────┐
│ Azure Cloud                 │
│ 1. Pull Image từ Registry   │
│ 2. Chạy container           │
│ 3. User truy cập            │
└─────────────────────────────┘
```

### 5 Thứ Phải Có Để Deploy Thành Công

1. **Container Image** (code + dependencies)
   - Bạn build = Docker image
   - Push lên ACR (Azure Container Registry)
   - Azure tải xuống và chạy

2. **Database** (lưu data)
   - MySQL lưu sản phẩm, đơn hàng, user
   - Backend kết nối MySQL để lấy/lưu data
   - Firewall cho phép Container Apps → MySQL

3. **Cache** (tốc độ)
   - Redis cache data thường xuyên dùng
   - Backend query Redis trước MySQL
   - Nếu không có trong Redis → query MySQL + cache

4. **Storage** (ảnh/files)
   - Blob Storage lưu ảnh sản phẩm
   - Frontend load ảnh từ Blob URL
   - Không lưu ảnh trong Container (sẽ mất khi restart)

5. **Network** (kết nối)
   - Frontend gọi Backend API
   - Backend gọi MySQL/Redis
   - Mọi cái phải kết nối được nhau

### Container Là Gì?

```
┌──────────────────────────┐
│ Docker Container         │
│ ┌────────────────────┐   │
│ │ Python 3.11        │   │
│ │ Django 5.1.2       │   │
│ │ Uvicorn            │   │
│ │ requirements.txt    │   │
│ │ manage.py          │   │
│ │ ... (tất cả code)  │   │
│ └────────────────────┘   │
│ Port: 8000              │
└──────────────────────────┘
```

**Container = Package hoàn chỉnh:**
- Code + dependencies + runtime
- Chạy được ở bất kỳ máy nào
- Không cần cài Python, Django, etc ở Azure
- Chỉ cần Docker engine

### Vì Sao Dùng Container?

| Cách Cũ (EC2) | Cách Mới (Container) |
|---------------|---------------------|
| Tạo VM | Tạo Container Image |
| SSH vào VM | không cần |
| Cài Python | Docker tự cài |
| Cài dependencies | Dockerfile tự cài |
| Run manually | Azure tự run |
| Phức tạp | Đơn giản |
| $$ đắt | $$ rẻ |

### Thứ Tự Các Bước Phải Đúng

```
✅ ĐÚNG:
1. Build image local
2. Push lên ACR ✓
3. Tạo Database (MySQL) ✓
4. Tạo Cache (Redis) ✓
5. Deploy Container (sẽ kết nối được)

❌ SAI:
1. Deploy Container trước
2. Sau đó tạo Database
→ Container sẽ crash vì không tìm được Database
```

---

## 🌐 SERVER & NETWORK - Cách Servers Nói Chuyện

### Architecture (Ai Nói Chuyện Với Ai)

```
┌──────────────┐
│   User       │ (Bạn ngồi ở nhà)
│ Browser      │
└──────┬───────┘
       │ HTTP Request (Port 443)
       ↓
┌──────────────────────┐
│ Frontend Container   │ (Azure)
│ Next.js Port 3000    │
│ URL: example.com     │
└──────┬───────────────┘
       │ API Request
       ↓
┌──────────────────────┐
│ Backend Container    │ (Azure)
│ Django Port 8000     │
│ /api/products/       │
└──────┬───────────────┘
       │ Query
       ↓
┌──────────────────────┐
│ MySQL Database       │ (Azure)
│ Port 3306            │
│ user, products, etc  │
└──────────────────────┘
```

### 1️⃣ Frontend → Backend (API Call)

**File: frontend/src/app/page.tsx**
```typescript
// Frontend gọi Backend API
const response = await fetch('https://backend.azurecontainerapps.io/api/products/');
const data = await response.json();
```

**Cần:**
- ✅ `NEXT_PUBLIC_API_URL` env var đúng
- ✅ Backend phải chạy (không bị crash)
- ✅ CORS cho phép frontend gọi
- ✅ Network cho phép connection

### 2️⃣ Backend → MySQL (Query)

**File: backend/products/views.py**
```python
from django.db import connection
from products.models import Product

# Backend query MySQL
products = Product.objects.all()
```

**Cần:**
- ✅ `DB_HOST` chính xác
- ✅ `DB_PASSWORD` đúng
- ✅ Firewall MySQL cho phép (0.0.0.0 - 255.255.255.255)
- ✅ MySQL server phải chạy

### 3️⃣ Backend → Redis (Cache)

**File: backend/redis_client.py**
```python
import redis

r = redis.Redis(
    host='ecommerce-redis.redis.cache.windows.net',
    port=6379,
    password='your-password',
    ssl=True
)

# Cache product list 1 giờ
r.setex('products:list', 3600, json.dumps(products))
```

**Cần:**
- ✅ `REDIS_HOST` chính xác
- ✅ `REDIS_PASSWORD` đúng
- ✅ Redis server chạy (bật)
- ✅ Network cho phép

### Port Là Gì?

```
Port = "cửa" để kết nối

Frontend:
- Port 3000 (Next.js dev server)
- Port 80/443 (HTTPS production)

Backend:
- Port 8000 (Django dev)
- Port 8000 (Uvicorn)

MySQL:
- Port 3306 (mặc định)

Redis:
- Port 6379 (mặc định)

Firewall mở port → có thể kết nối
Firewall đóng port → không kết nối được
```

### Network Flow (Khi User Truy Cập)

```
1. User gõ: https://example.com
2. Browser tải Frontend (Next.js)
3. Frontend load: <Image src="..." />
4. Frontend gọi: /api/products/
5. Backend nhận request
6. Backend query: SELECT * FROM products
7. MySQL trả data
8. Backend cache vào Redis
9. Backend trả JSON cho Frontend
10. Frontend render sản phẩm
11. User thấy trang
```

**Nếu bị lỗi ở bước nào:**
```
1-2: DNS/Frontend issue
3: Blob Storage issue
4-5: Network/CORS issue
6-7: MySQL issue
8: Redis issue
9-10: Frontend bug
```

---

## 🔐 SECURITY - Bảo Mật Quan Trọng Gì

### 4 Lớp Security

```
┌─────────────────────────────────┐
│ 1. Network Level                │
│ (Firewall, VPN, SSL/TLS)        │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 2. Application Level            │
│ (Password, Auth, Validation)    │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 3. Database Level               │
│ (Encryption, Access Control)    │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 4. Infrastructure Level         │
│ (Backups, DDoS Protection)      │
└─────────────────────────────────┘
```

### 1️⃣ Network Level Security

**SSL/TLS (HTTPS):**
```
❌ HTTP (Không bảo mật)
Frontend --clear text--> Backend
User's password exposed!

✅ HTTPS (Bảo mật)
Frontend --encrypted--> Backend
Password encrypted!
```

**Firewall:**
```
MySQL Firewall:
- Cho phép: 0.0.0.0 - 255.255.255.255
  (Mở cho toàn bộ Azure services)
- Chặn: Ngoài Azure

❌ SAI: Không mở firewall
Backend không kết nối được MySQL

✅ ĐÚNG: Mở firewall rule
```

### 2️⃣ Application Level Security

**Password Hashing:**
```
❌ SAI: Lưu password plain text
Database: user_password = "123456"
→ Nếu hacker leak DB, biết hết password

✅ ĐÚNG: Hash password
Database: user_password_hash = bcrypt("123456")
→ Hash không thể reverse lại
```

**Environment Variables:**
```
❌ SAI: Hardcode password trong code
# views.py
db_password = "YourPassword123!@#"

✅ ĐÚNG: Dùng .env
# .env
DB_PASSWORD=YourPassword123!@#
# views.py
db_password = os.getenv('DB_PASSWORD')
```

**API Authentication:**
```
❌ SAI: Ai gọi API cũng được
GET /api/orders/ → trả tất cả orders của tất cả users

✅ ĐÚNG: Kiểm tra JWT token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
→ Chỉ trả orders của user này
```

### 3️⃣ Database Level Security

**Database Backups:**
```
Tại sao cần?
- Server crash → có backup restore
- Hacker xóa data → recover từ backup
- User xóa nhầm → restore lại

Azure: Tự động backup hàng ngày
```

**Encryption at Rest:**
```
Data lưu trong database
- ✅ Encrypted (bảo mật)
- ❌ Plain text (không bảo mật)

Azure MySQL: Default encrypted
```

### 4️⃣ Infrastructure Level Security

**DDoS Protection:**
```
DDoS = Hacker gửi triệu requests cùng lúc

Azure DDoS Protection:
- Free (cơ bản): 20Gbps
- Paid (advanced): 200Gbps
```

**RBAC (Role-Based Access Control):**
```
Ai được làm gì?

❌ SAI: Tất cả team có AWS/Azure account root
→ Ai cũng xóa được production

✅ ĐÚNG:
- Admin: Quản lý tất cả
- Developer: Deploy test
- DevOps: Manage resources
- Intern: Read-only
```

### Checklist Security Cho Hướng Dẫn Này

✅ **Hiện Tại:**
- [x] Dùng HTTPS (Container Apps tự signed)
- [x] Firewall MySQL mở
- [x] .env cho sensitive data
- [x] Database backups (Azure default)

❌ **Thiếu (Cần Thêm Production):**
- [ ] JWT authentication
- [ ] Password hashing (bcrypt)
- [ ] Rate limiting
- [ ] SQL injection protection (Django ORM xử lý)
- [ ] CORS configuration
- [ ] DDoS protection (paid)
- [ ] WAF (Web Application Firewall)

### Ví Dụ: JWT Authentication

```python
# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_orders(request):
    # Chỉ lấy orders của user hiện tại
    orders = Order.objects.filter(user=request.user)
    return Response(OrderSerializer(orders, many=True).data)
```

**Frontend:**
```typescript
// Gọi API với JWT token
const response = await fetch('https://backend.../api/orders/', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Vì Sao Không Cần Full Security Cho Test?

```
Test (20 phút):
- Không có real user data
- Chỉ bạn dùng
- Data sẽ xóa sau test
→ Cần basic security thôi

Production:
- Có real users
- Có real data (money, personal info)
- Data lưu lâu dài
→ Cần full security
```

---


## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `az: command not found` | Cài Azure CLI: `brew install azure-cli` |
| `Not logged in` | Chạy `az login` lại |
| `Docker build failed` | Kiểm tra Dockerfile path, cài Docker Desktop |
| `Image push failed` | Kiểm tra ACR login: `az acr login --name $REGISTRY_NAME` |
| `Container won't start` | Xem logs: `az containerapp logs show --name backend --resource-group $RESOURCE_GROUP` |
| `Database connection error` | Kiểm tra firewall rules + password đúng |
| `Frontend can't call backend` | Kiểm tra `NEXT_PUBLIC_API_URL` env var |

---

## 💡 Tips

- **Lưu URLs**: Copy `frontend.xxx.azurecontainerapps.io` vào Notepad
- **Cleanup quan trọng**: Xóa resource group sau test (tiết kiệm $)
- **Test từng bước**: Không chạy script một lần, chạy từng block
- **Debug**: `az containerapp logs show --name <app-name> --resource-group $RESOURCE_GROUP`

---

