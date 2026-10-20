const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const DEFAULT_SETTINGS = {
    theme: "light",
    language: "english",
    assignmentAlerts: true,
    classReminders: true,
    announcements: true,
    offlineMode: true
};

function toSettings(row) {
    if (!row) return { ...DEFAULT_SETTINGS };
    return {
        theme: row.theme,
        language: row.language,
        assignmentAlerts: Boolean(row.assignment_alerts),
        classReminders: Boolean(row.class_reminders),
        announcements: Boolean(row.announcements),
        offlineMode: Boolean(row.offline_mode)
    };
}

// GET /api/settings - get the signed-in user's saved preferences
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT theme, language, assignment_alerts, class_reminders,
                    announcements, offline_mode
             FROM user_settings WHERE user_id = ? LIMIT 1`,
            [req.user.userId]
        );
        res.json({ settings: toSettings(rows[0]) });
    } catch (error) {
        console.error("GET SETTINGS:", error);
        res.status(500).json({ message: "Unable to load account settings. Check that database/schema.sql has been applied." });
    }
});

// PUT /api/settings - save the signed-in user's preferences
router.put("/", async (req, res) => {
    try {
        const body = req.body || {};
        const current = { ...DEFAULT_SETTINGS };

        if (body.theme !== undefined) {
            if (!["light", "dark"].includes(body.theme)) {
                return res.status(400).json({ message: "Theme must be light or dark." });
            }
            current.theme = body.theme;
        }
        if (body.language !== undefined) {
            if (!["english", "zulu"].includes(body.language)) {
                return res.status(400).json({ message: "Language must be english or zulu." });
            }
            current.language = body.language;
        }

        for (const key of ["assignmentAlerts", "classReminders", "announcements", "offlineMode"]) {
            if (body[key] !== undefined && typeof body[key] !== "boolean") {
                return res.status(400).json({ message: key + " must be true or false." });
            }
        }

        const [existing] = await db.execute(
            `SELECT theme, language, assignment_alerts, class_reminders,
                    announcements, offline_mode
             FROM user_settings WHERE user_id = ? LIMIT 1`,
            [req.user.userId]
        );
        // Partial updates preserve every preference that was not sent.
        const merged = { ...DEFAULT_SETTINGS, ...toSettings(existing[0]) };
        if (body.theme !== undefined) merged.theme = body.theme;
        if (body.language !== undefined) merged.language = body.language;
        for (const key of ["assignmentAlerts", "classReminders", "announcements", "offlineMode"]) {
            if (body[key] !== undefined) merged[key] = body[key];
        }

        await db.execute(
            `INSERT INTO user_settings
                (user_id, theme, language, assignment_alerts, class_reminders, announcements, offline_mode)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                theme = VALUES(theme),
                language = VALUES(language),
                assignment_alerts = VALUES(assignment_alerts),
                class_reminders = VALUES(class_reminders),
                announcements = VALUES(announcements),
                offline_mode = VALUES(offline_mode)`,
            [
                req.user.userId,
                merged.theme,
                merged.language,
                merged.assignmentAlerts ? 1 : 0,
                merged.classReminders ? 1 : 0,
                merged.announcements ? 1 : 0,
                merged.offlineMode ? 1 : 0
            ]
        );

        res.json({ message: "Settings saved to your account.", settings: merged });
    } catch (error) {
        console.error("SAVE SETTINGS:", error);
        res.status(500).json({ message: "Unable to save account settings. Check that database/schema.sql has been applied." });
    }
});

module.exports = router;
