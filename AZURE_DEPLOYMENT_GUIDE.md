## 📋 Mục Lục - Bắt Đầu Ở Đây

### 🚀 **PHẦN 1: BẮT ĐẦU NHANH (20 phút)**
1. [⚡ QUICK TEST MODE](#-ultra-quick-production-test-5-10-phút) - **Deploy & Test trong 20 phút**
2. [📍 LOCAL vs CLOUD Là Gì?](#-hướng-dẫn-thao-tác-trên-đâu-local-vs-cloud) - **Hiểu rõ mỗi bước chạy ở đâu**

### 📚 **PHẦN 2: HIỂU RÕ KIẾN THỨC**
3. [🏗️ Tổng Quan Kiến Trúc](#️-tổng-quan-kiến-trúc) - **Project này dùng gì**
4. [📖 Giải Thích Chi Tiết](#-giải-thích-chi-tiết-từng-bước) - **Tại sao phải làm từng bước**

### 🛠️ **PHẦN 3: CHUẨN BỊ & DEPLOY**
5. [📦 Yêu Cầu Trước Deploy](#-yêu-cầu-trước-khi-deploy)
6. [🚀 Container Apps Deployment](#-phương-pháp-1-deploy-với-azure-container-apps-khuyến-nghị) - **Cách deploy duy nhất**

### ✅ **PHẦN 4: PRODUCTION & CLEANUP**
7. [⏰ Thời Gian & Chi Phí](#-thời-gian--chi-phí-chi-tiết)
8. [📊 Best Practices](#-production-best-practices-applied)
9. [🧹 Cleanup & Xóa](#-cleanup--xóa-sạch-1-phút---stop-tính-phí)

### 📖 **PHẦN 5: TÀI LIỆU THAM KHẢO**
- [🔄 So Sánh Azure ↔ AWS](#-so-sánh-azure--aws) - **Nếu quen AWS**
- [🔐 Cấu Hình Bổ Sung](#-cấu-hình-dịch-vụ-bổ-sung)
- [📊 Monitoring & Bảo Mật](#-monitoring-và-bảo-mật)
- [🔄 CI/CD Pipeline](#-cicd-pipeline)
- [🐛 Troubleshooting](#-troubleshooting)
- [💡 Cost Optimization](#-tips-tiết-kiệm-chi-phí)
- [🎯 Best Practices](#-best-practices)

---
## ⚡ ULTRA-QUICK PRODUCTION TEST (5-10 phút)

**[⬆ Quay Lại Mục Lục](#-mục-lục---bắt-đầu-ở-đây)**

**Deploy setup giống production thực tế, chỉ chạy vài phút rồi tắt → Chi phí: <$1**

### 📊 Chi Phí So Sánh

| Thời Gian | Chi Phí | Loại |
|-----------|---------|------|
| 5 phút | ~$0.30 | **BẠN DÂY** |
| 10 phút | ~$0.60 | **BẠN DÂY** |
| 15 phút | ~$1.00 | Quick Test |
| 1 giờ | ~$4.00 | Development |
| 1 ngày | ~$100 | Production |

**Với Azure for Students ($100 credit/tháng): 100% MIỄN PHÍ!** ✅

### 🎬 Bắt Đầu (Copy-Paste Toàn Bộ)

**Mở terminal và paste từng block dưới đây:**

### BLOCK 1: Setup & Login (30 giây)

```bash
# Install Azure CLI (nếu chưa có)
brew install azure-cli

# Login
az login

# Set variables (COPY-PASTE BLOCK NÀY)
RESOURCE_GROUP="ecommerce-prod-test"
LOCATION="eastus"
CONTAINER_REGISTRY="ecommercereg"
ENVIRONMENT_NAME="ecommerce-prod-env"
MYSQL_SERVER="ecommerce-mysql-prod"
REDIS_NAME="ecommerce-redis-prod"
STORAGE_ACCOUNT="ecommercestorage"

# Verify subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "✅ Subscription: $SUBSCRIPTION_ID"
echo "✅ Resource Group: $RESOURCE_GROUP"
echo "✅ Location: $LOCATION"
```

### Bước 3: Tạo Resource Group (30 giây)

```bash
# Check if resource group exists
if az group exists --name $RESOURCE_GROUP -o tsv; then
  echo "⚠️  Resource group already exists. Skipping creation..."
else
  az group create --name $RESOURCE_GROUP --location $LOCATION
  echo "✅ Resource Group created"
fi
```

### Bước 4: Tạo Container Registry (30 giây)

```bash
# Check if ACR exists
if az acr show --name $CONTAINER_REGISTRY --resource-group $RESOURCE_GROUP 2>/dev/null; then
  echo "⚠️  ACR already exists. Using existing..."
else
  # Create with admin enabled (production should use managed identity)
  az acr create --resource-group $RESOURCE_GROUP \
    --name $CONTAINER_REGISTRY --sku Basic --admin-enabled true
  echo "✅ ACR created"
fi

# Get login server
ACR_LOGIN_SERVER=$(az acr show --name $CONTAINER_REGISTRY \
  --resource-group $RESOURCE_GROUP \
  --query loginServer --output tsv)

# Login
az acr login --name $CONTAINER_REGISTRY

echo "✅ ACR Login Server: $ACR_LOGIN_SERVER"
```

### Bước 5: Build Docker Images cho Production (3 phút)

```bash
cd /Users/hoang/Documents/code/E-Commerce

# Build backend với production Dockerfile
echo "Building backend image..."
docker build -f backend/dockerfile.prod \
  -t $ACR_LOGIN_SERVER/ecommerce-backend:v1.0 \
  -t $ACR_LOGIN_SERVER/ecommerce-backend:latest \
  backend/

docker push $ACR_LOGIN_SERVER/ecommerce-backend:v1.0
docker push $ACR_LOGIN_SERVER/ecommerce-backend:latest

# Build frontend với production Dockerfile
echo "Building frontend image..."
docker build -f frontend/dockerfile.prod \
  -t $ACR_LOGIN_SERVER/ecommerce-frontend:v1.0 \
  -t $ACR_LOGIN_SERVER/ecommerce-frontend:latest \
  frontend/

docker push $ACR_LOGIN_SERVER/ecommerce-frontend:v1.0
docker push $ACR_LOGIN_SERVER/ecommerce-frontend:latest

echo "✅ Images pushed to ACR (v1.0 & latest)"
```

### Bước 6: Tạo MySQL Database - Production Setup (2 phút)

```bash
# Create MySQL với backup enabled
echo "Creating MySQL Database..."
az mysql flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --admin-user dbadmin \
  --admin-password "Secure@Pwd123!Prod" \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 8.0.21 \
  --backup-retention 7 \
  --geo-redundant-backup Enabled \
  --public-access 0.0.0.0-255.255.255.255

# Get MySQL host
MYSQL_HOST=$(az mysql flexible-server show \
  --resource-group $RESOURCE_GROUP --name $MYSQL_SERVER \
  --query fullyQualifiedDomainName --output tsv)

# Create production database
az mysql flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER \
  --database-name ecommerce_prod \
  --charset utf8mb4 \
  --collation utf8mb4_unicode_ci

echo "✅ MySQL created with backups: $MYSQL_HOST"
```

### Bước 7: Tạo Redis - Standard Setup (1 phút)

```bash
# Create Redis Basic (đủ cho test & learning)
echo "Creating Redis Cache..."
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port false \
  --minimum-tls-version 1.2

# Get Redis info
REDIS_HOST=$(az redis show \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --query hostName --output tsv)

REDIS_PASSWORD=$(az redis list-keys \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --query primaryKey --output tsv)

echo "✅ Redis created (Basic C0): $REDIS_HOST"
echo "   Chi phí: ~$15-20/tháng (rất rẻ!)"
```

### Bước 8: Tạo Storage cho Static/Media Files (1 phút)

```bash
# Create Azure Blob Storage
echo "Creating Blob Storage..."
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --https-only true \
  --default-action Deny

# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query '[0].value' --output tsv)

# Get connection string
STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString --output tsv)

# Create containers
az storage container create --name media --connection-string "$STORAGE_CONNECTION" --public-access blob
az storage container create --name static --connection-string "$STORAGE_CONNECTION" --public-access blob

echo "✅ Blob Storage created with containers"
```

### Bước 9: Tạo Container Apps Environment (1 phút)

```bash
# Create environment với monitoring
echo "Creating Container Apps Environment..."
az containerapp env create \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

echo "✅ Container Apps Environment created"
```

### BLOCK 2: Deploy Backend + Frontend (5 phút)

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY \
  --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY \
  --query "passwords[0].value" --output tsv)

# ======================================
# DEPLOY BACKEND (Production Config)
# ======================================
echo "Deploying backend..."
az containerapp create --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_LOGIN_SERVER/ecommerce-backend:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8000 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 5 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    SECRET_KEY="$(openssl rand -base64 32)" \
    DEBUG="False" \
    ALLOWED_HOSTS="*.azurecontainerapps.io,*.azurefd.net" \
    DB_ENGINE="django.db.backends.mysql" \
    DB_NAME="ecommerce_prod" \
    DB_USER="dbadmin" \
    DB_PASSWORD="Secure@Pwd123!Prod" \
    DB_HOST="$MYSQL_HOST" \
    DB_PORT="3306" \
    REDIS_HOST="$REDIS_HOST" \
    REDIS_PORT="6380" \
    REDIS_PASSWORD="$REDIS_PASSWORD" \
    REDIS_DB="0" \
    AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT" \
    AZURE_STORAGE_ACCOUNT_KEY="$STORAGE_KEY" \
    DJANGO_SETTINGS_MODULE="backend.azure_settings" \
    CSRF_TRUSTED_ORIGINS="https://*.azurecontainerapps.io,https://*.azurefd.net"

# Get backend URL
BACKEND_URL=$(az containerapp show --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn --output tsv)

echo "✅ Backend deployed: https://$BACKEND_URL"

# ======================================
# DEPLOY FRONTEND (Production Config)
# ======================================
echo "Deploying frontend..."
az containerapp create --name ecommerce-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_LOGIN_SERVER/ecommerce-frontend:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 5 \
  --cpu 0.75 \
  --memory 1.5Gi \
  --env-vars \
    NODE_ENV="production" \
    NEXT_PUBLIC_API_URL="https://$BACKEND_URL/api" \
    NEXT_PUBLIC_WS_HOST="$BACKEND_URL" \
    NEXT_TELEMETRY_DISABLED="1"

# Get frontend URL
FRONTEND_URL=$(az containerapp show --name ecommerce-frontend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn --output tsv)

echo "✅ Frontend deployed: https://$FRONTEND_URL"

# Save URLs for later
echo "$BACKEND_URL" > /tmp/backend-url.txt
echo "$FRONTEND_URL" > /tmp/frontend-url.txt
```

---

## 📍 HƯỚNG DẪN: THAO TÁC TRên ĐÂU? (LOCAL vs CLOUD)

**QUAN TRỌNG:** Bạn cần biết mỗi command chạy ở **đâu** - máy tính hay Azure cloud

### 🖥️ LOCAL COMPUTER (Máy Tính của Bạn)

Những thao tác này chạy **trên máy tính của bạn**:

| Thao Tác | Command | Nơi Chạy | Lý Do |
|---------|---------|---------|-------|
| **Install Azure CLI** | `brew install azure-cli` | 💻 LOCAL | Cần tool để điều khiển Azure |
| **Build Docker Images** | `docker build -f backend/dockerfile.prod` | 💻 LOCAL | Build từ code source |
| **Push to Azure Registry** | `az acr login && docker push` | 💻 LOCAL | Upload image từ máy |
| **Test Backend API** | `curl -s https://$BACKEND_URL/api/` | 💻 LOCAL | Gửi request từ máy |
| **View Logs** | `az containerapp logs show` | 💻 LOCAL | Download logs về máy |

### ☁️ AZURE CLOUD (Trên Server Azure)

Những thao tác này thực tế **chạy trên Azure cloud**, nhưng bạn **điều khiển từ máy**:

| Thao Tác | Command Bạn Gõ | Thực Tế Chạy Ở Đâu | Là Cái Gì |
|---------|-----------|------------------|----------|
| **Create Resource Group** | `az group create` | ☁️ AZURE | Tạo thư mục trên cloud |
| **Create Container Registry** | `az acr create` | ☁️ AZURE | Tạo Docker registry trên cloud |
| **Create MySQL Database** | `az mysql flexible-server create` | ☁️ AZURE | Tạo database server trên cloud |
| **Create Redis Cache** | `az redis create` | ☁️ AZURE | Tạo cache server trên cloud |
| **Deploy Container App** | `az containerapp create` | ☁️ AZURE | Chạy container trên cloud |
| **Delete Resources** | `az group delete` | ☁️ AZURE | Xóa tất cả trên cloud |

### 📋 Flow Cụ Thể Từng Bước

```
┌──────────────────────────────────────┐
│  STEP 1: Login (💻 LOCAL)            │
│  $ az login                          │
│  ↓                                   │
│  Mở browser, login Azure account     │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│  STEP 2: Build Docker (💻 LOCAL)     │
│  $ docker build ...                  │
│  ↓                                   │
│  Compiler code thành Docker image    │
│  (file ~500MB trên máy)              │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│  STEP 3: Push to Azure (💻→☁️)       │
│  $ docker push ecommercereg.../      │
│  ↓                                   │
│  Upload image lên Azure Container    │
│  Registry (ACR) - nằm trên cloud     │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│  STEP 4: Deploy (💻 → ☁️ Commands)   │
│  $ az containerapp create ...        │
│  ↓                                   │
│  Điều khiển Azure tạo tài nguyên:    │
│  - Pull image từ ACR                 │
│  - Chạy container                    │
│  - Kết nối database, cache, storage  │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│  STEP 5: Test (💻 → ☁️ Services)     │
│  $ curl https://$BACKEND_URL         │
│  ↓                                   │
│  Gửi request từ máy                  │
│  Server Azure xử lý & trả kết quả    │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│  STEP 6: Cleanup (💻 → ☁️)           │
│  $ az group delete                   │
│  ↓                                   │
│  Azure xóa tất cả tài nguyên         │
│  (dừng tính phí)                     │
└──────────────────────────────────────┘
```

### 🎯 Chú Thích Dễ Hiểu

Khi bạn thấy command như:

```bash
az containerapp create --name ecommerce-backend \
  --min-replicas 2 \
  --max-replicas 5
```

**Bạn sẽ:**
1. Gõ command ở **terminal máy tính** của bạn (LOCAL)
2. Azure Cloud sẽ nhận lệnh và **thực thi trên cloud**
3. Kết quả là một container app chạy **trên Azure servers** (ở đâu đó trong internet)

**Nơi chạy code thực tế:**
- ❌ Máy tính của bạn (không có cấu hình đủ)
- ✅ **Máy chủ Azure** (ở datacenter Azure)

### 📊 Comparison: Local vs Cloud Resources

| Resource | Local (💻) | Azure Cloud (☁️) |
|----------|-----------|-----------------|
| **CPU** | Máy tính bạn (2-8 cores) | Azure servers (isolated) |
| **RAM** | RAM máy bạn (8-16GB) | Azure allocated (2.0Gi) |
| **Storage** | HDD/SSD máy bạn | Managed storage Azure |
| **Network** | Your internet connection | Azure data center network |
| **Uptime** | Phụ thuộc bạn bật máy | 99.95% SLA Azure |
| **Cost** | Electricity + hardware | Pay per hour ☁️ |

### ✅ Checklist: Hiểu Rõ

Trước khi chạy, xác nhận bạn hiểu:

- [ ] ✅ **Install Azure CLI** chạy ở **máy tính** (cần tool)
- [ ] ✅ **Build Docker** chạy ở **máy tính** (cần source code)
- [ ] ✅ **Push image** từ **máy tính** lên **Azure registry** (upload)
- [ ] ✅ **Create database/cache** điều khiển từ **máy tính**, nhưng **chạy ở Azure cloud**
- [ ] ✅ **Deploy app** điều khiển từ **máy tính**, nhưng **chạy ở Azure cloud**
- [ ] ✅ **Test app** từ **máy tính** gửi request tới **Azure server**
- [ ] ✅ **Xóa resources** điều khiển từ **máy tính**, Azure xóa từ **cloud**

---

### ❓ Cần Vào Portal Azure Web Không? (portal.azure.com)

**Câu Trả Lời: KHÔNG CẦN!** ✅

**Tất cả có thể làm từ Terminal:**

| Việc Cần Làm | Portal Web | Terminal (CLI) | Khuyến nghị |
|-------------|-----------|----------------|-----------|
| **Login** | ✅ Có | ✅ `az login` | ✅ **Terminal rẻ** |
| **Create Resources** | ✅ GUI | ✅ `az resource create` | ✅ **Terminal tốt** |
| **Deploy App** | ✅ Upload file | ✅ `az containerapp create` | ✅ **Terminal dễ** |
| **View Logs** | ✅ GUI realtime | ✅ `az containerapp logs show` | ✅ **Terminal đủ** |
| **Monitor** | ✅ Nice UI | ✅ `az monitor metrics list` | ⚠️ Portal tốt hơn |
| **Delete** | ✅ Click xóa | ✅ `az group delete` | ✅ **Terminal an toàn** |

---

#### 🔴 Portal Web (portal.azure.com) - Khi Nào Dùng?

**Chỉ cần nếu:**
- ✅ Muốn xem visual dashboard
- ✅ Muốn monitoring realtime UI
- ✅ Muốn debug lỗi quang studding
- ✅ Lần đầu học (hiểu giao diện)

**NHƯNG:**
- ❌ Chậm hơn terminal
- ❌ Dễ click nhầm xóa resource
- ❌ Khó automate

---

#### 🟢 Terminal (CLI) - Khuyến Nghị

**Tất cả bạn cần đều có thể làm:**

```bash
# 1. Login (thay vì click trên web)
az login

# 2. Create resource group (thay vì click trên web)
az group create --name mygroup --location eastus

# 3. Create everything (không cần web!)
az mysql flexible-server create ...
az redis create ...
az containerapp create ...

# 4. View logs (terminal + realtime)
az containerapp logs show --name backend

# 5. Monitor metrics (lệnh command)
az monitor metrics list --resource-group mygroup

# 6. Delete (1 command = xóa sạch)
az group delete --name mygroup --yes
```

---

#### 📊 So Sánh

**Portal Web Approach:**
```
1. Mở browser → https://portal.azure.com
2. Login account Microsoft
3. Tìm service (search, click, click, click...)
4. Fill form, click "Create"
5. Đợi 2-3 phút
6. Lặp lại 10 lần cho 10 resources
7. Tổng thời gian: 30-45 phút
```

**Terminal Approach:**
```
1. Mở terminal
2. $ az login (1 lần)
3. Copy-paste commands
4. Đợi auto-complete
5. Tất cả xong: 15-20 phút
```

**Vậy: Terminal nhanh hơn 2x!** ⚡

---

#### 🎯 Workflow Tối Ưu

**Làm:**
1. ✅ **Gõ lệnh** từ guide này ở terminal
2. ✅ **Không cần** mở browser portal
3. ✅ **Nếu muốn** xem UI: mở portal **sau khi** deploy xong (optional)

**VD:**
```bash
# Bước 1: Deploy (terminal)
az containerapp create --name backend ...
# ✅ XONG!

# Bước 2 (Optional): Xem trên web
# Mở https://portal.azure.com/
# → Click Container Apps → xem status
# → NHƯNG: Không cần để deploy thành công!
```

---

#### ⚡ Quick Reference: Terminal Commands Bạn Cần

**Không phải nhớ hết, chỉ cần copy-paste từ file này:**

```bash
# Login
az login

# Tạo mọi thứ
az group create ...
az acr create ...
az mysql flexible-server create ...
az redis create ...
az containerapp create ...

# Xem logs
az containerapp logs show --name backend --resource-group mygroup

# Xem status
az containerapp show --name backend --resource-group mygroup

# Xóa
az group delete --name mygroup --yes --no-wait
```

**Đó là tất cả! Portal KHÔNG cần!** 🎉

---

## 🏗️ Tổng Quan Kiến Trúc

**[⬆ Quay Lại Mục Lục](#-mục-lục---bắt-đầu-ở-đây)**

Project này bao gồm:
- **Backend**: Django 5.1.2 + Django REST Framework với Uvicorn ASGI server
- **Frontend**: Next.js 15.2.4 với App Router
- **Database**: MySQL 8.0
- **Cache**: Redis 7.x
- **Reverse Proxy**: NGINX
- **Payment**: Stripe Integration
- **Storage**: Media files (images)

### Kiến trúc trên Azure (Khuyến nghị)
```
                                    ┌─────────────────────┐
                                    │   Azure Front Door  │
                                    │   + CDN + WAF       │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┴──────────────────────────┐
                    │                                                      │
         ┌──────────▼──────────┐                            ┌────────────▼─────────┐
         │  Container App      │                            │   Container App      │
         │  (Next.js Frontend) │                            │  (Django Backend)    │
         │  + NGINX            │                            │  + Uvicorn           │
         └─────────────────────┘                            └──────────┬───────────┘
                                                                       │
                    ┌──────────────────────────────────────────────────┼───────────┐
                    │                                                  │           │
         ┌──────────▼──────────┐          ┌──────────▼──────────┐    │           │
         │  Azure Database for │          │  Azure Cache for    │    │           │
         │  MySQL              │          │  Redis              │    │           │
         └─────────────────────┘          └─────────────────────┘    │           │
                                                                      │           │
                                          ┌───────────────────────────▼───────────▼─┐
                                          │   Azure Blob Storage                     │
                                          │   (Static Files + Media)                 │
                                          └──────────────────────────────────────────┘
```

---

## 📚 GIẢI THÍCH CHI TIẾT TỪNG BƯỚC

Phần này giúp bạn **hiểu tại sao** phải làm từng bước.

### BLOCK 1: Setup & Infrastructure (12 phút)

#### **Bước 1: Install Azure CLI & Login**

```bash
az login
```

**Làm gì?**
- `az login`: Đăng nhập vào Azure bằng tài khoản của bạn
- Sau khi login, Azure sẽ lưu credential, dùng được cho lần sau

**Tại sao?**
- Cần xác minh bạn có quyền để tạo resources trên Azure
- Giống như login vào Gmail để tạo email

---

#### **Bước 2: Tạo Resource Group**

```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

**Làm gì?**
- Resource Group = **Thư mục chứa tất cả resources** (như một project folder)
- Tất cả: Database, Cache, Container Apps, Storage... sẽ nằm trong đây
- Khi xóa Resource Group → xóa hết tất cả bên trong

**Tại sao?**
- Để **quản lý tập trung**: Xóa 1 group = xóa hết mọi thứ (không tính phí thêm)
- Dễ theo dõi chi phí: Biết chính xác project này tốn bao nhiêu
- Tương tự như: Dự án trong công ty → có folder riêng

---

#### **Bước 3: Tạo Container Registry (ACR)**

```bash
az acr create --name $CONTAINER_REGISTRY --sku Basic
```

**Làm gì?**
- Container Registry = **Kho lưu trữ Docker images** (giống Docker Hub nhưng trên Azure)
- Sau khi build Docker image → push lên đây
- Azure Container Apps sẽ pull image từ đây để chạy

**Tại sao?**
- Docker image cần nơi để lưu trữ
- Dùng Azure Container Registry thay vì Docker Hub vì:
  - **Bảo mật**: Private (chỉ có bạn access được)
  - **Nhanh**: Cùng region Azure → pull image nhanh hơn
  - **Rẻ**: Tích hợp với Azure services

**Chi phí**: ~$5/tháng (Basic tier)

---

#### **Bước 4: Build & Push Docker Images**

```bash
docker build -f backend/dockerfile.prod -t $ACR_LOGIN_SERVER/ecommerce-backend:v1.0 backend/
docker push $ACR_LOGIN_SERVER/ecommerce-backend:v1.0
```

**Làm gì?**
- `docker build`: Tạo image từ Dockerfile
  - `-f backend/dockerfile.prod`: Dùng production Dockerfile (optimized)
  - `-t`: Đặt tag (tên) cho image
  - Tag có hai loại: `v1.0` (version) và `latest` (mới nhất)
- `docker push`: Upload image lên ACR

**Tại sao?**
- Cần image để chạy trên Azure
- Production Dockerfile khác development:
  - Kích thước nhỏ hơn
  - Không có debug tools
  - Chạy nhanh hơn

**Đặt tag:**
- `v1.0`: Version cố định (dễ rollback nếu có lỗi)
- `latest`: Tag mới nhất (dùng cho development)

---

#### **Bước 5: Tạo MySQL Database**

```bash
az mysql flexible-server create \
  --sku-name Standard_B2s \
  --backup-retention 7 \
  --geo-redundant-backup Enabled
```

**Làm gì?**
- Tạo MySQL server trên Azure
- **Standard_B2s**: Tier nhất định (CPU + RAM)
- **7-day backup**: Tự động backup dữ liệu, giữ 7 ngày
- **Geo-redundant**: Backup trong nhiều region (nếu 1 region die → vẫn có backup)

**Tại sao?**
- Database để **lưu dữ liệu** (sản phẩm, user, order)
- Production cần backup vì:
  - Nếu DB bị xóa → có backup để restore
  - Nếu Azure region bị down → có geo-redundant backup ở region khác
  - Dữ liệu là tài sản, không thể mất

**Charset UTF8MB4:**
- Để support emoji, ký tự Việt, v.v.
- MySQL mặc định là `latin1` (chỉ support A-Z)

---

#### **Bước 6: Tạo Redis Cache**

```bash
az redis create --sku Basic --vm-size c0 --minimum-tls-version 1.2
```

**Làm gì?**
- Tạo Redis = **In-memory cache** (lưu dữ liệu trong RAM)
- Chạy nhanh hơn Database hàng lần (RAM vs Disk)
- **TLS 1.2**: Encrypt connection (bảo mật)

**Tại sao?**
- **Performance**: Query database chậm (1-10ms), cache nhanh (0.1-1ms)
- Project này dùng Redis cho:
  - Cache products list (500 sản phẩm → lưu vào cache)
  - Session management (login info)
  - Real-time data (giỏ hàng)

**Basic vs Premium:**
- Basic C0: **Rẻ** (~$15/tháng), không có persistence
- Premium: **Đắt** (~$200+/tháng), có persistence (backup)
- Cho test → Basic đủ rồi, production mới upgrade Premium

---

#### **Bước 7: Tạo Azure Blob Storage**

```bash
az storage account create \
  --kind StorageV2 \
  --https-only true \
  --default-action Deny
```

**Làm gì?**
- Blob Storage = **Lưu files** (hình ảnh, PDF, v.v.)
- `--https-only`: Chỉ accept HTTPS (bảo mật, không cho HTTP)
- `--default-action Deny`: Mặc định từ chối, chỉ cho access từ app

**Tại sao?**
- Project có upload ảnh sản phẩm → cần chỗ lưu
- Không lưu ảnh vào DB (DB sẽ quá nặng)
- Lưu vào filesystem local thì mất khi redeploy

**Containers:**
- `media`: Lưu ảnh user upload (products, avatars)
- `static`: Lưu CSS, JS (frontend assets)

---

#### **Bước 8: Tạo Container Apps Environment**

```bash
az containerapp env create --name $ENVIRONMENT_NAME
```

**Làm gì?**
- Tạo một **môi trường** để chạy container apps
- Giống như: Một máy chủ (server) trong data center

**Tại sao?**
- Container Apps cần environment để:
  - Networking (containers kết nối với nhau)
  - Shared resources (volume, secrets)
  - Monitoring

---

### BLOCK 2: Deploy Applications (5 phút)

#### **Bước 9: Deploy Backend Container App**

```bash
az containerapp create --name ecommerce-backend \
  --min-replicas 2 \
  --max-replicas 5 \
  --cpu 1.0 \
  --memory 2.0Gi
```

**Làm gì?**
- Tạo container app từ image backend
- **min-replicas 2**: Luôn chạy ít nhất 2 instance
- **max-replicas 5**: Tối đa 5 instance
- **cpu 1.0**: Mỗi instance dùng 1 CPU core
- **memory 2.0Gi**: Mỗi instance dùng 2GB RAM

**Tại sao?**
- **Min 2 replicas**: High Availability
  - Nếu 1 replica bị crash → vẫn còn 1 cái chạy
  - Users không gặp downtime
- **Max 5 replicas**: Auto-scaling
  - Khi traffic cao → Azure tự tạo thêm replicas
  - Khi traffic thấp → Azure xóa replicas để tiết kiệm chi phí

**Environment variables:**
- `SECRET_KEY`: Để Django encrypt sessions
- `DEBUG=False`: Production mode (không show error details)
- `DB_HOST=$MYSQL_HOST`: Kết nối tới MySQL ta vừa tạo
- `REDIS_HOST=$REDIS_HOST`: Kết nối tới Redis ta vừa tạo
- Và nhiều config khác...

---

#### **Bước 10: Deploy Frontend Container App**

```bash
az containerapp create --name ecommerce-frontend \
  --min-replicas 2 \
  --max-replicas 5 \
  --cpu 0.75
  --memory 1.5Gi
```

**Làm gì?**
- Tương tự backend nhưng:
- **CPU 0.75** (thấp hơn backend vì frontend ít tính toán)
- **Memory 1.5Gi** (thấp hơn backend)
- Pass `NEXT_PUBLIC_API_URL=$BACKEND_URL` để frontend biết backend URL

**Tại sao?**
- Frontend là Next.js app
- Ít tính toán → dùng ít resources hơn backend
- Chi phí = resources used

---

### BLOCK 3: Testing (2 phút)

#### **Test 1: Backend Health Check**

```bash
curl -s -w "\nStatus: %{http_code}\n" https://$BACKEND_URL/api/
```

**Làm gì?**
- Gọi API `/api/` để kiểm tra backend chạy không
- Status 200 = OK, 500 = Error

**Tại sao?**
- Chứng minh deployment thành công
- Nếu fail → check logs để debug

---

#### **Test 2: Frontend Load**

```bash
curl -s -o /dev/null -w "Status: %{http_code}\n" https://$FRONTEND_URL
```

**Làm gì?**
- Load trang chủ, kiểm tra status code

**Tại sao?**
- Chứng minh frontend up & running

---

### BLOCK 4: Cleanup (2 phút)

#### **Xóa Resource Group**

```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

**Làm gì?**
- Xóa **tất cả** resources trong group
- `--no-wait`: Không đợi xóa xong, return ngay (xóa ở background)

**Tại sao?**
- Xóa sạch để **dừng tính phí**
- Azure chỉ tính phí khi resources đang chạy
- Nếu không xóa → vẫn tính phí mặc dù không dùng

---

## 📦 Yêu Cầu Trước Khi Deploy

### 1. Cài Đặt Azure CLI
```bash
# macOS
brew update && brew install azure-cli

# Verify installation
az --version

# Login to Azure
az login
```

### 2. Tạo Azure Account và Subscription
- Đăng ký tài khoản tại: https://azure.microsoft.com/free/
- Xác nhận subscription ID: `az account show --query id -o tsv`

### 3. Cài Đặt Docker Desktop
```bash
# macOS
brew install --cask docker

# Verify
docker --version
docker-compose --version
```

### 4. Tạo Stripe Account
- Đăng ký tại: https://stripe.com
- Lấy API keys từ Dashboard
- Lấy Webhook secret từ Developers > Webhooks

### 5. Chuẩn Bị Environment Variables
Tạo file `.env.azure` với nội dung:

```bash
# Django Settings
SECRET_KEY=your-super-secret-key-here-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=*.azurecontainerapps.io,*.azurefd.net,your-custom-domain.com

# Database Configuration (sẽ update sau khi tạo Azure MySQL)
DB_ENGINE=django.db.backends.mysql
DB_NAME=ecommerce_prod
DB_USER=adminuser
DB_PASSWORD=YourSecurePassword123!
DB_HOST=your-mysql-server.mysql.database.azure.com
DB_PORT=3306

# Redis Configuration (sẽ update sau khi tạo Azure Redis)
REDIS_HOST=your-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-access-key
REDIS_DB=0

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL
FRONTEND_URL=https://your-frontend.azurecontainerapps.io

# Next.js Settings
NEXT_PUBLIC_API_URL=https://your-backend.azurecontainerapps.io/api
NEXT_PUBLIC_WS_HOST=your-backend.azurecontainerapps.io
NODE_ENV=production

# MySQL Root Password
MYSQL_ROOT_PASSWORD=YourRootPassword123!
MYSQL_DATABASE=ecommerce_prod
MYSQL_USER=adminuser
MYSQL_PASSWORD=YourSecurePassword123!
```

---

## 🚀 Phương Pháp 1: Deploy với Azure Container Apps (Khuyến nghị)

Azure Container Apps là lựa chọn tốt nhất cho project này vì:
- ✅ Hỗ trợ multiple containers
- ✅ Auto-scaling linh hoạt
- ✅ Managed infrastructure
- ✅ Cost-effective
- ✅ Easy deployment

### Bước 1: Tạo Resource Group

```bash
# Set variables
RESOURCE_GROUP="ecommerce-rg"
LOCATION="eastus"  # hoặc "southeastasia" cho gần Việt Nam hơn
CONTAINER_REGISTRY="ecommerceacr$(date +%s)"  # unique name

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### Bước 2: Tạo Azure Container Registry (ACR)

```bash
# Create container registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_REGISTRY \
  --sku Basic \
  --admin-enabled true

# Login to ACR
az acr login --name $CONTAINER_REGISTRY

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show \
  --name $CONTAINER_REGISTRY \
  --query loginServer \
  --output tsv)

echo "ACR Login Server: $ACR_LOGIN_SERVER"
```

### Bước 3: Tạo Azure Database for MySQL

```bash
# Set variables
MYSQL_SERVER="ecommerce-mysql-$(date +%s)"
MYSQL_ADMIN_USER="adminuser"
MYSQL_ADMIN_PASSWORD="YourSecurePassword123!"
MYSQL_DATABASE="ecommerce_prod"

# Create MySQL Flexible Server
az mysql flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --location $LOCATION \
  --admin-user $MYSQL_ADMIN_USER \
  --admin-password $MYSQL_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 8.0.21 \
  --public-access 0.0.0.0-255.255.255.255

# Create database
az mysql flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER \
  --database-name $MYSQL_DATABASE

# Configure firewall (cho phép Azure services)
az mysql flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --rule-name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Get connection string
MYSQL_HOST=$(az mysql flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --query fullyQualifiedDomainName \
  --output tsv)

echo "MySQL Host: $MYSQL_HOST"
```

### Bước 4: Tạo Azure Cache for Redis

```bash
# Set variables
REDIS_NAME="ecommerce-redis-$(date +%s)"

# Create Redis Cache
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port false

# Get Redis connection info
REDIS_HOST=$(az redis show \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --query hostName \
  --output tsv)

REDIS_PASSWORD=$(az redis list-keys \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --query primaryKey \
  --output tsv)

REDIS_PORT=6380

echo "Redis Host: $REDIS_HOST"
echo "Redis Port: $REDIS_PORT"
echo "Redis Password: $REDIS_PASSWORD"
```

### Bước 5: Tạo Azure Blob Storage

```bash
# Set variables
STORAGE_ACCOUNT="ecommercestorage$(date +%s)"
CONTAINER_NAME="media"

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Get storage connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --output tsv)

# Create blob container for media files
az storage container create \
  --name $CONTAINER_NAME \
  --connection-string $STORAGE_CONNECTION_STRING \
  --public-access blob

# Create container for static files
az storage container create \
  --name "static" \
  --connection-string $STORAGE_CONNECTION_STRING \
  --public-access blob

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query '[0].value' \
  --output tsv)

echo "Storage Account: $STORAGE_ACCOUNT"
echo "Storage Key: $STORAGE_KEY"
```

### Bước 6: Update Django Settings cho Azure

Tạo file `backend/backend/azure_settings.py`:

```python
import os
from .settings import *

# Azure-specific settings
DEBUG = False

# Security settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Azure Blob Storage for media files
DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
AZURE_ACCOUNT_NAME = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
AZURE_ACCOUNT_KEY = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY')
AZURE_CONTAINER = 'media'
AZURE_CUSTOM_DOMAIN = f'{AZURE_ACCOUNT_NAME}.blob.core.windows.net'
MEDIA_URL = f'https://{AZURE_CUSTOM_DOMAIN}/{AZURE_CONTAINER}/'

# Static files on Azure Blob
STATICFILES_STORAGE = 'storages.backends.azure_storage.AzureStorage'
AZURE_STATIC_CONTAINER = 'static'
STATIC_URL = f'https://{AZURE_CUSTOM_DOMAIN}/{AZURE_STATIC_CONTAINER}/'

# Redis SSL configuration for Azure
CACHES['default']['OPTIONS']['CONNECTION_POOL_KWARGS']['ssl_cert_reqs'] = None
CACHES['default']['LOCATION'] = f'rediss://:{os.environ.get("REDIS_PASSWORD")}@{os.environ.get("REDIS_HOST")}:{os.environ.get("REDIS_PORT")}/0'
```

Thêm vào `backend/requirements.txt`:

```
django-storages[azure]==1.14.2
```

### Bước 7: Build và Push Docker Images

#### 7.1. Update Backend Dockerfile cho Production

Tạo file `backend/dockerfile.prod`:

```dockerfile
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Production entrypoint
CMD ["sh", "-c", "\
    python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput && \
    uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --workers 4"]
```

#### 7.2. Update Frontend Dockerfile cho Production

Tạo file `frontend/dockerfile.prod`:

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

#### 7.3. Build và Push Images

```bash
# Navigate to project root
cd /Users/hoang/Documents/code/E-Commerce

# Build backend image
docker build -f backend/dockerfile.prod -t $ACR_LOGIN_SERVER/ecommerce-backend:latest backend/

# Build frontend image  
docker build -f frontend/dockerfile.prod -t $ACR_LOGIN_SERVER/ecommerce-frontend:latest frontend/

# Build nginx image
docker build -t $ACR_LOGIN_SERVER/ecommerce-nginx:latest nginx/

# Push images to ACR
docker push $ACR_LOGIN_SERVER/ecommerce-backend:latest
docker push $ACR_LOGIN_SERVER/ecommerce-frontend:latest
docker push $ACR_LOGIN_SERVER/ecommerce-nginx:latest

# Verify images
az acr repository list --name $CONTAINER_REGISTRY --output table
```

### Bước 8: Tạo Container Apps Environment

```bash
# Set variables
ENVIRONMENT_NAME="ecommerce-env"

# Create Container Apps Environment
az containerapp env create \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### Bước 9: Deploy Backend Container App

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
  --name $CONTAINER_REGISTRY \
  --query username \
  --output tsv)

ACR_PASSWORD=$(az acr credential show \
  --name $CONTAINER_REGISTRY \
  --query "passwords[0].value" \
  --output tsv)

# Deploy backend
az containerapp create \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_LOGIN_SERVER/ecommerce-backend:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    SECRET_KEY=secretvalue \
    DEBUG=False \
    ALLOWED_HOSTS="*.azurecontainerapps.io" \
    DB_ENGINE=django.db.backends.mysql \
    DB_NAME=$MYSQL_DATABASE \
    DB_USER=$MYSQL_ADMIN_USER \
    DB_PASSWORD=$MYSQL_ADMIN_PASSWORD \
    DB_HOST=$MYSQL_HOST \
    DB_PORT=3306 \
    REDIS_HOST=$REDIS_HOST \
    REDIS_PORT=$REDIS_PORT \
    REDIS_PASSWORD=$REDIS_PASSWORD \
    REDIS_DB=0 \
    AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT \
    AZURE_STORAGE_ACCOUNT_KEY=$STORAGE_KEY \
    STRIPE_SECRET_KEY="your-stripe-secret-key" \
    STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key" \
    STRIPE_WEBHOOK_SECRET="your-webhook-secret"

# Get backend URL
BACKEND_URL=$(az containerapp show \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo "Backend URL: https://$BACKEND_URL"
```

### Bước 10: Deploy Frontend Container App

```bash
# Deploy frontend
az containerapp create \
  --name ecommerce-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_LOGIN_SERVER/ecommerce-frontend:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL=https://$BACKEND_URL/api \
    NEXT_PUBLIC_WS_HOST=$BACKEND_URL

# Get frontend URL
FRONTEND_URL=$(az containerapp show \
  --name ecommerce-frontend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo "Frontend URL: https://$FRONTEND_URL"
```

### Bước 11: Update CORS và CSRF Settings

```bash
# Update backend với CORS settings
az containerapp update \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    ALLOWED_HOSTS="*.azurecontainerapps.io,*.azurefd.net" \
    FRONTEND_URL=https://$FRONTEND_URL
```

### Bước 12: Thiết Lập Azure Front Door (CDN + SSL)

```bash
# Set variables
FRONTDOOR_NAME="ecommerce-fd"

# Create Front Door profile
az afd profile create \
  --profile-name $FRONTDOOR_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Premium_AzureFrontDoor

# Create endpoint
az afd endpoint create \
  --profile-name $FRONTDOOR_NAME \
  --endpoint-name ecommerce-endpoint \
  --resource-group $RESOURCE_GROUP

# Add frontend origin group
az afd origin-group create \
  --profile-name $FRONTDOOR_NAME \
  --origin-group-name frontend-origins \
  --resource-group $RESOURCE_GROUP \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 120 \
  --probe-path / \
  --sample-size 4 \
  --successful-samples-required 3 \
  --additional-latency-in-milliseconds 50

# Add frontend origin
az afd origin create \
  --profile-name $FRONTDOOR_NAME \
  --origin-group-name frontend-origins \
  --origin-name frontend \
  --resource-group $RESOURCE_GROUP \
  --host-name $FRONTEND_URL \
  --origin-host-header $FRONTEND_URL \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled \
  --http-port 80 \
  --https-port 443

# Add backend origin group
az afd origin-group create \
  --profile-name $FRONTDOOR_NAME \
  --origin-group-name backend-origins \
  --resource-group $RESOURCE_GROUP \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 120 \
  --probe-path /api/health \
  --sample-size 4 \
  --successful-samples-required 3

# Add backend origin
az afd origin create \
  --profile-name $FRONTDOOR_NAME \
  --origin-group-name backend-origins \
  --origin-name backend \
  --resource-group $RESOURCE_GROUP \
  --host-name $BACKEND_URL \
  --origin-host-header $BACKEND_URL \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled \
  --http-port 80 \
  --https-port 443

echo "✅ Azure Container Apps deployment completed!"
echo "Frontend: https://$FRONTEND_URL"
echo "Backend: https://$BACKEND_URL"
```

## ⏱️ BƯỚC CUỐI: Production Test + Cleanup (5 phút)

### BLOCK 3: Production Tests (2-3 phút)

```bash
# Get URLs
BACKEND_URL=$(cat /tmp/backend-url.txt)
FRONTEND_URL=$(cat /tmp/frontend-url.txt)

echo "=========================================="
echo "🧪 PRODUCTION TESTS"
echo "=========================================="

# Test 1: Backend Health Check
echo ""
echo "📌 Test 1: Backend Health Check"
curl -s -w "\nStatus: %{http_code}\n" https://$BACKEND_URL/api/

# Test 2: Frontend Load
echo ""
echo "📌 Test 2: Frontend Page Load"
curl -s -o /dev/null -w "Status: %{http_code}\n" https://$FRONTEND_URL

# Test 3: Database Connection
echo ""
echo "📌 Test 3: Database Configuration"
echo "MySQL Host: $MYSQL_HOST"
echo "Database: ecommerce_prod"

# Test 4: Redis Connection
echo ""
echo "📌 Test 4: Redis Cache"
echo "Redis Host: $REDIS_HOST"

# Test 5: Storage
echo ""
echo "📌 Test 5: Blob Storage"
echo "Storage Account: $STORAGE_ACCOUNT"
echo "Containers: media, static"

# Test 6: Container Metrics
echo ""
echo "📌 Test 6: Container Status & Replicas"
az containerapp show --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --query "properties.{replicas:configuration.maxReplicas,cpu:template.containers[0].resources.cpu,memory:template.containers[0].resources.memory}" \
  -o table

echo ""
echo "✅ ALL TESTS COMPLETED!"
echo "=========================================="
echo "Backend: https://$BACKEND_URL"
echo "Frontend: https://$FRONTEND_URL"
echo "=========================================="
```

### BLOCK 4: Production Checklist (xem trước khi xóa)

```bash
# Checklist trước khi xóa
echo "✅ Deployment Checklist:"
echo "  [ ] Frontend loads successfully"
echo "  [ ] Backend API responds"
echo "  [ ] Database connected"
echo "  [ ] Redis cache ready"
echo "  [ ] Storage containers created"
echo "  [ ] Min 2 replicas running"
echo "  [ ] Resources allocated correctly"
echo ""
echo "🎯 Production Setup Verified!"
```

### BLOCK 5: Xóa Sạch (2 phút - STOP TÍNH PHÍ!)

```bash
echo "🧹 Cleaning up all Azure resources..."
echo "⚠️  ĐIỀU NÀY KHÔNG THỂ UNDO!"
echo ""
echo "Resources to be deleted:"
echo "  - Resource Group: $RESOURCE_GROUP"
echo "  - Container Apps (backend + frontend)"
echo "  - MySQL Database"
echo "  - Redis Cache"
echo "  - Blob Storage"
echo "  - Container Registry"
echo ""
read -p "Type 'DELETE' to confirm deletion: " confirm

if [ "$confirm" = "DELETE" ]; then
  echo "Deleting resource group: $RESOURCE_GROUP"
  az group delete --name $RESOURCE_GROUP --yes --no-wait
  echo ""
  echo "✅ Resource Group scheduled for deletion"
  echo "💰 Tính phí sẽ dừng trong 5-10 phút"
  echo ""
  echo "Check status:"
  echo "  az group show --name $RESOURCE_GROUP"
  echo "  az group list --output table"
else
  echo "❌ Deletion cancelled - Resources still running!"
  echo "⚠️  Remember to delete manually to avoid extra charges!"
fi
```

---

## ⏰ Thời Gian & Chi Phí Chi Tiết

```
BLOCK 1: Setup + Build + Infrastructure (12 phút)
  - Azure CLI setup: 30 giây
  - Docker builds: 3-4 phút
  - MySQL creation: 2-3 phút
  - Redis creation: 1-2 phút
  - ACR + Storage: 2 phút
  - Subtotal: ~12 phút

BLOCK 2: Deploy Apps (5 phút)
  - Backend deployment: 2-3 phút
  - Frontend deployment: 2-3 phút
  - Subtotal: ~5 phút

BLOCK 3: Testing (2 phút)
  - Health checks: 1 phút
  - Verification: 1 phút
  - Subtotal: ~2 phút

BLOCK 4-5: Cleanup (2 phút)
  - Confirmation: 1 phút
  - Deletion: 1 phút
  - Subtotal: ~2 phút

────────────────────
TOTAL TIME: ~20 phút
────────────────────

COST BREAKDOWN (20 phút):
  Container Apps: ~$0.40
  MySQL Basic: ~$0.80 (Standard_B2s)
  Redis Basic: ~$0.15 (C0 tier)
  Storage: ~$0.10
  ────────────
  TOTAL: ~$1.45 (rẻ hơn!)
  
  Với Azure for Students: MIỄN PHÍ! ✅
```

---

---

## 📊 Production Best Practices Applied

| Feature | Status | Details |
|---------|--------|---------|
| **Database Backups** | ✅ | Geo-redundant enabled, 7-day retention |
| **Database Charset** | ✅ | UTF8MB4 for emoji/international support |
| **Cache Layer** | ✅ | Basic Redis C0 with TLS 1.2 |
| **HTTPS/TLS** | ✅ | TLS 1.2+ enforced |
| **Container Replicas** | ✅ | Min 2, Max 5 for HA |
| **Storage Security** | ✅ | HTTPS only, default action Deny |
| **Version Control** | ✅ | Images tagged with v1.0 & latest |
| **Resource Limits** | ✅ | CPU/Memory explicitly defined |
| **Debug Mode** | ✅ | DEBUG=False in production |
| **CORS/CSRF** | ✅ | Configured for production domains |
| **Monitoring** | ✅ | Container metrics available |
| **Auto-scaling** | ✅ | Configured with min/max replicas |

---

## 🎯 Tóm Tắt Process

```
┌─────────────────────────────────────────┐
│  1. Tạo Resource Group                  │
│     (Thư mục chứa tất cả)               │
├─────────────────────────────────────────┤
│  2. Tạo Container Registry (ACR)        │
│     (Kho lưu Docker images)             │
├─────────────────────────────────────────┤
│  3. Build & Push Docker Images          │
│     (Tạo image từ code)                 │
├─────────────────────────────────────────┤
│  4. Tạo Database (MySQL)                │
│     (Lưu dữ liệu)                       │
├─────────────────────────────────────────┤
│  5. Tạo Cache (Redis)                   │
│     (Tăng performance)                  │
├─────────────────────────────────────────┤
│  6. Tạo Storage (Blob)                  │
│     (Lưu ảnh/files)                     │
├─────────────────────────────────────────┤
│  7. Tạo Container Apps Environment      │
│     (Môi trường chạy)                   │
├─────────────────────────────────────────┤
│  8. Deploy Backend Container            │
│     (Chạy Django API)                   │
├─────────────────────────────────────────┤
│  9. Deploy Frontend Container           │
│     (Chạy Next.js frontend)             │
├─────────────────────────────────────────┤
│  10. Test All Services                  │
│      (Kiểm tra chạy được)               │
├─────────────────────────────────────────┤
│  11. Cleanup (xóa sạch)                 │
│      (Dừng tính phí)                    │
└─────────────────────────────────────────┘
```

---

```bash
# Save URLs
echo "BACKEND_URL=$BACKEND_URL" > /tmp/demo-urls.txt
echo "FRONTEND_URL=$FRONTEND_URL" >> /tmp/demo-urls.txt

# Test 1: Backend API
echo "Testing backend..."
curl -s https://$BACKEND_URL/api/ | head -20

# Test 2: Frontend
echo "Testing frontend..."
curl -s -o /dev/null -w "%{http_code}" https://$FRONTEND_URL

echo "✅ Basic tests passed"
```

### Test Checklist:
- [ ] Mở browser: `https://$FRONTEND_URL` → Xem trang chủ
- [ ] Test API: `https://$BACKEND_URL/api/` → Xem response
- [ ] Kiểm tra logs: `az containerapp logs show --name demo-backend -g $RESOURCE_GROUP`

---

## 🧹 Cleanup & Xóa Sạch (1 phút - STOP TÍNH PHÍ!)

**⚠️ QUAN TRỌNG**: Sau khi test xong, xóa resource group để dừng tính phí ngay lập tức!

```bash
# Xóa tất cả resources
az group delete --name $RESOURCE_GROUP --yes --no-wait

echo "✅ All resources scheduled for deletion"
echo "💰 Tính phí sẽ dừng trong vài phút"
```

**Hoặc xóa từng resource nếu muốn giữ một số:**

```bash
# Xóa Container Apps
az containerapp delete --name demo-backend -g $RESOURCE_GROUP -y
az containerapp delete --name demo-frontend -g $RESOURCE_GROUP -y

# Xóa MySQL
az mysql flexible-server delete --name $MYSQL_SERVER -g $RESOURCE_GROUP -y

# Xóa Redis
az redis delete --name $REDIS_NAME -g $RESOURCE_GROUP -y

# Xóa ACR
az acr delete --name $CONTAINER_REGISTRY -g $RESOURCE_GROUP -y

# Cuối cùng xóa resource group
az group delete --name $RESOURCE_GROUP --yes
```

---

## 💰 Chi Phí Test Thực Tế

| Resource | Thời Gian | Chi Phí |
|----------|-----------|---------|
| Container Apps (2) | 15 phút | ~$0.10 |
| MySQL | 15 phút | ~$0.50 |
| Redis | 15 phút | ~$0.20 |
| ACR | 15 phút | ~$0.05 |
| **TỔNG** | **15 phút** | **~$0.85-1.50** |

**Với $100 Azure for Students credit → HOÀN TOÀN MIỄN PHÍ!** ✅

---

---

## 🔄 So Sánh Azure ↔ AWS

**[⬆ Quay Lại Mục Lục](#-mục-lục---bắt-đầu-ở-đây)**

Nếu bạn quen thuộc với AWS, đây là mapping tương ứng:

### 📊 Service Comparison Table

| Công Năng | Azure | AWS | So Sánh |
|-----------|-------|-----|---------|
| **Container Orchestration** | Container Apps | ECS / Fargate | Container Apps đơn giản hơn, Fargate rẻ hơn |
| **Container Orchestration** | AKS (Kubernetes) | EKS | Tương tự nhau, EKS đắt hơn ~20-30% |
| **Virtual Machines** | VMs | EC2 | Azure đơn giản hơn, AWS linh hoạt hơn |
| **App Hosting** | App Service | Elastic Beanstalk / AppRunner | Tương tự |
| **Database** | Azure Database for MySQL | RDS MySQL | Giống nhau, giá tương đương |
| **Cache** | Azure Cache for Redis | ElastiCache Redis | Giống nhau, Azure hơi rẻ |
| **Object Storage** | Blob Storage | S3 | S3 phổ biến hơn, tính năng tương tự |
| **CDN** | Azure Front Door | CloudFront | Tương tự, Front Door tích hợp tốt hơn |
| **Container Registry** | ACR | ECR | Tương tự, cùng giá |
| **Monitoring** | Application Insights | CloudWatch | CloudWatch tốt hơn, giá khác nhau |
| **CI/CD** | Azure Pipelines | CodePipeline | Tương tự, AWS tích hợp tốt hơn |
| **Secrets** | Key Vault | Secrets Manager | Giống nhau |
| **Load Balancer** | Load Balancer | ALB / NLB | Tương tự |
| **DNS** | Azure DNS | Route 53 | Route 53 phổ biến hơn |

---

### 🚀 Quick Start: Container Apps ↔ AWS Fargate

**Scenario: Deploy E-Commerce platform dùng containers**

#### Azure (Container Apps)
```bash
# Setup
az containerapp env create --name myenv
az containerapp create \
  --name backend \
  --environment myenv \
  --image myacr.azurecr.io/backend:latest \
  --min-replicas 2 \
  --max-replicas 5 \
  --cpu 1.0 \
  --memory 2.0Gi

# Chi phí: ~$0.03/hour (luôn 2 instance chạy)
```

#### AWS (Fargate)
```bash
# Setup
aws ecs create-cluster --cluster-name myapp
aws ecs register-task-definition \
  --family myapp-backend \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 1024 \
  --memory 2048 \
  --container-definitions '[{"name":"backend","image":"123456789.dkr.ecr.us-east-1.amazonaws.com/backend:latest"}]'

aws ecs create-service \
  --cluster myapp \
  --service-name backend \
  --task-definition myapp-backend \
  --launch-type FARGATE \
  --desired-count 2 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"

# Chi phí: ~$0.05/hour (phức tạp hơn)
```

**Nhận xét:**
- Azure Container Apps: **Đơn giản hơn** (không cần VPC, security group)
- AWS Fargate: **Rẻ hơn** nhưng **phức tạp hơn**

---

### 💾 Database: Azure MySQL ↔ AWS RDS

#### Azure
```bash
az mysql flexible-server create \
  --name mydb \
  --sku-name Standard_B2s \
  --backup-retention 7 \
  --geo-redundant-backup Enabled

# Chi phí: ~$0.20/hour (Standard_B2s)
# Backup: Tự động, 7 ngày
```

#### AWS
```bash
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t4g.small \
  --engine mysql \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --enable-iam-database-authentication

# Chi phí: ~$0.017/hour (t4g.small) + storage
# Backup: Tự động, 7 ngày
```

**Nhận xét:**
- **Giá**: AWS rẻ hơn ~10x (nhưng cần pay thêm storage)
- **Tính năng**: Tương tự nhau
- **Quản lý**: Azure dễ dàng hơn

---

### 🗄️ Cache: Azure Redis ↔ AWS ElastiCache

#### Azure
```bash
az redis create \
  --name mycache \
  --sku Basic \
  --vm-size c0

# Chi phí: ~$0.015/hour (Basic C0)
```

#### AWS
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id mycache \
  --cache-node-type cache.t4g.micro \
  --engine redis \
  --num-cache-nodes 1

# Chi phí: ~$0.012/hour (t4g.micro)
```

**Nhận xét:**
- **Giá**: Gần tương đương
- **Tính năng**: AWS tích hợp VPC tốt hơn
- **Quản lý**: Azure đơn giản hơn

---

### 📁 Storage: Azure Blob ↔ AWS S3

#### Azure
```bash
az storage account create \
  --name mystorage \
  --kind StorageV2 \
  --sku Standard_LRS

az storage container create \
  --name media \
  --account-name mystorage

# Chi phí: $0.024/GB/month
```

#### AWS
```bash
aws s3 mb s3://my-bucket
aws s3 cp image.jpg s3://my-bucket/media/

# Chi phí: $0.023/GB/month
```

**Nhận xét:**
- **Giá**: Gần như nhau
- **Phổ biến**: S3 dùng rộng rãi hơn
- **Tính năng**: S3 tính năng nhiều hơn

---

### 🌐 CDN: Azure Front Door ↔ AWS CloudFront

#### Azure
```bash
az afd profile create \
  --profile-name mycdn \
  --sku Premium_AzureFrontDoor

# Chi phí: $0.079/10k requests + $0.085/GB data
```

#### AWS
```bash
aws cloudfront create-distribution \
  --origin-domain-name mybucket.s3.amazonaws.com \
  --default-root-object index.html

# Chi phí: $0.085/10k requests + $0.085/GB data
```

**Nhận xét:**
- **Giá**: Gần như nhau
- **Phổ biến**: CloudFront sử dụng rộng rãi hơn
- **Tính năng**: Tương tự nhau

---

### 🔍 Monitoring: Application Insights ↔ CloudWatch

#### Azure
```bash
# Tự động tích hợp với App Service / Container Apps
# Xem metrics, logs, traces trong Azure Portal

az monitor metrics list \
  --resource-group mygroup \
  --resource-type Microsoft.App/containerApps
```

#### AWS
```bash
# Tự động tích hợp với EC2, ECS, Lambda
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=my-service

aws logs tail my-app --follow
```

**Nhận xét:**
- **CloudWatch tốt hơn**: Tính năng đủ, giao diện tốt
- **Application Insights**: Đơn giản hơn nhưng ít tính năng

---

### 🚀 Full Stack Deployment Comparison

#### Azure Container Apps (Khuyến nghị cho project này)
```
┌─────────────────────────────────────────┐
│  My App (EASY TO USE)                   │
├─────────────────────────────────────────┤
│  Container Apps (managed)               │
│  - Auto-scaling                         │
│  - Built-in monitoring                  │
│  - No VPC needed                        │
├─────────────────────────────────────────┤
│  Azure MySQL Flexible Server            │
│  Azure Cache for Redis                  │
│  Azure Blob Storage                     │
│  Azure Front Door (CDN)                 │
└─────────────────────────────────────────┘
Time to deploy: 15 minutes
Cost (test): ~$1.45/15min
Complexity: ⭐⭐ (Easy)
```

#### AWS Fargate (Power user)
```
┌─────────────────────────────────────────┐
│  My App (MORE CONTROL)                  │
├─────────────────────────────────────────┤
│  VPC                                    │
│  ├─ ECS Cluster (managed)               │
│  ├─ Fargate (containers)                │
│  ├─ ALB (load balancer)                 │
├─────────────────────────────────────────┤
│  RDS MySQL (database)                   │
│  ElastiCache (redis)                    │
│  S3 (storage)                           │
│  CloudFront (CDN)                       │
│  IAM (security)                         │
└─────────────────────────────────────────┘
Time to deploy: 30+ minutes
Cost (test): ~$2/15min
Complexity: ⭐⭐⭐⭐ (Complex)
```

---

### 💰 Chi Phí So Sánh (15 phút test)

| Service | Azure | AWS | Winner |
|---------|-------|-----|--------|
| Container Runtime | $0.40 | $0.75 | **Azure** 🏆 |
| Database | $0.50 | $0.30 | **AWS** 🏆 |
| Cache | $0.15 | $0.20 | **Azure** 🏆 |
| Storage | $0.10 | $0.10 | **Tie** |
| **TOTAL** | **~$1.15** | **~$1.35** | **Azure** 🏆 |

**Khi tính thêm setup complexity:**
- Azure: Dễ + rẻ = **Best for learning**
- AWS: Phức tạp + hơi rẻ = **Best for scale**

---

### ⚠️ CÓ CHUYÊN ĐỔI ĐƯỢC KHÔNG? (IMPORTANT!)

**Câu trả lời: KHÔNG dùng được code Azure ở AWS trực tiếp!**

Commands hoàn toàn khác nhau:

#### ❌ Điều KHÔNG THỂ copy-paste

```bash
# AZURE COMMAND (không dùng được trên AWS)
az containerapp create --name backend \
  --min-replicas 2 \
  --max-replicas 5

# AWS COMMAND (hoàn toàn khác)
aws ecs create-service --service-name backend \
  --desired-count 2 \
  --launch-type FARGATE

# ❌ SAI: az commands không tồn tại trên AWS!
# ❌ SAI: aws commands không tồn tại trên Azure!
```

---

#### 📋 Mapping: Cái Này Trên Azure → Cái Kia Trên AWS

| Cần Làm | Azure Command | AWS Command |
|---------|---------------|-------------|
| **Login** | `az login` | `aws configure` |
| **Create Resource Group** | `az group create` | `aws ec2 create-vpc` |
| **Push Docker Image** | `az acr push` | `aws ecr push` |
| **Deploy Container** | `az containerapp create` | `aws ecs create-service` |
| **Create Database** | `az mysql flexible-server create` | `aws rds create-db-instance` |
| **Create Cache** | `az redis create` | `aws elasticache create-cache-cluster` |
| **Create Storage** | `az storage account create` | `aws s3 mb` |
| **Delete All** | `az group delete` | `aws ec2 terminate-instances` (phức tạp!) |

---

#### 🔄 Conversion Guide

**Ví dụ 1: Deploy Backend**

**Azure:**
```bash
az containerapp create \
  --name ecommerce-backend \
  --min-replicas 2 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars DB_HOST=$MYSQL_HOST
```

**AWS Equivalent:**
```bash
# Bước 1: Register task definition
aws ecs register-task-definition \
  --family ecommerce-backend \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 1024 \
  --memory 2048 \
  --container-definitions '[{
    "name": "backend",
    "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/ecommerce-backend",
    "environment": [{"name": "DB_HOST", "value": "'$MYSQL_HOST'"}],
    "portMappings": [{"containerPort": 8000}]
  }]'

# Bước 2: Create service
aws ecs create-service \
  --cluster ecommerce \
  --service-name backend \
  --task-definition ecommerce-backend \
  --launch-type FARGATE \
  --desired-count 2 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

**Điểm khác:**
- ❌ Azure: 1 command
- ❌ AWS: 2+ commands + phải setup VPC, subnet, security group trước

---

**Ví dụ 2: Create Database**

**Azure:**
```bash
az mysql flexible-server create \
  --name $MYSQL_SERVER \
  --admin-password "Secure@Pwd123!Prod" \
  --sku-name Standard_B2s \
  --backup-retention 7 \
  --geo-redundant-backup Enabled
```

**AWS Equivalent:**
```bash
aws rds create-db-instance \
  --db-instance-identifier $MYSQL_SERVER \
  --db-instance-class db.t4g.small \
  --engine mysql \
  --master-username admin \
  --master-user-password "Secure@Pwd123!Prod" \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --multi-az  # for geo-redundancy
```

**Điểm khác:**
- Một số parameter tên khác (`admin-user` vs `master-username`)
- AWS cần chỉ định instance class, Azure tự handle

---

**Ví dụ 3: Create Storage**

**Azure:**
```bash
az storage account create \
  --name $STORAGE_ACCOUNT \
  --kind StorageV2 \
  --sku Standard_LRS

az storage container create \
  --name media
```

**AWS Equivalent:**
```bash
# Tạo bucket
aws s3 mb s3://$STORAGE_ACCOUNT

# Setup access control (HTTPS only)
aws s3api put-bucket-policy --bucket $STORAGE_ACCOUNT \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::'$STORAGE_ACCOUNT'/*",
      "Condition": {"Bool": {"aws:SecureTransport": "false"}}
    }]
  }'
```

**Điểm khác:**
- Azure: Cái gọi là "containers"
- AWS: Cái gọi là "buckets"
- Concept tương tự nhưng API hoàn toàn khác

---

#### 🚨 Vấn Đề Lớn: Infrastructure Setup

**Azure:**
```bash
# Chỉ cần 1 command!
az group create --name mygroup --location eastus

# Xong, đã có nơi deploy
```

**AWS:**
```bash
# Cần setup nhiều thứ trước:
# 1. Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# 2. Create Subnets
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24

# 3. Create Security Groups
aws ec2 create-security-group --group-name myapp --vpc-id vpc-xxx

# 4. Configure routing, NAT gateway, etc.
# ... (còn nhiều lắm!)
```

---

### 📝 Kết Luận

| Aspect | Azure | AWS |
|--------|-------|-----|
| **Copy-paste được?** | ❌ Không (khác commands) | ❌ Không (khác commands) |
| **Concepts giống?** | ✅ Có | ✅ Có |
| **Setup dễ không?** | ✅ Rất dễ | ❌ Phức tạp |
| **Commands tương tự?** | ❌ Không | ❌ Không |
| **Learning curve** | ⭐ 1 (Easy) | ⭐⭐⭐ (Medium) |

**Vậy nên:**
- ✅ **Dùng Azure nếu muốn deploy nhanh, dễ hiểu**
- ✅ **Dùng AWS nếu quen với AWS ecosystem**
- ⚠️ **KHÔNG thể copy code Azure sang AWS** - phải viết lại hoàn toàn!

---

### 🎓 Recommendation

| Tình Huống | Nên Dùng | Lý Do |
|-----------|----------|-------|
| **Learning & Testing** | Azure ✅ | Đơn giản, nhanh deploy, rẻ |
| **Production Startup** | **Chọn 1** | Tùy team familiar |
| **Enterprise Scale** | AWS ✅ | Ecosystem rộng, cost savings at scale |
| **Microsoft Stack** | Azure ✅ | Tích hợp .NET, Office 365, Teams |
| **Open Source** | AWS ✅ | Linux-centric, community lớn |

**Cho project này:** Azure Container Apps là **tốt nhất** vì:
- ✅ Dễ deploy (copy-paste commands)
- ✅ Rẻ (Azure for Students)
- ✅ Production-ready
- ✅ Đủ tính năng cho e-commerce

---

## 🔐 Cấu Hình Dịch Vụ Bổ Sung

### 1. Thiết Lập Custom Domain

#### Với Azure Container Apps:
```bash
# Add custom domain
az containerapp hostname add \
  --name ecommerce-frontend \
  --resource-group $RESOURCE_GROUP \
  --hostname www.yourdomain.com

# Bind certificate (managed certificate)
az containerapp hostname bind \
  --name ecommerce-frontend \
  --resource-group $RESOURCE_GROUP \
  --hostname www.yourdomain.com \
  --environment $ENVIRONMENT_NAME \
  --validation-method CNAME
```

#### Cấu hình DNS:
- Thêm CNAME record: `www` → `ecommerce-frontend.{region}.azurecontainerapps.io`
- Thêm TXT record cho validation nếu cần

### 2. Thiết Lập SSL Certificate

```bash
# Với App Service - Enable managed certificate
az webapp config ssl bind \
  --name $WEBAPP_FRONTEND \
  --resource-group $RESOURCE_GROUP \
  --certificate-thumbprint auto \
  --ssl-type SNI

# Hoặc upload custom certificate
az webapp config ssl upload \
  --name $WEBAPP_FRONTEND \
  --resource-group $RESOURCE_GROUP \
  --certificate-file /path/to/cert.pfx \
  --certificate-password "password"
```

### 3. Configure Stripe Webhooks

```bash
# Get backend URL
WEBHOOK_URL="https://$BACKEND_URL/api/payments/webhook/"

echo "Configure Stripe webhook with URL: $WEBHOOK_URL"
echo "Events to subscribe:"
echo "  - payment_intent.succeeded"
echo "  - payment_intent.payment_failed"
echo "  - charge.refunded"
```

Vào Stripe Dashboard → Developers → Webhooks → Add endpoint:
- Endpoint URL: `https://your-backend-url/api/payments/webhook/`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

### 4. Backup và Disaster Recovery

#### Backup MySQL Database:
```bash
# Enable automated backups
az mysql flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER \
  --name backup_retention_days \
  --value 30

# Manual backup
az mysql flexible-server backup create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --backup-name manual-backup-$(date +%Y%m%d)
```

#### Backup Redis:
```bash
# Enable Redis persistence
az redis patch-schedule set \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --schedule-entries '[{"dayOfWeek":"Sunday","startHourUtc":2,"maintenanceWindow":"PT5H"}]'

# Export Redis data
az redis export \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --prefix backup \
  --container $STORAGE_ACCOUNT \
  --file-format rdb
```

---

## 📊 Monitoring và Bảo Mật

### 1. Enable Application Insights

```bash
# Create Application Insights
APPINSIGHTS_NAME="ecommerce-insights"

az monitor app-insights component create \
  --app $APPINSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app $APPINSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

# Update container apps with instrumentation key
az containerapp update \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY

az containerapp update \
  --name ecommerce-frontend \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

### 2. Configure Log Analytics

```bash
# Create Log Analytics Workspace
LOG_WORKSPACE="ecommerce-logs"

az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_WORKSPACE \
  --location $LOCATION

# Link to Container Apps
az containerapp env update \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --logs-workspace-id $(az monitor log-analytics workspace show \
    --resource-group $RESOURCE_GROUP \
    --workspace-name $LOG_WORKSPACE \
    --query customerId \
    --output tsv) \
  --logs-workspace-key $(az monitor log-analytics workspace get-shared-keys \
    --resource-group $RESOURCE_GROUP \
    --workspace-name $LOG_WORKSPACE \
    --query primarySharedKey \
    --output tsv)
```

### 3. Setup Azure Key Vault cho Secrets

```bash
# Create Key Vault
KEYVAULT_NAME="ecommerce-kv-$(date +%s)"

az keyvault create \
  --name $KEYVAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization false

# Add secrets
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "django-secret-key" \
  --value "your-secret-key"

az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "stripe-secret-key" \
  --value "sk_live_your_key"

az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "db-password" \
  --value "$MYSQL_ADMIN_PASSWORD"

# Grant access to Container Apps
# (Requires managed identity setup)
```

### 4. Enable Web Application Firewall (WAF)

```bash
# Create WAF Policy
az network application-gateway waf-policy create \
  --name ecommerce-waf \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Configure rules
az network application-gateway waf-policy managed-rule rule-set add \
  --policy-name ecommerce-waf \
  --resource-group $RESOURCE_GROUP \
  --type OWASP \
  --version 3.2

# Apply to Front Door
az afd security-policy create \
  --profile-name $FRONTDOOR_NAME \
  --security-policy-name waf-policy \
  --resource-group $RESOURCE_GROUP \
  --waf-policy /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Network/applicationGatewayWebApplicationFirewallPolicies/ecommerce-waf
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Tạo file `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_RESOURCE_GROUP: ecommerce-rg
  ACR_NAME: ecommerceacr
  BACKEND_APP_NAME: ecommerce-backend
  FRONTEND_APP_NAME: ecommerce-frontend

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Login to ACR
      run: |
        az acr login --name ${{ env.ACR_NAME }}

    - name: Get ACR login server
      id: acr
      run: |
        ACR_LOGIN_SERVER=$(az acr show --name ${{ env.ACR_NAME }} --query loginServer -o tsv)
        echo "login_server=$ACR_LOGIN_SERVER" >> $GITHUB_OUTPUT

    - name: Build and push backend image
      run: |
        docker build -f backend/dockerfile.prod -t ${{ steps.acr.outputs.login_server }}/ecommerce-backend:${{ github.sha }} backend/
        docker push ${{ steps.acr.outputs.login_server }}/ecommerce-backend:${{ github.sha }}
        docker tag ${{ steps.acr.outputs.login_server }}/ecommerce-backend:${{ github.sha }} ${{ steps.acr.outputs.login_server }}/ecommerce-backend:latest
        docker push ${{ steps.acr.outputs.login_server }}/ecommerce-backend:latest

    - name: Build and push frontend image
      run: |
        docker build -f frontend/dockerfile.prod -t ${{ steps.acr.outputs.login_server }}/ecommerce-frontend:${{ github.sha }} frontend/
        docker push ${{ steps.acr.outputs.login_server }}/ecommerce-frontend:${{ github.sha }}
        docker tag ${{ steps.acr.outputs.login_server }}/ecommerce-frontend:${{ github.sha }} ${{ steps.acr.outputs.login_server }}/ecommerce-frontend:latest
        docker push ${{ steps.acr.outputs.login_server }}/ecommerce-frontend:latest

    - name: Update backend container app
      run: |
        az containerapp update \
          --name ${{ env.BACKEND_APP_NAME }} \
          --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
          --image ${{ steps.acr.outputs.login_server }}/ecommerce-backend:${{ github.sha }}

    - name: Update frontend container app
      run: |
        az containerapp update \
          --name ${{ env.FRONTEND_APP_NAME }} \
          --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
          --image ${{ steps.acr.outputs.login_server }}/ecommerce-frontend:${{ github.sha }}

    - name: Run database migrations
      run: |
        az containerapp exec \
          --name ${{ env.BACKEND_APP_NAME }} \
          --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
          --command "python manage.py migrate --noinput"

    - name: Collect static files
      run: |
        az containerapp exec \
          --name ${{ env.BACKEND_APP_NAME }} \
          --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
          --command "python manage.py collectstatic --noinput"
```

### Setup GitHub Secrets

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "github-actions-ecommerce" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# Copy output và thêm vào GitHub Secrets với tên AZURE_CREDENTIALS
```

---

## 🐛 Troubleshooting

### 1. Container không start

```bash
# Check logs
az containerapp logs show \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --follow

# Check revision status
az containerapp revision list \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --output table
```

### 2. Database connection issues

```bash
# Test MySQL connection
az mysql flexible-server connect \
  --name $MYSQL_SERVER \
  --admin-user $MYSQL_ADMIN_USER \
  --admin-password $MYSQL_ADMIN_PASSWORD

# Check firewall rules
az mysql flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER
```

### 3. Redis connection issues

```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p 6380 -a $REDIS_PASSWORD --tls ping

# Check Redis metrics
az redis show \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP
```

### 4. Static files không load

```bash
# Check blob storage
az storage blob list \
  --container-name static \
  --account-name $STORAGE_ACCOUNT \
  --output table

# Test upload
echo "test" > test.txt
az storage blob upload \
  --container-name static \
  --file test.txt \
  --name test.txt \
  --account-name $STORAGE_ACCOUNT
```

### 5. Performance issues

```bash
# Scale up container apps
az containerapp update \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --cpu 2.0 \
  --memory 4.0Gi

# Increase replicas
az containerapp update \
  --name ecommerce-backend \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 3 \
  --max-replicas 10
```

---

## 💡 Tips Tiết Kiệm Chi Phí

### Nếu Không Muốn Xóa Mà Muốn Tắt Tạm:

```bash
# Stop Container Apps (Không tính phí khi stopped)
az containerapp stop --name ecommerce-backend --resource-group $RESOURCE_GROUP
az containerapp stop --name ecommerce-frontend --resource-group $RESOURCE_GROUP

# Start lại khi cần
az containerapp start --name ecommerce-backend --resource-group $RESOURCE_GROUP
az containerapp start --name ecommerce-frontend --resource-group $RESOURCE_GROUP
```

### Scale Down để Tiết Kiệm:

```bash
# Giảm resources
az containerapp update --name ecommerce-backend --resource-group $RESOURCE_GROUP \
  --min-replicas 0 --max-replicas 1 --cpu 0.25 --memory 0.5Gi

# Set to 0 replicas
az containerapp update --name ecommerce-backend --resource-group $RESOURCE_GROUP \
  --min-replicas 0
```

### Xóa Các Dịch Vụ Tốn Tiền Nhất:

```bash
# Front Door (tốn tiền nhất - $35/tháng)
az afd profile delete --profile-name ecommerce-fd --resource-group $RESOURCE_GROUP -y

# Key Vault (optional - $0.6/tháng)
az keyvault delete --name ecommerce-kv --resource-group $RESOURCE_GROUP -y
```

---

## 📊 Kiểm Tra Chi Phí Trên Azure

```bash
# Xem cost estimates
az cost management query \
  --definition '{"type":"Usage","timeframe":"MonthToDate","granularity":"Daily"}' \
  --scope /subscriptions/{subscription-id}

# Hoặc dùng Azure Portal:
# Home → Cost Management + Billing → Cost analysis
```

---

## 💰 Chi Phí Ước Tính

### Phương pháp 1: Container Apps (Khuyến nghị)
- **Container Apps**: ~$50-100/tháng (2 apps, auto-scaling)
- **Azure Database for MySQL**: ~$50-80/tháng (Basic tier)
- **Azure Cache for Redis**: ~$15-30/tháng (Basic C0)
- **Azure Blob Storage**: ~$5-20/tháng (depends on usage)
- **Azure Front Door**: ~$35/tháng + data transfer
- **Azure Container Registry**: ~$5/tháng (Basic)
- **Application Insights**: ~$10-30/tháng

**Tổng**: ~$170-315/tháng

### Phương pháp 2: App Service
- **App Service Plan (B2)**: ~$70/tháng
- Các dịch vụ khác tương tự

**Tổng**: ~$185-330/tháng

### Phương pháp 3: AKS
- **AKS Cluster**: ~$75/tháng (2 nodes Standard_D2s_v3)
- **Load Balancer**: ~$20/tháng
- Các dịch vụ khác tương tự

**Tổng**: ~$210-370/tháng

---

## 📝 Checklist Sau Khi Deploy

- [ ] Kiểm tra frontend access: `https://your-frontend-url`
- [ ] Kiểm tra backend API: `https://your-backend-url/api/`
- [ ] Test đăng nhập/đăng ký user
- [ ] Test thêm sản phẩm vào cart
- [ ] Test thanh toán với Stripe (test mode)
- [ ] Kiểm tra upload ảnh
- [ ] Setup domain và SSL certificate
- [ ] Configure Stripe webhooks
- [ ] Enable monitoring và alerts
- [ ] Setup automated backups
- [ ] Configure auto-scaling rules
- [ ] Review security settings
- [ ] Setup WAF rules
- [ ] Test disaster recovery
- [ ] Document environment variables
- [ ] Setup CI/CD pipeline

---

## 🎯 Best Practices

1. **Security**
   - Luôn sử dụng HTTPS
   - Enable WAF
   - Regular security updates
   - Use managed identities
   - Store secrets in Key Vault

2. **Performance**
   - Enable CDN
   - Configure caching properly
   - Use auto-scaling
   - Optimize database queries
   - Monitor performance metrics

3. **Reliability**
   - Setup automated backups
   - Configure health checks
   - Use multiple replicas
   - Implement retry logic
   - Plan for disaster recovery

4. **Cost Optimization**
   - Right-size resources
   - Use reserved instances
   - Enable auto-scaling
   - Monitor unused resources
   - Use Azure Cost Management

---

## 📚 Tài Liệu Tham Khảo

- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure App Service Documentation](https://learn.microsoft.com/azure/app-service/)
- [Azure Kubernetes Service Documentation](https://learn.microsoft.com/azure/aks/)
- [Django on Azure](https://learn.microsoft.com/azure/developer/python/tutorial-deploy-python-web-app-azure-01)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Stripe Documentation](https://stripe.com/docs)

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Container logs
2. Application Insights
3. Azure Portal health checks
4. Database connection strings
5. Environment variables

Hoặc liên hệ Azure Support: https://azure.microsoft.com/support/

---

