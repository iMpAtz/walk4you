## Walk4You - Multivendor E-commerce Platform

**Tech Stack:** Next.js 15 (Frontend) + FastAPI (Backend) + MongoDB (Database) + YOLOv8 (AI Detection)

### โครงสร้างโปรเจค
```
walk4you/
├─ server/                              # FastAPI Backend (Python)
│  └─ app/
│     └─ main.py                        # API endpoints, MongoDB queries
├─ src/
│  ├─ app/                              # Next.js App Router (Frontend)
│  │  ├─ page.tsx                       # หน้าแรก
│  │  ├─ layout.tsx                     # Root layout
│  │  ├─ login/                         # หน้า Login
│  │  ├─ register/                      # หน้า Register
│  │  ├─ products/                      # รายละเอียดสินค้า
│  │  ├─ cart/                          # ตะกร้าสินค้า
│  │  ├─ checkout/                      # ชำระเงิน
│  │  ├─ my-orders/                     # ออเดอร์ของผู้ซื้อ
│  │  ├─ my-reports/                    # รายงานที่ส่งโดยผู้ใช้
│  │  ├─ profile/                       # โปรไฟล์ผู้ใช้
│  │  ├─ stores/                        # หน้าร้านค้า
│  │  ├─ search/                        # ค้นหาสินค้า
│  │  ├─ store-management/              # จัดการร้านค้า (Seller)
│  │  │  ├─ products/                   # จัดการสินค้า + YOLOv8 Detection
│  │  │  └─ orders/                     # จัดการออเดอร์
│  │  └─ admin/                         # Admin Dashboard
│  └─ components/                       # Reusable Components
│     ├─ TopBar.tsx                     # Navigation bar
│     ├─ DetectionAlertModal.tsx        # AI Detection Alert
│     ├─ OrderReportModal.tsx           # Report modal
│     ├─ ProductFormModal.tsx           # Add/Edit Product
│     ├─ CartDropdown.tsx               # Cart dropdown
│     ├─ NotificationBell.tsx           # Notifications
│     └─ ... (20+ components)
├─ models/
│  └─ best.pt                           # YOLOv8 trained model
├─ package.json
├─ tsconfig.json
└─ next.config.js
```

### เตรียมเครื่องมือ
- Node.js LTS (แนะนำ 20.x)
- Python 3.10+
- MongoDB (เช่น Atlas)

### ตั้งค่า Environment
สร้างไฟล์ `.env` ที่รูทโปรเจค `walk4you`:
```
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority&appName=<name>"
```
ตัวเลือก: ฝั่ง Frontend กำหนด base URL ของ API
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

#### Cloudinary
เพิ่มค่าต่อไปนี้ลงในไฟล์ `.env` (สร้างบัญชีที่ Cloudinary แล้วคัดลอกจาก Dashboard):
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
# ถ้ามี unsigned upload preset ที่ตั้งไว้ใน Cloudinary (ตัวเลือก)
CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

การอัปโหลดแบบ “signed upload” ไม่จำเป็นต้องใช้ `CLOUDINARY_UPLOAD_PRESET` ก็ได้ (ปลอดภัยกว่าและยืดหยุ่นกว่า) โดยฝั่งเซิร์ฟเวอร์จะสร้าง `signature` และ `timestamp` ให้ใช้อัปโหลดจากฝั่ง client ตรงไปยัง Cloudinary


### ติดตั้ง Dependencies
```
npm install
npm i -D prisma
npm i @prisma/client
npm install lucide-react
```


---

### 3. ติดตั้ง Backend (FastAPI)

```bash
cd server

# 1) สร้าง virtual environment
python -m venv .venv

# 2) เปิดใช้งาน venv (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# 3) อัปเกรด pip
python -m pip install --upgrade pip

# 4) ติดตั้ง dependencies
python -m pip install fastapi "uvicorn[standard]" motor python-dotenv pydantic email-validator cloudinary python-multipart ultralytics pillow httpx
```

**Dependencies หลัก:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `motor` - Async MongoDB driver
- `cloudinary` - Image storage
- `ultralytics` - YOLOv8 object detection
- `pillow` - Image processing
- `httpx` - HTTP client

---

### 4. รัน Backend Server

```bash
# รันด้วย Python จาก venv (แนะนำ)
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**ทดสอบ:**
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

**คำสั่งตรวจสอบ:**
```bash
# ตรวจสอบ Python path
python -c "import sys; print(sys.executable)"

