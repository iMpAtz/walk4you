# Walk4You API - Docker Setup

## 📦 ไฟล์ที่สร้างขึ้น

1. **requirements.txt** - รายการ Python packages
2. **Dockerfile** - สำหรับสร้าง Docker image
3. **.dockerignore** - ไฟล์ที่ไม่ต้องการใน Docker image
4. **docker-compose.yml** - สำหรับรัน API ด้วย Docker Compose

## 🚀 วิธีใช้งาน

### 1. Build Docker Image

```bash
cd api
docker build -t walk4you-api:latest .
```

### 2. Run with Docker Compose

```bash
# Start the API
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the API
docker-compose down
```

### 3. Run with Docker directly

```bash
docker run -d \
  --name walk4you-api \
  -p 8000:8000 \
  --env-file .env \
  -v $(pwd)/models:/app/models:ro \
  walk4you-api:latest
```

## 📋 Requirements

### Python Packages:
- **fastapi** (0.115.0) - Web framework
- **uvicorn** (0.31.0) - ASGI server
- **motor** (3.6.0) - Async MongoDB driver
- **pymongo** (4.10.1) - MongoDB driver
- **pydantic** (2.9.2) - Data validation
- **python-dotenv** (1.0.1) - Environment variables
- **httpx** (0.28.1) - HTTP client
- **ultralytics** (8.3.30) - YOLOv8
- **Pillow** (11.0.0) - Image processing

### System Dependencies (in Dockerfile):
- libgl1-mesa-glx
- libglib2.0-0
- libsm6
- libxext6
- libxrender-dev
- libgomp1

## 🔧 Configuration

ตรวจสอบว่ามีไฟล์ `.env` ในโฟลเดอร์ `api/` พร้อม environment variables ทั้งหมด:

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

## 📁 โครงสร้างไฟล์

```
api/
├── app/
│   ├── __init__.py
│   └── main.py
├── models/
│   └── IllegalItemModel.pt
├── .env
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
└── README_DOCKER.md
```

## 🏥 Health Check

API มี health check endpoint ที่:
- URL: http://localhost:8000/health
- ตรวจสอบทุก 30 วินาที
- Timeout 10 วินาที
- Retry 3 ครั้ง

## 🔍 การ Debug

```bash
# เข้าไปใน container
docker exec -it walk4you-api bash

# ดู logs แบบ real-time
docker-compose logs -f api

# ตรวจสอบ container status
docker-compose ps

# Restart container
docker-compose restart api
```

## 📝 หมายเหตุ

1. โมเดล YOLOv8 (`models/IllegalItemModel.pt`) จะถูก mount เป็น read-only volume
2. Logs จะถูกเก็บใน `logs/` directory
3. Container จะ restart อัตโนมัติถ้าเกิด error (restart: unless-stopped)
4. ใช้ Python 3.11-slim เพื่อลดขนาด image

## 🐳 Docker Hub (Optional)

หากต้องการ push ไปยัง Docker Hub:

```bash
# Tag image
docker tag walk4you-api:latest yourusername/walk4you-api:latest

# Push to Docker Hub
docker push yourusername/walk4you-api:latest

# Pull and run from Docker Hub
docker pull yourusername/walk4you-api:latest
docker run -d -p 8000:8000 --env-file .env yourusername/walk4you-api:latest
```
