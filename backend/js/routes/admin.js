const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

// Every admin endpoint requires a valid login and a current admin role in MySQL.
router.use(requireAuth, requireAdmin);

// GET /api/admin/overview
router.get("/overview", async (req, res) => {
    try {
        const [[users]] = await db.execute(
            "SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"
        );
        const [[tasks]] = await db.execute(
            `SELECT COUNT(*) AS total_tasks,
                    SUM(status = 'completed') AS completed_tasks,
                    SUM(status = 'pending') AS pending_tasks,
                    SUM(status = 'in_progress') AS in_progress_tasks,
                    SUM(status <> 'completed' AND due_date IS NOT NULL AND due_date < NOW()) AS overdue_tasks
             FROM tasks`
        );
        const [[reminders]] = await db.execute(
            `SELECT COUNT(*) AS total_reminders,
                    SUM(status = 'pending') AS pending_reminders,
                    SUM(status = 'sent') AS sent_reminders,
                    SUM(status = 'cancelled') AS cancelled_reminders
             FROM reminders`
        );
        const [[notifications]] = await db.execute(
            `SELECT COUNT(*) AS total_notifications,
                    SUM(is_read = 1) AS read_notifications,
                    SUM(is_read = 0) AS unread_notifications
             FROM notifications`
        );

        res.json({
            users: { totalStudents: Number(users.total_students || 0) },
            tasks: {
                total: Number(tasks.total_tasks || 0),
                completed: Number(tasks.completed_tasks || 0),
                pending: Number(tasks.pending_tasks || 0),
                inProgress: Number(tasks.in_progress_tasks || 0),
                overdue: Number(tasks.overdue_tasks || 0)
            },
            reminders: {
                total: Number(reminders.total_reminders || 0),
                pending: Number(reminders.pending_reminders || 0),
                sent: Number(reminders.sent_reminders || 0),
                cancelled: Number(reminders.cancelled_reminders || 0)
            },
            notifications: {
                total: Number(notifications.total_notifications || 0),
                read: Number(notifications.read_notifications || 0),
                unread: Number(notifications.unread_notifications || 0)
            }
        });
    } catch (error) {
        console.error("ADMIN OVERVIEW ERROR:", error);
        res.status(500).json({ message: "Unable to load analytics overview." });
    }
});

// GET /api/admin/trends - monthly registrations and task creation for the last six months.
router.get("/trends", async (req, res) => {
    try {
        const [userRows] = await db.execute(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                    COUNT(*) AS total
             FROM users
             WHERE role = 'student'
               AND created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month ASC`
        );

        const [taskRows] = await db.execute(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                    COUNT(*) AS total
             FROM tasks
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month ASC`
        );

        res.json({ registrations: userRows, tasksCreated: taskRows });
    } catch (error) {
        console.error("ADMIN TRENDS ERROR:", error);
        res.status(500).json({ message: "Unable to load usage trends." });
    }
});

// GET /api/admin/health - checks both API reachability and database connectivity.
router.get("/health", async (req, res) => {
    try {
        await db.execute("SELECT 1");
        res.json({
            api: "online",
            database: "connected",
            checkedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("ADMIN HEALTH ERROR:", error);
        res.status(503).json({
            api: "online",
            database: "unavailable",
            checkedAt: new Date().toISOString()
        });
    }
});

module.exports = router;
