## Walk4You - Multivendor E-commerce (Next.js + FastAPI + Prisma/MongoDB)

### โครงสร้าง
```
walk4you/
├─ api/                       # FastAPI backend
│  └─ app/
│     └─ main.py
├─ prisma/
│  └─ schema.prisma           # Prisma + MongoDB schema
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ page.tsx
│  │  └─ layout.tsx
│  └─ components/
│     └─ ApiProbe.tsx
├─ package.json               # Next.js scripts
├─ tsconfig.json
├─ next.config.ts
└─ .env                        # DATABASE_URL (MongoDB)
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

### ติดตั้ง Dependencies
```
npm install
npm i -D prisma
npm i @prisma/client
```

### ตั้งค่า Prisma (MongoDB)
```
npx prisma format
npx prisma db push
npx prisma generate
# (ตัวเลือก)
npx prisma studio
```

### รัน Backend (FastAPI)
```
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install fastapi "uvicorn[standard]" motor python-dotenv pydantic-settings python-multipart
uvicorn app.main:app --reload --port 8000
```
ทดสอบ: http://localhost:8000/health และ http://localhost:8000/docs

### รัน Frontend (Next.js)
```
npm run dev
# ถ้าเจอปัญหา Turbopack
npm run dev:no-turbo
```
เปิด http://localhost:3000 แล้วดู Console จะเห็น log จาก `ApiProbe` ที่เรียก `/health` ของ FastAPI

### ปัญหาที่พบบ่อย
- 404 หน้า Home: อย่าให้มีโฟลเดอร์ Python ชื่อ `app` ในรูท Next ให้ย้ายไป `api/`
- PowerShell ใช้ `;` แทน `&&` เมื่อต่อคำสั่งหลายตัว
- Prisma P1012 (Decimal ไม่รองรับ MongoDB): สคีมาใช้ Int หน่วยเซ็นต์แล้ว
- หาก `npx prisma generate` error: ติดตั้ง `prisma` และ `@prisma/client` แล้วลองใหม่

### สคริปต์ใน package.json
```
"scripts": {
  "dev": "next dev --turbopack",
  "dev:no-turbo": "next dev --no-turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "prisma:push": "prisma db push",
  "prisma:gen": "prisma generate",
  "prisma:studio": "prisma studio"
}
```

### หมายเหตุสคีมา
- ราคา/จำนวนเงินเก็บเป็น Int หน่วยเซ็นต์
- ความสัมพันธ์ Shipment ↔ SubOrder เป็น one-to-one โดย FK อยู่ `Shipment.subOrderId` (@unique)
- ความสัมพันธ์ AdminAction มีฝั่งย้อนกลับใน `User` และ `Store`

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