# ตรวจสอบ dependencies
python -c "import uvicorn, cloudinary, ultralytics; print('✓ All deps installed')"
```

---

## ⚠️ ปัญหาที่พบบ่อย

### Backend (Python/FastAPI)

**1. ModuleNotFoundError: cloudinary / ultralytics**
```bash
# ต้องเปิดใช้ venv ก่อนรัน
.\.venv\Scripts\Activate.ps1
python -m pip install cloudinary ultralytics pillow httpx
```

**2. Cloudinary credentials not configured**
- ตรวจสอบว่าชื่อตัวแปรใน `.env` ถูกต้อง:
  - `CLOUDINARY_API_SECRET` (ต้องมี **T** ท้าย, ไม่ใช่ `CLOUDINARY_API_SECRE`)

**3. YOLOv8 model not found**
```bash
# วาง model ไว้ที่
models/best.pt

# หรือเปลี่ยน path ใน .env
YOLO_MODEL_PATH=path/to/your/model.pt
```

**4. MongoDB connection failed**
- ตรวจสอบ `MONGODB_URI` ใน `.env`
- ตรวจสอบ IP Whitelist ใน MongoDB Atlas
- ทดสอบ: `curl http://localhost:8000/health`

**5. uvicorn ใช้ Python global แทน venv**
```bash
# ใช้ full path ของ Python ใน venv
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

**6. API calls failed (CORS)**
- ตรวจสอบ `NEXT_PUBLIC_API_BASE` ใน `.env`
- ตรวจสอบ `ALLOWED_ORIGINS` ใน Backend `.env`

**7. Turbopack issues**
```bash
# ปิด Turbopack
npm run dev -- --no-turbopack
```

---

## 📚 API Endpoints

### Authentication
- `POST /auth/register` - ลงทะเบียนผู้ใช้ใหม่
- `POST /auth/login` - เข้าสู่ระบบ
- `POST /auth/refresh` - Refresh token
- `POST /auth/send-otp` - ส่ง OTP
- `POST /auth/verify-otp` - ยืนยัน OTP

### Users
- `GET /users/me` - ข้อมูลผู้ใช้ปัจจุบัน
- `PUT /users/change-password` - เปลี่ยนรหัสผ่าน
- `PUT /users/address` - อัปเดตที่อยู่
- `POST /users/me/avatar` - อัปโหลด Avatar

### Products
- `GET /products/search` - ค้นหาสินค้า
- `GET /products/featured` - สินค้าแนะนำ
- `GET /products/{id}` - รายละเอียดสินค้า
- `POST /products` - เพิ่มสินค้า (+ YOLOv8 Detection)
- `PUT /products/{id}` - แก้ไขสินค้า (+ YOLOv8 Detection)
- `DELETE /products/{id}` - ลบสินค้า
- `POST /products/check-illegal` - ทดสอบ AI Detection

### Orders
- `POST /orders` - สร้างออเดอร์
- `GET /orders/my` - ออเดอร์ของผู้ซื้อ
- `GET /orders/my-store` - ออเดอร์ของร้านค้า
- `PUT /orders/{id}/status` - อัปเดตสถานะ
- `PUT /orders/{id}/shipping` - อัปเดตข้อมูลจัดส่ง
- `POST /orders/upload-slip` - อัปโหลดหลักฐานการโอน

### Cart
- `GET /cart` - ดูตะกร้า
- `POST /cart/items` - เพิ่มสินค้าในตะกร้า
- `PUT /cart/items/{id}` - แก้ไขจำนวน
- `DELETE /cart/items/{id}` - ลบสินค้า

### Stores
- `GET /stores/my-store` - ข้อมูลร้านของตัวเอง
- `POST /stores/my-store` - สร้างร้านค้า
- `PUT /stores/my-store` - แก้ไขข้อมูลร้าน
- `PUT /stores/{id}/qr` - อัปโหลด QR Code
- `PUT /stores/{id}/logo` - อัปโหลด Logo

### Reports
- `POST /reports` - ส่งรายงาน
- `GET /reports/my` - รายงานของตัวเอง
- `GET /reports` - รายงานทั้งหมด (Admin)
- `PUT /reports/{id}/status` - อัปเดตสถานะรายงาน (Admin)

### Admin
- `GET /admin/users` - รายชื่อผู้ใช้ทั้งหมด
- `GET /admin/stores` - รายชื่อร้านค้าทั้งหมด
- `PUT /admin/users/{id}/status` - ระงับ/ปลดบล็อกผู้ใช้
- `PUT /admin/stores/{id}/status` - ระงับ/อนุมัติร้านค้า
- `PUT /admin/users/{id}` - แก้ไขข้อมูลผู้ใช้

### Notifications
- `GET /notifications` - ดูการแจ้งเตือน
- `PUT /notifications/{id}/read` - อ่านแล้ว
- `GET /notifications/unread-count` - จำนวนที่ยังไม่อ่าน

---

## 🤖 YOLOv8 Object Detection

### การทำงาน
1. เมื่อ Seller อัปโหลดรูปสินค้า (Create/Update Product)
2. Backend ส่งรูปไปยัง YOLOv8 model (`models/best.pt`)
3. ถ้าตรวจพบสินค้าผิดกฎหมาย (confidence > 0.8):
   - Backend ส่ง `detected_items` กลับใน response
   - Frontend แสดง **DetectionAlertModal** แจ้งเตือน
   - แสดงชื่อสินค้าที่ตรวจพบและระดับความมั่นใจ
4. Seller สามารถเลือก:
   - **เปลี่ยนรูปใหม่** - อัปโหลดรูปใหม่
   - **ปิด** - ยกเลิกการเพิ่ม/แก้ไขสินค้า

### ตั้งค่า YOLOv8
```bash
# วาง YOLOv8 model ไว้ที่
models/best.pt

