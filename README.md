# LINE File Chatbot

LINE Chatbot สำหรับรับและจัดเก็บไฟล์ทุกประเภท พร้อมระบบ OCR และหน้าเว็บค้นหา

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: Google Drive API
- **OCR**: Tesseract.js (รองรับภาษาไทย/อังกฤษ, รันบน server ไม่ต้อง API key)
- **LINE**: LINE Messaging API

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ให้ครบทุก field:

| Variable | คำอธิบาย |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `LINE_CHANNEL_ACCESS_TOKEN` | จาก LINE Developers Console |
| `LINE_CHANNEL_SECRET` | จาก LINE Developers Console |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account Email |
| `GOOGLE_PRIVATE_KEY` | Private Key ของ Service Account |
| `GOOGLE_DRIVE_FOLDER_ID` | ID ของ Google Drive folder สำหรับเก็บไฟล์ |
| `GOOGLE_APPLICATION_CREDENTIALS` | path ไปยัง google-credentials.json |
| `PORT` | Port ที่ server รัน (default: 3000) |
| `BASE_URL` | URL สาธารณะของ server |

### 3. ตั้งค่า Google Service Account

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่ (หรือใช้ของเดิม)
3. เปิดใช้งาน APIs:
   - **Google Drive API**
   - **Cloud Vision API**
4. สร้าง Service Account และดาวน์โหลด credentials JSON
   - บันทึกเป็น `google-credentials.json` ในโฟลเดอร์โปรเจกต์
5. สร้างโฟลเดอร์ใน Google Drive แล้ว Share ให้ Service Account Email มีสิทธิ์ **Editor**
6. คัดลอก Folder ID จาก URL ของโฟลเดอร์ → ใส่ใน `GOOGLE_DRIVE_FOLDER_ID`

### 4. ตั้งค่า LINE Messaging API

1. ไปที่ [LINE Developers Console](https://developers.line.biz)
2. สร้าง Provider และ Messaging API Channel
3. คัดลอก **Channel Access Token** และ **Channel Secret** → ใส่ใน `.env`
4. ใส่ Webhook URL: `https://your-domain.com/webhook`
5. เปิด **Use webhook** และปิด **Auto-reply messages**

### 5. ตั้งค่า Database

```bash
# สร้าง database และ migrate
npx prisma migrate dev --name init

# หรือถ้ารัน migration SQL เอง
psql -U postgres -d line_chatbot -f prisma/migrations/init/migration.sql
```

### 6. รัน Server

```bash
# Development
npm run dev

# Production
npm start
```

## โครงสร้างโปรเจกต์

```
chatbot/
├── src/
│   ├── app.js                  # Entry point, Express setup
│   ├── routes/
│   │   ├── webhook.js          # LINE webhook handler
│   │   └── api.js              # REST API สำหรับ web app
│   └── services/
│       ├── db.js               # Prisma database operations
│       ├── drive.js            # Google Drive upload/stream
│       ├── ocr.js              # Google Cloud Vision OCR
│       └── line.js             # LINE SDK helper
├── web/public/
│   ├── index.html              # หน้าเว็บค้นหาไฟล์
│   ├── style.css
│   └── app.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
└── package.json
```

## API Endpoints

| Method | Path | คำอธิบาย |
|---|---|---|
| POST | `/webhook` | LINE Webhook |
| GET | `/api/files` | ค้นหาไฟล์ (query params: `fileName`, `fileType`, `ocrText`, `lineUserId`, `dateFrom`, `dateTo`, `page`, `limit`) |
| GET | `/api/files/:id` | ดูข้อมูลไฟล์ชิ้นเดียว |
| GET | `/api/files/:id/preview` | Proxy ไฟล์สำหรับพรีวิว |
| GET | `/api/files/:id/download` | ดาวน์โหลดไฟล์ |

## Deploy บน Railway / Render / VPS

1. ตั้งค่า Environment Variables บน hosting platform
2. ต้องใช้ **HTTPS** เพื่อรับ Webhook จาก LINE
3. ใส่ URL ที่ได้เป็น Webhook URL ใน LINE Developers Console
