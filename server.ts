import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/notify-logout', async (req, res) => {
    const data = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID_ATTENDANCE || '-1003966839581';

    if (!botToken) {
      return res.status(500).json({ error: 'Telegram configuration missing' });
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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID_ATTENDANCE || '-1003966839581';

    if (!botToken) {
      return res.status(500).json({ error: 'Telegram configuration missing' });
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

  // API Route for Telegram
  app.post('/api/send-telegram', async (req, res) => {
    const data = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Telegram credentials missing');
      return res.status(500).json({ error: 'Telegram configuration missing' });
    }

    const message = `
🚨 *LAPORAN KES BARU* 🚨
_Laporan dihantar dari sistem single phase_

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
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

startServer();
