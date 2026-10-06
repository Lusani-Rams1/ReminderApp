const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

app.use(cors());
app.use(express.json());
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve the frontend (index.html, login.html, register.html, CSS, js)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`CampusSync server running on http://localhost:${PORT}`);
});
