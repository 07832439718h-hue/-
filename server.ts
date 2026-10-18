import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Allow cross-origin requests & mobile devices
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Authoritative Server Time API Endpoint for Babylon, Iraq (Asia/Baghdad)
  app.get('/api/server-time', (req, res) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(new Date());
      const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
      
      const year = getPart('year');
      const month = getPart('month') - 1;
      const day = getPart('day');
      const hour = getPart('hour');
      const minute = getPart('minute');
      const second = getPart('second');
      
      const iraqDate = new Date(year, month, day, hour, minute, second);

      res.json({
        timestamp: iraqDate.toISOString(),
        serverTime: iraqDate.getTime(),
        hours: hour,
        minutes: minute,
        dayOfWeek: iraqDate.getDay(),
        timeZone: 'Asia/Baghdad (بابل - العراق)',
      });
    } catch (err) {
      const now = new Date();
      res.json({
        timestamp: now.toISOString(),
        serverTime: now.getTime(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        dayOfWeek: now.getDay(),
        timeZone: 'UTC (Fallback)',
      });
    }
  });

  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      allowedHosts: true,
    },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running with Babylon, Iraq (Asia/Baghdad) time sync on http://localhost:${PORT}`);
  });
}

startServer();
