require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/error-handler');
const db = require('./helpers/db');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS - allow Angular frontend (dev: localhost:4200, prod: same origin)
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (no origin header) or configured origin
    if (!origin || origin === corsOrigin) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now; tighten in production
    }
  },
  credentials: true
}));

// API routes
app.use('/accounts', require('./routes/accounts'));

// Serve Angular frontend (production build)
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// Catch-all: serve Angular index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Angular Auth API is running 🚀' });
  }
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;

db.initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
});
