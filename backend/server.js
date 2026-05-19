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

// CORS - allow Angular frontend
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
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
