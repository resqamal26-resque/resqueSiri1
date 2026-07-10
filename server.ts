import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any = null;

try {
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    const firebaseApp = initializeApp(config);
    db = getFirestore(firebaseApp, config.firestoreDatabaseId);
    console.log('Firebase initialized successfully on backend server.');
  } else {
    console.warn('Firebase config file missing on server, falling back to env.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase on server:', error);
}

async function getTelegramConfig() {
  const defaults = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '',
    TELEGRAM_CHAT_ID_ATTENDANCE: process.env.TELEGRAM_CHAT_ID_ATTENDANCE || process.env.VITE_TELEGRAM_CHAT_ID_ATTENDANCE || ''
  };

  if (!db) {
    return defaults;
  }

  try {
    const docRef = doc(db, 'telegram_config', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        TELEGRAM_BOT_TOKEN: (data.TELEGRAM_BOT_TOKEN || '').trim(),
        TELEGRAM_CHAT_ID: (data.TELEGRAM_CHAT_ID || '').trim(),
        TELEGRAM_CHAT_ID_ATTENDANCE: (data.TELEGRAM_CHAT_ID_ATTENDANCE || '').trim(),
      };
    }
  } catch (err) {
    console.error('Error fetching Telegram config from Firestore:', err);
  }

  return defaults;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware to support Netlify Serverless Function path rewrites
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
  }
  next();
});

