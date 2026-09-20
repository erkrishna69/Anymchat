# AnymChat 💬

AnymChat is a privacy-first, real-time proximity-based anonymous social chat platform operating within a 10 km geofence radius.

## 🌟 Key Features
- 📍 **10 KM Proximity Geofence**: Connect and chat with anonymous users nearby in real-time.
- ⚡ **Ultra-Low Latency Messaging**: Powered by Socket.IO, Express, MongoDB Atlas, and Redis caching.
- 🛡️ **Orbit AI Moderation**: Automated real-time PII redaction and safety filters.
- ⏳ **24-Hour Ephemeral Retention**: Auto-cleanup of aged chats.
- 📦 **Automated Google Drive Cloud Archival**: Scheduled hourly backups.

## 📁 Repository Structure
```
AnymChat/
├── backend/    # Node.js + TypeScript + Express + Socket.IO + Redis + MongoDB
└── frontend/   # Next.js 16 (App Router) + React + Tailwind CSS / Vanilla CSS
```

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your MongoDB URI and Redis in .env
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start chatting!
