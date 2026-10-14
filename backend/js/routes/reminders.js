
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

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
        res.status(500).json({
            message: "Unable to load reminders."
        });
    }
});

// POST /api/reminders
router.post("/", async (req, res) => {
    try {
        const { message, remindAt, taskId = null } = req.body;

        if (!message || !message.trim() || !remindAt) {
            return res.status(400).json({
                message: "Reminder message and date/time are required."
            });
        }

        if (Number.isNaN(Date.parse(remindAt))) {
            return res.status(400).json({
                message: "Please provide a valid reminder date/time."
            });
        }

        if (taskId != null) {
            const [tasks] = await db.execute(
                `SELECT task_id FROM tasks
                 WHERE task_id = ? AND user_id = ?`,
                [taskId, req.user.userId]
            );

            if (!tasks.length) {
                return res.status(400).json({
                    message: "The selected task was not found."
                });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO reminders (user_id, task_id, message, remind_at)
             VALUES (?, ?, ?, ?)`,
            [
                req.user.userId,
                taskId,
                message.trim(),
                remindAt.replace("T", " ")
            ]
        );

        res.status(201).json({
            message: "Reminder created successfully.",
            reminderId: result.insertId
        });
    } catch (error) {
        console.error("CREATE REMINDER:", error);
        res.status(500).json({
            message: "Unable to create reminder."
        });
    }
});

// PATCH /api/reminders/:id/cancel
router.patch("/:id/cancel", async (req, res) => {
    try {
        const [result] = await db.execute(
            `UPDATE reminders SET status = 'cancelled'
             WHERE reminder_id = ? AND user_id = ? AND status = 'pending'`,
            [req.params.id, req.user.userId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Pending reminder not found."
            });
        }

        res.json({ message: "Reminder cancelled." });
    } catch (error) {
        console.error("CANCEL REMINDER:", error);
        res.status(500).json({
            message: "Unable to cancel reminder."
        });
    }
});

// DELETE /api/reminders/:id
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.execute(
            "DELETE FROM reminders WHERE reminder_id = ? AND user_id = ?",
            [req.params.id, req.user.userId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Reminder not found."
            });
        }

        res.json({ message: "Reminder deleted successfully." });
    } catch (error) {
        console.error("DELETE REMINDER:", error);
        res.status(500).json({
            message: "Unable to delete reminder."
        });
    }
});

module.exports = router;
