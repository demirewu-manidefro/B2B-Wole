const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const db = require('./db');
const { initSocketServer } = require('./socket/socketServer');
const { maintenanceAndVersionCheck } = require('./middleware/maintenance');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const httpServer = http.createServer(app);

// 1. Initialize Real-Time Duplex Socket.io Server
const io = initSocketServer(httpServer);
app.set('io', io);

// 2. Middleware Configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 3. Section 5.5 Global Maintenance & Version Check Middleware (Applied to all API routes)
app.use('/api', maintenanceAndVersionCheck, apiRoutes);

// 4. Serve Static Frontend SPA Assets
app.use(express.static(path.join(__dirname, '../public')));

// Fallback for SPA routing to index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Not Found', message: 'API endpoint does not exist.' });
  }
});

const PORT = process.env.PORT || 3000;

// 5. Initialize Database & Boot Server
if (require.main === module) {
  db.initDB().then(() => {
    httpServer.listen(PORT, () => {
      console.log(`
=============================================================================
🇪🇹 B2B Wholesale & Escrow Marketplace (Ethiopia Ecosystem)
🚀 Server running on http://localhost:${PORT}
⚡ Database: Embedded PGlite / PostgreSQL v15+ (Dual-Mode Engine Active)
🛡️ Guardrails: Concurrency Lock, Idempotent Webhooks, IDOR Shield, Chat Scrubber
=============================================================================
      `);
    });
  }).catch((err) => {
    console.error('❌ Failed to boot marketplace engine:', err);
    process.exit(1);
  });
}

module.exports = { app, httpServer, db };
