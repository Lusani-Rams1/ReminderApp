
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
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

        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };

        next();
    } catch (error) {
        if (error.message === "JWT_SECRET is not configured.") {
            console.error(error.message);
            return res.status(500).json({
                message: "Server authentication is not configured."
            });
        }

        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
}

module.exports = { requireAuth };
