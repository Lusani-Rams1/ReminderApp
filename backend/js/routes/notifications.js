
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

// GET /api/notifications
router.get("/", async (req, res) => {
    try {
        const [notifications] = await db.execute(
            `SELECT notification_id, reminder_id, title, message,
                    is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        res.json({ notifications });
    } catch (error) {
        console.error("GET NOTIFICATIONS:", error);
        res.status(500).json({
            message: "Unable to load notifications."
        });
    }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res) => {
    try {
        const [result] = await db.execute(
            `UPDATE notifications SET is_read = TRUE
             WHERE notification_id = ? AND user_id = ?`,
            [req.params.id, req.user.userId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Notification not found."
            });
        }

        res.json({ message: "Notification marked as read." });
    } catch (error) {
        console.error("MARK NOTIFICATION READ:", error);
        res.status(500).json({
            message: "Unable to update notification."
        });
    }
});

module.exports = router;
