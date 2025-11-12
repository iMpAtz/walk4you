# Walk4You - Docker Setup Guide

## 📦 โครงสร้าง Docker

โปรเจคนี้แยก Docker Image เป็น 2 ส่วน:

1. **Frontend** - Next.js (Port 3000)
2. **Backend** - FastAPI (Port 8000)

## 📁 โครงสร้างไฟล์

```
walk4you/
├── Dockerfile              # Frontend Dockerfile
├── .dockerignore          # Frontend ignore files
├── docker-compose.yml     # Orchestrate both services
├── next.config.js         # Enable standalone output
├── package.json
├── src/
├── public/
└── api/                   # Backend directory
    ├── Dockerfile         # Backend Dockerfile
    ├── .dockerignore      # Backend ignore files
    ├── requirements.txt
    ├── app/
    └── models/
```

## 🚀 วิธีใช้งาน

### 1. Build และ Run ทั้ง Frontend และ Backend

```bash
# Build และ start ทั้งสอง services
docker-compose up -d

# Build ใหม่และ start
docker-compose up -d --build

# ดู logs
docker-compose logs -f

# ดู logs เฉพาะ service
docker-compose logs -f frontend
docker-compose logs -f api

# Stop services
docker-compose down

# Stop และลบ volumes
docker-compose down -v
```

### 2. Build แยกส่วน

#### Frontend Only
```bash
# Build frontend image
docker build -t walk4you-frontend:latest .

# Run frontend container
docker run -d \
  --name walk4you-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE=http://localhost:8000 \
  walk4you-frontend:latest
```

#### Backend Only
```bash
# Build backend image
cd api
docker build -t walk4you-api:latest .

# Run backend container
docker run -d \
  --name walk4you-api \
  -p 8000:8000 \
  --env-file .env \
  -v $(pwd)/models:/app/models:ro \
  walk4you-api:latest
```

## 🔧 Configuration

### Frontend Environment Variables

สร้างไฟล์ `.env.local` (ไม่ต้องใส่ใน Docker):
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### Backend Environment Variables

ตรวจสอบว่ามีไฟล์ `api/.env`:
```env
MONGODB_URI=...
MONGODB_DB=walk4you
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
YOLO_MODEL_PATH=models/IllegalItemModel.pt
YOLO_CONFIDENCE_THRESHOLD=0.6
YOLO_ENABLED=true
```

### Docker Compose Environment

สร้างไฟล์ `.env` ในโฟลเดอร์หลัก (สำหรับ docker-compose):
```env
MONGODB_URI=...
MONGODB_DB=walk4you
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
YOLO_MODEL_PATH=models/IllegalItemModel.pt
YOLO_CONFIDENCE_THRESHOLD=0.6
YOLO_ENABLED=true
```

## 🏗️ Build Details

### Frontend (Next.js)
- **Base Image**: node:20-alpine
- **Build Type**: Multi-stage (deps → builder → runner)
- **Output**: Standalone
- **Port**: 3000
- **Size**: ~200MB (optimized)

### Backend (FastAPI)
- **Base Image**: python:3.11-slim
- **Dependencies**: YOLOv8, FastAPI, Motor
- **Port**: 8000
- **Size**: ~2GB (with YOLOv8)

## 🌐 Network

Services communicate through `walk4you-network`:
- Frontend → Backend: `http://api:8000`
- External → Frontend: `http://localhost:3000`
- External → Backend: `http://localhost:8000`

## 🏥 Health Checks

Both services have health checks:
- **Frontend**: Checks every 30s
- **Backend**: Checks every 30s
- **Start Period**: 40s
- **Retries**: 3 times

## 🔍 Monitoring & Debug

```bash
# Check container status
docker-compose ps

# View resource usage
docker stats

# Inspect a service
docker inspect walk4you-frontend
docker inspect walk4you-api

# Execute commands in container
docker exec -it walk4you-frontend sh
docker exec -it walk4you-api bash

# View container logs
docker logs walk4you-frontend
docker logs walk4you-api --tail 100 -f
```

## 🚀 Production Deployment

### Push to Docker Registry

```bash
# Tag images
docker tag walk4you-frontend:latest yourusername/walk4you-frontend:latest
docker tag walk4you-api:latest yourusername/walk4you-api:latest

# Push to Docker Hub
docker push yourusername/walk4you-frontend:latest
docker push yourusername/walk4you-api:latest
```

### Pull and Deploy

```bash
# Pull images
docker pull yourusername/walk4you-frontend:latest
docker pull yourusername/walk4you-api:latest

# Update docker-compose.yml to use registry images
# Then run
docker-compose up -d
```

## 📊 Volumes

- **Backend Models**: `./api/models` → `/app/models` (read-only)
- **Backend Logs**: `./api/logs` → `/app/logs`

## 🔒 Security

- Frontend runs as non-root user (nextjs:nodejs)
- Backend uses minimal base image (python-slim)
- Sensitive data in environment variables
- No source code in production images (standalone build)

## 🛠️ Troubleshooting

### Frontend ไม่เชื่อมต่อ Backend
```bash
# ตรวจสอบ network
docker network inspect walk4you_walk4you-network

# ตรวจสอบว่า API พร้อมใช้งาน
docker exec walk4you-frontend wget -O- http://api:8000/health
```

### Backend โหลดโมเดลไม่ได้
```bash
# ตรวจสอบว่า models directory mount ถูกต้อง
docker exec walk4you-api ls -la /app/models

# ตรวจสอบ logs
docker logs walk4you-api | grep YOLO
```

### Rebuild ทั้งหมด
```bash
# Stop และลบทุกอย่าง
docker-compose down
docker system prune -a

# Build ใหม่
docker-compose up -d --build
```

## 📝 Notes

1. **Frontend Standalone Mode**: Next.js build เป็น standalone เพื่อลดขนาด image
2. **API Dependencies**: Backend ต้องรอ MongoDB connection ก่อนเริ่มทำงาน
3. **Development vs Production**: ใช้ docker-compose เพื่อสะดวกในการจัดการ
4. **YOLO Model**: ต้องวางไฟล์โมเดลใน `api/models/` ก่อน build

## 🎯 Quick Commands

```bash
# Start everything
docker-compose up -d

# View all logs
docker-compose logs -f

# Restart a service
docker-compose restart frontend
docker-compose restart api

# Stop everything
docker-compose down

# Clean up
docker-compose down -v
docker system prune -a
```
