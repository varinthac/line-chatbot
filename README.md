# LINE File Archive

LINE Chatbot สำหรับรับและจัดเก็บไฟล์ทุกประเภท พร้อมระบบ OCR และหน้าเว็บค้นหา/จัดการไฟล์

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM (Neon)
- **Storage**: Supabase Storage
- **OCR**: Tesseract.js (รองรับภาษาไทย/อังกฤษ รันบน server ไม่ต้อง API key)
- **LINE**: LINE Messaging API (รองรับหลาย Channel)
- **Auth**: express-session (username/password, session 30 วัน)
- **Deploy**: Render (ป้องกัน cold start ด้วย cron-job.org ping ทุก 10 นาที)

## Features

- รับไฟล์จาก LINE (รูปภาพ, วิดีโอ, เสียง, เอกสาร) และอัปโหลดไปยัง Supabase Storage
- OCR อัตโนมัติสำหรับไฟล์รูปภาพ
- รองรับหลาย LINE Bot (Multi-channel) พร้อมระบุแหล่งที่มาของไฟล์
- หน้าเว็บค้นหา/พรีวิว/ดาวน์โหลดไฟล์ พร้อมระบบ Login
- บันทึก Done status และหมายเหตุต่อไฟล์ได้ inline
- **Responsive Design** — รองรับการใช้งานบนมือถือและ tablet (ตารางเลื่อนแนวนอนได้ โดย filter ไม่เลื่อนตาม)

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
npx prisma generate
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env`:

| Variable | คำอธิบาย |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `CHANNELS` | JSON array ของ LINE channels (ดูตัวอย่างด้านล่าง) |
| `SUPABASE_URL` | Supabase project URL (เช่น `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Supabase service role secret key |
| `ADMIN_USERNAME` | ชื่อผู้ใช้สำหรับ login หน้าเว็บ |
| `ADMIN_PASSWORD` | รหัสผ่านสำหรับ login หน้าเว็บ |
| `SESSION_SECRET` | Secret สำหรับเข้ารหัส session cookie |
| `PORT` | Port ที่ server รัน (default: 3000) |

#### ตัวอย่าง CHANNELS

```json
[
  {
    "name": "BotName",
    "destination": "Uxxxxxxxxxx",
    "secret": "channel_secret_32chars",
    "token": "channel_access_token"
  }
]
```

> **หมายเหตุ**: `destination` คือ Bot's User ID (ไม่ใช่ developer's user ID)  
> หาได้จาก webhook log หรือเรียก `GET https://api.line.me/v2/bot/info` ด้วย channel access token

### 3. ตั้งค่า Supabase Storage

1. สร้าง project ที่ [supabase.com](https://supabase.com)
2. ไปที่ **Storage** → สร้าง bucket ชื่อ `files` (private)
3. คัดลอก **Project URL** และ **Secret key** จาก Project Settings → API Keys

### 4. ตั้งค่า LINE Messaging API

1. ไปที่ [LINE Developers Console](https://developers.line.biz)
2. สร้าง Provider และ Messaging API Channel
3. คัดลอก **Channel Access Token** และ **Channel Secret** → ใส่ใน `CHANNELS`
4. ใส่ Webhook URL: `https://your-domain.com/webhook`
5. เปิด **Use webhook** และปิด **Auto-reply messages**

### 5. ตั้งค่า Database

```bash
npx prisma migrate dev --name init
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
│   ├── app.js                  # Entry point, Express + session setup
│   ├── middleware/
│   │   └── multiChannel.js     # LINE multi-channel signature verification
│   ├── routes/
│   │   ├── webhook.js          # LINE webhook handler
│   │   └── api.js              # REST API สำหรับ web app
│   └── services/
│       ├── db.js               # Prisma database operations
│       ├── storage.js          # Supabase Storage upload/stream/delete
│       ├── ocr.js              # Tesseract.js OCR
│       └── line.js             # LINE SDK helper
├── web/public/
│   ├── index.html              # หน้าเว็บค้นหาไฟล์
│   ├── login.html              # หน้า login
│   ├── style.css
│   └── app.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── render.yaml
└── package.json
```

## API Endpoints

| Method | Path | คำอธิบาย |
|---|---|---|
| POST | `/webhook` | LINE Webhook |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/api/channels` | รายชื่อ channel ทั้งหมด |
| GET | `/api/files` | ค้นหาไฟล์ (query: `fileName`, `fileType`, `ocrText`, `lineUserId`, `channelId`, `note`, `done`, `dateFrom`, `dateTo`, `page`, `limit`) |
| GET | `/api/files/:id` | ดูข้อมูลไฟล์ชิ้นเดียว |
| PATCH | `/api/files/:id` | อัปเดต done/note |
| GET | `/api/files/:id/preview` | Proxy ไฟล์สำหรับพรีวิว |
| GET | `/api/files/:id/download` | ดาวน์โหลดไฟล์ |
| DELETE | `/api/files/:id` | ลบไฟล์ |

## Deploy บน Render

1. Push โค้ดขึ้น GitHub
2. สร้าง Web Service บน [Render](https://render.com) เชื่อมกับ repo
3. ตั้งค่า Environment Variables ทั้งหมดใน Render Dashboard
4. Render จะ build และ deploy อัตโนมัติทุกครั้งที่ push
5. ใส่ URL ที่ได้เป็น Webhook URL ใน LINE Developers Console

### ป้องกัน Cold Start

Render free tier จะ spin down หลัง 15 นาทีที่ไม่มี request ให้ใช้ [cron-job.org](https://cron-job.org) ping URL ทุก 10 นาที เพื่อให้ server ทำงานตลอดเวลา
