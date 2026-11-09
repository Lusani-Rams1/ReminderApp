const jwt = require("jsonwebtoken");
const db = require("../db");

async function requireAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. Please log in."
        });
    }

    const token = header.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            message: "Access token is missing."
        });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        if (!decoded.userId) {
            return res.status(401).json({
                message: "Invalid token payload."
            });
        }

        // Retrieve the latest account information from the database.
        const [users] = await db.execute(
            `SELECT user_id, email, role, account_status
             FROM users
             WHERE user_id = ?`,
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Account no longer exists. Please log in again."
            });
        }

        const user = users[0];

        // Block suspended student accounts, including existing sessions.
        if (
            user.role === "student" &&
            user.account_status === "suspended"
        ) {
            return res.status(403).json({
                message: "Your account has been suspended. Please contact the administrator."
            });
        }

        req.user = {
            userId: user.user_id,
            email: user.email,
            role: user.role
        };

        return next();

    } catch (error) {
        if (error.message === "JWT_SECRET is not configured.") {
            console.error(error.message);
            return res.status(500).json({
                message: "Server authentication is not configured."
            });
        }

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token."
            });
        }

        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(500).json({
            message: "Unable to verify authentication."
        });
    }
}

module.exports = { requireAuth };
