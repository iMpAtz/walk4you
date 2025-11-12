# YOLOv8 Model Directory

## วิธีการใช้งาน

1. วางไฟล์โมเดล YOLOv8 ของคุณ (ไฟล์ `.pt`) ในโฟลเดอร์นี้
2. เปลี่ยนชื่อไฟล์เป็น `best.pt` หรือแก้ไข `YOLO_MODEL_PATH` ใน `.env`

## ตัวอย่าง:
```
api/models/best.pt
```

## การตั้งค่าใน .env:
```
YOLO_MODEL_PATH=models/best.pt
YOLO_CONFIDENCE_THRESHOLD=0.6
YOLO_ENABLED=true
```

## หมายเหตุ:
- `YOLO_CONFIDENCE_THRESHOLD`: ค่า confidence ขั้นต่ำสำหรับการตรวจจับ (0.0-1.0)
- `YOLO_ENABLED`: เปิด/ปิดการตรวจจับด้วย YOLO (true/false)
