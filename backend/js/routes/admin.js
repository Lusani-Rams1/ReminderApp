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
    const uptimeSeconds = Math.floor(process.uptime());

    const memoryUsage = process.memoryUsage();

    const memoryMB = {
        used: Number((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)),
        total: Number((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)),
        rss: Number((memoryUsage.rss / 1024 / 1024).toFixed(2))
    };

    try {
        await db.execute("SELECT 1");

        res.json({
            api: "online",
            database: "connected",
            uptimeSeconds,
            memoryMB,
            checkedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("ADMIN HEALTH ERROR:", error);

        res.status(503).json({
            api: "online",
            database: "unavailable",
            uptimeSeconds,
            memoryMB,
            checkedAt: new Date().toISOString()
        });
    }
});

// GET /api/admin/students?search=keyword
router.get("/students", async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();

        const [students] = await db.execute(
            `SELECT
            user_id AS userId,
            full_name AS fullName,
            student_number AS studentNumber,
            email,
            created_at AS createdAt,
            account_status AS accountStatus
             FROM users
             WHERE role = 'student'
               AND (
                    full_name LIKE ?
                    OR student_number LIKE ?
                    OR email LIKE ?
               )
             ORDER BY created_at DESC
             LIMIT 100`,
            [`%${search}%`, `%${search}%`, `%${search}%`]
        );

        res.json({
            total: students.length,
            students
        });

    } catch (error) {
        console.error("ADMIN STUDENT LIST ERROR:", error);

        res.status(500).json({
            message: "Unable to retrieve student accounts."
        });
    }
});

// PATCH /api/admin/students/:id/status
// Suspend or reactivate a student account.
router.patch("/students/:id/status", async (req, res) => {
    try {
        const studentId = Number(req.params.id);
        const { accountStatus } = req.body;

        if (!Number.isInteger(studentId) || studentId <= 0) {
            return res.status(400).json({
                message: "Invalid student ID."
            });
        }

        if (!["active", "suspended"].includes(accountStatus)) {
            return res.status(400).json({
                message: "Account status must be active or suspended."
            });
        }

        // Confirm that the account exists and belongs to a student.
        const [students] = await db.execute(
            `SELECT user_id
             FROM users
             WHERE user_id = ?
               AND role = 'student'`,
            [studentId]
        );

        if (students.length === 0) {
            return res.status(404).json({
                message: "Student account not found."
            });
        }

        // Update account status.
        await db.execute(
            `UPDATE users
             SET account_status = ?
             WHERE user_id = ?
               AND role = 'student'`,
            [accountStatus, studentId]
        );

        return res.json({
            message: `Student account ${accountStatus === "active" ? "reactivated" : "suspended"} successfully.`,
            studentId,
            accountStatus
        });

    } catch (error) {
        console.error("ADMIN ACCOUNT STATUS ERROR:", error);

        return res.status(500).json({
            message: "Unable to update student account status."
        });
    }
});

// GET /api/admin/activity
// Returns student engagement statistics and recent activity.
router.get("/activity", async (req, res) => {
    try {
        // Calculate student activity statistics.
        const [[stats]] = await db.execute(
            `SELECT
                (
                    SELECT COUNT(DISTINCT activity.user_id)
                    FROM (
                        SELECT user_id, created_at FROM tasks
                        UNION ALL
                        SELECT user_id, created_at FROM reminders
                        UNION ALL
                        SELECT user_id, created_at FROM notifications
                    ) activity
                    INNER JOIN users u
                        ON u.user_id = activity.user_id
                    WHERE u.role = 'student'
                      AND activity.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ) AS active_students,

                (
                    SELECT COUNT(*)
                    FROM tasks t
                    INNER JOIN users u ON u.user_id = t.user_id
                    WHERE u.role = 'student'
                ) AS tasks_created,

                (
                    SELECT COUNT(*)
                    FROM reminders r
                    INNER JOIN users u ON u.user_id = r.user_id
                    WHERE u.role = 'student'
                ) AS reminders_created,

                (
                    SELECT COUNT(*)
                    FROM notifications n
                    INNER JOIN users u ON u.user_id = n.user_id
                    WHERE u.role = 'student'
                ) AS notifications_received`
        );

        // Retrieve the 50 most recent recorded activities.
        const [activities] = await db.execute(
            `SELECT *
             FROM (
                SELECT
                    u.full_name AS student,
                    'Task created' AS activityType,
                    t.title AS details,
                    t.created_at AS activityDate
                FROM tasks t
                INNER JOIN users u ON u.user_id = t.user_id
                WHERE u.role = 'student'

                UNION ALL

                SELECT
                    u.full_name AS student,
                    'Reminder created' AS activityType,
                    r.message AS details,
                    r.created_at AS activityDate
                FROM reminders r
                INNER JOIN users u ON u.user_id = r.user_id
                WHERE u.role = 'student'

                UNION ALL

                SELECT
                    u.full_name AS student,
                    'Notification received' AS activityType,
                    n.title AS details,
                    n.created_at AS activityDate
                FROM notifications n
                INNER JOIN users u ON u.user_id = n.user_id
                WHERE u.role = 'student'
             ) AS recent_activity
             ORDER BY activityDate DESC
             LIMIT 50`
        );

        res.json({
            stats: {
                activeStudents: Number(stats.active_students || 0),
                tasksCreated: Number(stats.tasks_created || 0),
                remindersCreated: Number(stats.reminders_created || 0),
                notificationsReceived: Number(stats.notifications_received || 0)
            },
            activities
        });

    } catch (error) {
        console.error("ADMIN ACTIVITY ERROR:", error);

        res.status(500).json({
            message: "Unable to load student activity."
        });
    }
});

module.exports = router;
