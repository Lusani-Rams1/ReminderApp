const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toSqlDateTime(value) {
    if (typeof value !== "string" || !value.trim()) return null;

    const input = value.trim();
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(input)) {
        const date = new Date(input);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 19).replace("T", " ");
    }

    const normalized = input.replace("T", " ");
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized + " 00:00:00";
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return normalized + ":00";
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) {
        return normalized.slice(0, 19);
    }
    return null;
}

// GET /api/reminders
router.get("/", async (req, res) => {
    try {
        const [reminders] = await db.execute(
            `SELECT r.*, t.title AS task_title
             FROM reminders r
             LEFT JOIN tasks t ON t.task_id = r.task_id
             WHERE r.user_id = ?
             ORDER BY r.remind_at ASC`,
            [req.user.userId]
        );
        res.json({ reminders });
    } catch (error) {
        console.error("GET REMINDERS:", error);
        res.status(500).json({ message: "Unable to load reminders." });
    }
});

// POST /api/reminders
router.post("/", async (req, res) => {
    try {
        const { message, remindAt, taskId = null } = req.body;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ message: "Reminder message is required as text." });
        }
        if (typeof remindAt !== "string" || !remindAt.trim()) {
            return res.status(400).json({ message: "Reminder date/time is required as a string." });
        }

        const sqlRemindAt = toSqlDateTime(remindAt);
        if (!sqlRemindAt) {
            return res.status(400).json({ message: "Please provide a valid reminder date/time." });
        }

        if (taskId != null) {
            const [tasks] = await db.execute(
                `SELECT task_id FROM tasks
                 WHERE task_id = ? AND user_id = ?`,
                [taskId, req.user.userId]
            );
            if (!tasks.length) {
                return res.status(400).json({ message: "The selected task was not found." });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO reminders (user_id, task_id, message, remind_at)
             VALUES (?, ?, ?, ?)`,
            [req.user.userId, taskId, message.trim(), sqlRemindAt]
        );
        res.status(201).json({
            message: "Reminder created successfully.",
            reminderId: result.insertId
        });
    } catch (error) {
        console.error("CREATE REMINDER:", error);
        res.status(500).json({ message: "Unable to create reminder." });
    }
});

// PATCH /api/reminders/:id/cancel
router.patch("/:id/cancel", async (req, res) => {
    try {
        const reminderId = Number(req.params.id);
        if (!Number.isInteger(reminderId) || reminderId < 1) {
            return res.status(400).json({ message: "Invalid reminder ID." });
        }
        const [result] = await db.execute(
            `UPDATE reminders SET status = 'cancelled'
             WHERE reminder_id = ? AND user_id = ? AND status = 'pending'`,
            [reminderId, req.user.userId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ message: "Pending reminder not found." });
        }
        res.json({ message: "Reminder cancelled." });
    } catch (error) {
        console.error("CANCEL REMINDER:", error);
        res.status(500).json({ message: "Unable to cancel reminder." });
    }
});

// DELETE /api/reminders/:id
router.delete("/:id", async (req, res) => {
    try {
        const reminderId = Number(req.params.id);
        if (!Number.isInteger(reminderId) || reminderId < 1) {
            return res.status(400).json({ message: "Invalid reminder ID." });
        }
        const [result] = await db.execute(
            "DELETE FROM reminders WHERE reminder_id = ? AND user_id = ?",
            [reminderId, req.user.userId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ message: "Reminder not found." });
        }
        res.json({ message: "Reminder deleted successfully." });
    } catch (error) {
        console.error("DELETE REMINDER:", error);
        res.status(500).json({ message: "Unable to delete reminder." });
    }
});

module.exports = router;
