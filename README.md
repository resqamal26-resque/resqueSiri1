# ResQ Amal 🚑🚨

ResQ Amal is a robust, real-time emergency responder coordination, incident logging, and dispatch system. Designed for high-reliability medical and rescue services (like MECC), it supports structured incident tracking across single or multi-region deployments, tracks responder attendance/duty status, generates beautiful PDF case summaries, and pushes instant notifications with image attachments directly to Telegram channels.

The application is built as a full-stack system with a responsive React frontend, a flexible Express API backend, secure Firebase integration for database/auth storage, and serverless compatibility for seamless hosting on platforms like Netlify.

---

## 🌟 Key Features

- **Double-Mode Operation**: Seamlessly toggle between "Single-Mode" or "Multi-Region" medical dispatch operations.
- **Durable Real-Time Database**: Integrated with Firebase Firestore for live, persistent storage of medical records, attendance logs, and dispatch states.
- **Secure Authentication**: Google Authentication enabled out-of-the-box using safe, client-side popups.
- **Instant Telegram Dispatching**: Backend APIs automatically format medical incident payloads and forward them as rich Markdown notifications to Telegram channels.
- **Multiple Photo Attachments**: Supports capturing or attaching multiple images per case report, which are compiled and delivered directly to dispatch groups via Telegram.
- **Dynamic PDF Reporting**: Automatically compiles detailed medical reports into custom-styled, printable PDF logs.
- **Production-Ready & Serverless**: Ready to deploy on Netlify with automated routing of API requests to serverless Netlify functions.

---

## 🛠️ Technology Stack

- **Frontend**: React 18+ (Vite), Tailwind CSS (v4), Framer Motion (animations)
- **Backend**: Express (Node.js) with dynamic dev servers
- **Database/Auth**: Firebase (Firestore, Authentication)
- **Serverless Integration**: Netlify Functions + `serverless-http`
- **PDF Compilation**: `jspdf` & `jspdf-autotable`

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### 1. Clone & Install Dependencies

```bash
# Install package dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and populate it with your credentials (see `.env.example` as a template):

```env
# Supabase Configuration (Optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Telegram Bot Credentials (MANDATORY for notifications)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_general_chat_id
TELEGRAM_CHAT_ID_ATTENDANCE=your_attendance_chat_id

# Firebase Production Credentials (Optional: Falls back to firebase-applet-config.json)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_DATABASE_ID=your_firebase_database_id
```

### 3. Local Development

Run the following command to boot up both the Express backend and Vite frontend proxy on `http://localhost:3000`:

```bash
npm run dev
```

---

## ☁️ Deployment Instructions

### Option 1: Netlify (Recommended)

Netlify is the ideal host for this static-first application because it natively compiles and hosts our backend as a **Serverless Netlify Function**.

1. **Push to GitHub**: Commit and push this repository to your GitHub account.
2. **Import to Netlify**:
   - Log into your Netlify dashboard and click **Add new site** -> **Import an existing project**.
   - Select your GitHub repository.
3. **Configure Build Settings**:
   - Netlify will automatically detect the settings from `netlify.toml`:
     - **Build Command**: `npm run build`
     - **Publish Directory**: `dist`
4. **Configure Environment Variables**:
   - In Netlify, go to **Site settings** -> **Environment variables**.
   - Define all environment variables from `.env.example` (such as `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, etc.).
5. **Deploy**: Click **Deploy site**. Your full-stack incident dispatcher will be live in seconds!

### Option 2: Custom Container Hosting (e.g. Cloud Run, VPS)

To deploy on traditional container hosting platforms:

```bash
# Build the production bundle
npm run build

# Start the Node.js Express server
npm run start
```

---

## 🔒 Security & Privacy

- **No Hardcoded Secrets**: All Telegram Bot tokens, chat configurations, and sensitive database keys have been extracted into secure environment variables (`process.env`).
- **Server-Side Masking**: Client calls are routed through server API routes (`/api/*`), ensuring that no third-party APIs can scrape your Telegram Bot tokens from browser source maps or networking tabs.
- **Defensive Firestore rules**: Active database policies protect and isolate incident structures to verified users only.

---

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details if added.