# ตั้งค่าใน .env
YOLO_MODEL_PATH=models/best.pt
YOLO_CONFIDENCE_THRESHOLD=0.6
YOLO_ENABLED=true
```

### ทดสอบ Detection
```bash
curl -X POST http://localhost:8000/products/check-illegal \
  -H "Authorization: Bearer <token>" \
  -F "image_url=https://example.com/image.jpg"
```

---

## ⚠️ ปัญหาที่พบบ่อย

### Backend (Python/FastAPI)

**1. ModuleNotFoundError: cloudinary / ultralytics**
```bash
# ต้องเปิดใช้ venv ก่อนรัน
.\.venv\Scripts\Activate.ps1
python -m pip install cloudinary ultralytics pillow httpx
```

**2. Cloudinary credentials not configured**
- ตรวจสอบว่าชื่อตัวแปรใน `.env` ถูกต้อง:
  - `CLOUDINARY_API_SECRET` (ต้องมี **T** ท้าย, ไม่ใช่ `CLOUDINARY_API_SECRE`)

**3. YOLOv8 model not found**
```bash
# วาง model ไว้ที่
models/best.pt

# หรือเปลี่ยน path ใน .env
YOLO_MODEL_PATH=path/to/your/model.pt
```

**4. MongoDB connection failed**
- ตรวจสอบ `MONGODB_URI` ใน `.env`
- ตรวจสอบ IP Whitelist ใน MongoDB Atlas
- ทดสอบ: `curl http://localhost:8000/health`

**5. uvicorn ใช้ Python global แทน venv**
```bash
# ใช้ full path ของ Python ใน venv
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

**6. API calls failed (CORS)**
- ตรวจสอบ `NEXT_PUBLIC_API_BASE` ใน `.env`
- ตรวจสอบ `ALLOWED_ORIGINS` ใน Backend `.env`

**7. Turbopack issues**
```bash
# ปิด Turbopack
npm run dev -- --no-turbopack
```

---

## 🗂️ Database Schema

**MongoDB Collections:**
- `User` - ผู้ใช้ (CUSTOMER, SELLER, ADMIN)
- `Store` - ร้านค้า
- `Product` - สินค้า
- `Order` - ออเดอร์หลัก
- `SubOrder` - ออเดอร์ย่อย (แยกตามร้าน)
- `Cart` - ตะกร้าสินค้า
- `CartItem` - รายการในตะกร้า
- `Review` - รีวิวสินค้า
- `Notification` - การแจ้งเตือน
- `Report` - รายงานปัญหา
- `AdminAction` - บันทึกการกระทำของ Admin
- `Banner` - แบนเนอร์โฆษณา

**หมายเหตุ:** โปรเจคนี้ใช้ **FastAPI + Motor** เป็นตัวจัดการ MongoDB โดยตรง (ไม่ใช้ Prisma)

---

## 📦 NPM Scripts

```json
{
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",
  "start": "next start",
  "lint": "eslint"
}
```

---

## 🚀 Deployment

### Frontend (Vercel)
1. Push โค้ดไปยัง GitHub
2. เชื่อมต่อ repository กับ Vercel
3. ตั้ง Environment Variables:
   - `NEXT_PUBLIC_API_BASE=https://your-backend-url.com`

### Backend (Google Cloud Run / Railway)
1. ตั้งค่า Environment Variables ทั้งหมด (ดูใน `.env`)
2. Deploy ด้วย Dockerfile หรือ `uvicorn`
3. เปิด port 8000

---
