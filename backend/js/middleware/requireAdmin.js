const db = require("../db");

// Always verify the current role from MySQL so a changed/demoted account
// cannot keep administrator access using an older JWT.
async function requireAdmin(req, res, next) {
    try {
        const [rows] = await db.execute(
            "SELECT role FROM users WHERE user_id = ? LIMIT 1",
            [req.user.userId]
        );

        if (!rows.length) {
            return res.status(401).json({ message: "Account not found. Please log in again." });
        }

        if (rows[0].role !== "admin") {
            return res.status(403).json({ message: "Administrator access is required." });
        }

        req.user.role = "admin";
        next();
    } catch (error) {
        console.error("ADMIN AUTHORIZATION ERROR:", error);
        return res.status(500).json({ message: "Unable to verify administrator access." });
    }
}

module.exports = { requireAdmin };
