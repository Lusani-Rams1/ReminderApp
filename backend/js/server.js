const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const categoryRoutes = require("./routes/categories");
const reminderRoutes = require("./routes/reminders");
const notificationRoutes = require("./routes/notifications");
const runReminderScheduler = require("./services/reminderScheduler");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "CampusSync API is running" });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(PORT, () => {
    console.log(`CampusSync server running on http://localhost:${PORT}`);

    // Check for due reminders immediately and every 30 seconds.
    runReminderScheduler();
    setInterval(runReminderScheduler, 30_000);
});
