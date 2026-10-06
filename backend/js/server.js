const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "CampusSync API is running"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`CampusSync server running on http://localhost:${PORT}`);
});