export { app };

  app.post('/api/notify-logout', async (req, res) => {
    const data = req.body;
    const config = await getTelegramConfig();
    const botToken = config.TELEGRAM_BOT_TOKEN;
    const chatId = config.TELEGRAM_CHAT_ID_ATTENDANCE;

    if (!botToken) {
      console.error('Logout Notify: Telegram Bot Token missing');
      return res.status(500).json({ error: 'Telegram configuration missing on server' });
    }

    const message = `
⚠️ *NOTIFIKASI LOG KELUAR* ⚠️
_Petugas telah menamatkan tugas_

👤 *MAKLUMAT PETUGAS*
• Nama: ${data.nama}
• Kawasan/Pos: ${data.kawasan}
• Negeri: ${data.selectedRegion || 'Single Mode'}
• Masa Log Keluar: ${data.logoutTime}

📊 *RINGKASAN TUGAS*
• Jumlah Kes Dilaporkan: ${data.totalCases}

📢 *Status: LOG KELUAR*
    `.trim();

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json() as any;
      if (result.ok) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to send to Telegram' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/notify-login', async (req, res) => {
    const data = req.body;
    const config = await getTelegramConfig();
    const botToken = config.TELEGRAM_BOT_TOKEN;
    const chatId = config.TELEGRAM_CHAT_ID_ATTENDANCE;

    if (!botToken) {
      console.error('Login Notify: Telegram Bot Token missing');
      return res.status(500).json({ error: 'Telegram configuration missing on server' });
    }

    const message = `
✅ *NOTIFIKASI KEHADIRAN* ✅
_Petugas telah log masuk ke sistem_

👤 *MAKLUMAT PETUGAS*
• Nama: ${data.nama}
• Kawasan/Pos: ${data.kawasan}
• Negeri: ${data.selectedRegion || 'Single Mode'}
• Masa Log Masuk: ${data.loginTime}

${data.programInfo && data.programInfo.nama ? `📋 *MAKLUMAT PROGRAM*
• Program: ${data.programInfo.nama}
• Lokasi: ${data.programInfo.lokasi || '-'}
• Tarikh: ${data.programInfo.tarikh || '-'}
• Masa: ${data.programInfo.masa || '-'}
` : ''}
📢 *Status: HADIR*
    `.trim();

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json() as any;
      if (result.ok) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to send to Telegram' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API Route to test Telegram connection without sending any message (using getMe)
  app.post('/api/test-telegram', async (req, res) => {
    const { token } = req.body;
    const config = await getTelegramConfig();
    const botToken = token || config.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Sila masukkan Token Bot Telegram untuk diuji.' 
      });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json() as any;
      
      if (result.ok) {
        return res.json({ 
          success: true, 
          botInfo: result.result 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: result.description || 'Ralat maklum balas daripada Telegram' 
        });
      }
    } catch (error: any) {
      console.error('Telegram test error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Gagal menyambung ke API Telegram' 
      });
    }
  });

  // API Route to get current Telegram configuration
  app.get('/api/telegram-config', async (req, res) => {
    const config = await getTelegramConfig();
    return res.json(config);
  });

  // API Route to save Telegram configuration to Firestore
  app.post('/api/save-telegram-config', async (req, res) => {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_CHAT_ID_ATTENDANCE } = req.body;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !TELEGRAM_CHAT_ID_ATTENDANCE) {
      return res.status(400).json({
        success: false,
        error: 'Sila lengkapkan semua butiran Telegram (Token, Chat ID, dan Chat ID Kehadiran).'
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Firestore is not initialized on the server.'
      });
    }

    try {
      const docRef = doc(db, 'telegram_config', 'main');
      await setDoc(docRef, {
        TELEGRAM_BOT_TOKEN: TELEGRAM_BOT_TOKEN.trim(),
        TELEGRAM_CHAT_ID: TELEGRAM_CHAT_ID.trim(),
        TELEGRAM_CHAT_ID_ATTENDANCE: TELEGRAM_CHAT_ID_ATTENDANCE.trim(),
        updatedAt: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: 'Konfigurasi Telegram berjaya disimpan terus ke Firestore!'
      });
    } catch (error: any) {
      console.error('Save env error:', error);
      return res.status(500).json({
        success: false,
        error: `Ralat semasa menyimpan fail: ${error.message}`
      });
    }
  });

  // API Route for Telegram
  app.post('/api/send-telegram', async (req, res) => {
    const data = req.body;
    const config = await getTelegramConfig();
    const botToken = config.TELEGRAM_BOT_TOKEN;
    const chatId = config.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Send Telegram: Credentials missing');
      return res.status(500).json({ error: 'Telegram configuration missing on server' });
    }

    let message = '';
    if (data.message) {
      message = data.message;
    } else if (data.dutyInfo) {
      message = `
🚨 *LAPORAN KES BARU* 🚨
_No. Kes: ${data.case_number || 'N/A'}_

📍 *MAKLUMAT TUGAS*
• Petugas: ${data.dutyInfo.nama}
• Kawasan/Pos: ${data.dutyInfo.kawasan}
• Negeri: ${data.selectedRegion || 'Single Mode'}

📋 *MAKLUMAT PROGRAM*
• Program: ${data.namaProgram}
• Lokasi: ${data.lokasi || '-'}
• Tarikh: ${data.tarikh}
• Masa: ${data.masa}

👤 *MAKLUMAT PESAKIT*
• Nama: ${data.namaPesakit}
• Umur: ${data.umur}
• Jantina: ${data.jantina}

🏥 *PENILAIAN & RAWATAN*
• Aduan: ${data.aduan}
• Tanda Vital: ${data.tandaVital}
• Rawatan: ${data.rawatan}

✅ *STATUS & PENGESAHAN*
• Status Kes: ${data.statusKes}
• Nama Perawat: ${data.namaPerawat || '-'}
• Nama Responder: ${data.namaResponder}
      `.trim();
    } else {
      return res.status(400).json({ error: 'Missing message or dutyInfo' });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json() as any;
      if (result.ok) {
        res.json({ success: true });
      } else {
        console.error('Telegram API error:', result);
        res.status(500).json({ error: 'Failed to send to Telegram' });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API Route for Telegram with Images
  app.post('/api/send-report-with-images', async (req, res) => {
    const { reportData, message, images } = req.body;
    const config = await getTelegramConfig();
    const botToken = config.TELEGRAM_BOT_TOKEN;
    const chatId = config.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Send Report: Credentials missing');
      return res.status(500).json({ error: 'Telegram configuration missing on server' });
    }

    try {
      // 1. Send the text message
      const textResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const textResult = await textResponse.json() as any;
      if (!textResult.ok) {
        console.error('Telegram text API error:', textResult);
      }

      // 2. Send images if any
      if (images && images.length > 0) {
        if (images.length === 1) {
          // Single image
          const base64Data = images[0].split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('photo', buffer, { filename: 'report_image.jpg', contentType: 'image/jpeg' });
          formData.append('caption', `📷 Gambar Lampiran untuk Kes: ${reportData.case_number || 'N/A'}`);
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
        } else {
          // Multiple images using sendMediaGroup
          const media = [];
          const formData = new FormData();
          formData.append('chat_id', chatId);

          for (let i = 0; i < images.length; i++) {
            const base64Data = images[i].split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileId = `photo${i}`;
            
            formData.append(fileId, buffer, { filename: `image_${i}.jpg`, contentType: 'image/jpeg' });
            
            media.push({
              type: 'photo',
              media: `attach://${fileId}`,
              caption: i === 0 ? `📷 Gambar Lampiran (${images.length}) untuk Kes: ${reportData.case_number || 'N/A'}` : ''
            });
          }

          formData.append('media', JSON.stringify(media));

          await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
            method: 'POST',
            body: formData,
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Telegram send error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API Route for sending PDF to Telegram
  app.post('/api/send-pdf-telegram', async (req, res) => {
    const { pdfBase64, filename, caption } = req.body;
    const config = await getTelegramConfig();
    const botToken = config.TELEGRAM_BOT_TOKEN;
    const chatId = config.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Send PDF: Credentials missing');
      return res.status(500).json({ error: 'Telegram configuration missing on server' });
    }

    try {
      const buffer = Buffer.from(pdfBase64, 'base64');
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('document', buffer, { filename: filename || 'report.pdf', contentType: 'application/pdf' });
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json() as any;
      if (result.ok) {
        res.json({ success: true });
      } else {
        console.error('Telegram PDF API error:', result);
        res.status(500).json({ error: 'Failed to send PDF to Telegram' });
      }
    } catch (error) {
      console.error('Telegram PDF send error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Only initialize Vite or static serving if not running in a Netlify serverless environment
  async function initializeServer() {
    if (process.env.NETLIFY === 'true') {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  initializeServer();
