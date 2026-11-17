
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID, randomBytes, createHash } = require("crypto");

const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const {
    sendVerificationEmail,
    sendPasswordResetEmail
} = require("../services/emailService");

const router = express.Router();

// =============================
// HELPERS
// =============================

function validatePassword(password) {
    if (typeof password !== "string") {
        return "Password is required.";
    }

    if (password.length < 12) {
        return "Password must contain at least 12 characters.";
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
        return "Password must not exceed 72 bytes.";
    }

    const commonPasswords = [
        "password123",
        "password1234",
        "qwerty123456",
        "admin123456",
        "123456789012",
        "password12345",
        "welcome123456"
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
        return "This password is too common. Choose a stronger password.";
    }

    return null;
}

function generateVerificationToken() {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return { token, tokenHash, expiresAt };
}

function hashVerificationToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

function toSqlDateTime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function createLimiter(windowMs, limit, message) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { message }
    });
}

// =============================
// RATE LIMITERS
// =============================

const loginLimiter = createLimiter(
    15 * 60 * 1000,
    10,
    "Too many login attempts. Please try again in 15 minutes."
);

const registerLimiter = createLimiter(
    60 * 60 * 1000,
    5,
    "Too many registration attempts. Please try again later."
);

const verifyLimiter = createLimiter(
    15 * 60 * 1000,
    20,
    "Too many verification attempts. Please try again later."
);

const resendLimiter = createLimiter(
    15 * 60 * 1000,
    3,
    "Too many requests. Please try again in 15 minutes."
);

const passwordResetLimiter = createLimiter(
    15 * 60 * 1000,
    3,
    "Too many requests. Please try again in 15 minutes."
);

// =============================
// REGISTER
// POST /api/auth/register
// =============================

router.post("/register", registerLimiter, async (req, res) => {
    let connection;

    try {
        const {
            fullName,
            studentNumber,
            email,
            password
        } = req.body || {};

        if (
            typeof fullName !== "string" ||
            !fullName.trim() ||
            typeof studentNumber !== "string" ||
            !studentNumber.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Full name, student number, email and password are required."
            });
        }

        const passwordError = validatePassword(password);

        if (passwordError) {
            return res.status(400).json({
                message: passwordError
            });
        }

        const cleanFullName = fullName.trim();
        const cleanStudentNumber = studentNumber.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (
            cleanFullName.length > 100 ||
            cleanStudentNumber.length > 50
        ) {
            return res.status(400).json({
                message: "Name or student number exceeds the allowed length."
            });
        }

        if (
            cleanEmail.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const [existingEmail] = await db.execute(
            "SELECT user_id FROM users WHERE email = ?",
            [cleanEmail]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                message: "An account with that email already exists."
            });
        }

        const [existingStudentNumber] = await db.execute(
            "SELECT user_id FROM users WHERE student_number = ?",
            [cleanStudentNumber]
        );

        if (existingStudentNumber.length > 0) {
            return res.status(409).json({
                message: "An account with that student number already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const {
            token,
            tokenHash,
            expiresAt
        } = generateVerificationToken();

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO users
                (
                    full_name,
                    student_number,
                    email,
                    password_hash,
                    role,
                    email_verified
                )
             VALUES (?, ?, ?, ?, 'student', 0)`,
            [
                cleanFullName,
                cleanStudentNumber,
                cleanEmail,
                passwordHash
            ]
        );

        await connection.execute(
            `INSERT INTO email_verification_tokens
                (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [
                result.insertId,
                tokenHash,
                toSqlDateTime(expiresAt)
            ]
        );

        await connection.commit();
        connection.release();
        connection = null;

        try {
            await sendVerificationEmail(
                cleanEmail,
                cleanFullName,
                token
            );
        } catch (emailError) {
            console.error(
                "VERIFICATION EMAIL ERROR:",
                emailError.message
            );

            return res.status(503).json({
                message: "Your account was created, but the verification email could not be sent. Please request another verification email.",
                emailVerificationRequired: true,
                emailDeliveryFailed: true
            });
        }

        return res.status(201).json({
            message: "Registration successful! Please check your email and click the verification link.",
            emailVerificationRequired: true
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("REGISTER ROLLBACK ERROR:", rollbackError);
            }
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "An account with that email or student number already exists."
            });
        }

        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            message: "Server error while creating account."
        });

    } finally {
        if (connection) connection.release();
    }
});

// =============================
// VERIFY EMAIL
// POST /api/auth/verify-email
// =============================

router.post("/verify-email", verifyLimiter, async (req, res) => {
    let connection;

    try {
        const { token } = req.body || {};

        if (
            typeof token !== "string" ||
            !/^[a-f0-9]{64}$/.test(token)
        ) {
            return res.status(400).json({
                message: "Invalid verification link."
            });
        }

        const tokenHash = hashVerificationToken(token);

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [tokens] = await connection.execute(
            `SELECT token_id, user_id
             FROM email_verification_tokens
             WHERE token_hash = ?
               AND used_at IS NULL
               AND expires_at > UTC_TIMESTAMP()
             FOR UPDATE`,
            [tokenHash]
        );

        if (tokens.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "This verification link is invalid, expired or already used."
            });
        }

        const verification = tokens[0];

        const [updateResult] = await connection.execute(
            `UPDATE users
             SET email_verified = 1
             WHERE user_id = ?
               AND role = 'student'`,
            [verification.user_id]
        );

        if (updateResult.affectedRows !== 1) {
            throw new Error("Verification account not found.");
        }

        await connection.execute(
            `UPDATE email_verification_tokens
             SET used_at = UTC_TIMESTAMP()
             WHERE token_id = ?`,
            [verification.token_id]
        );

        await connection.commit();

        return res.status(200).json({
            message: "Email verified successfully. You can now log in."
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("VERIFICATION ROLLBACK ERROR:", rollbackError);
            }
        }

        console.error("EMAIL VERIFICATION ERROR:", error);

        return res.status(500).json({
            message: "Unable to verify email. Please try again."
        });

    } finally {
        if (connection) connection.release();
    }
});

// =============================
// LOGIN
// POST /api/auth/login
// =============================

router.post("/login", loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const [users] = await db.execute(
            `SELECT
                user_id,
                full_name,
                student_number,
                email,
                password_hash,
                role,
                account_status,
                email_verified
             FROM users
             WHERE email = ?`,
            [cleanEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const role = user.role || "student";

        if (!["student", "admin"].includes(role)) {
            return res.status(403).json({
                message: "This account has an unrecognised role."
            });
        }

        if (
            role === "student" &&
            user.account_status === "suspended"
        ) {
            return res.status(403).json({
                message: "Your account has been suspended. Please contact the administrator."
            });
        }

        if (
            role === "student" &&
            !user.email_verified
        ) {
            return res.status(403).json({
                message: "Please verify your email address before logging in.",
                emailVerificationRequired: true
            });
        }

        const JWT_SECRET = process.env.JWT_SECRET;

        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const sessionId = randomUUID();
        const sessionHours = role === "admin" ? 1 : 12;

        const expiresAt = new Date(
            Date.now() + sessionHours * 60 * 60 * 1000
        );

        const token = jwt.sign(
            {
                userId: user.user_id,
                email: user.email,
                role,
                sessionId
            },
            JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: `${sessionHours}h`
            }
        );

        await db.execute(
            `INSERT INTO user_sessions
                (session_id, user_id, expires_at)
             VALUES (?, ?, ?)`,
            [
                sessionId,
                user.user_id,
                toSqlDateTime(expiresAt)
            ]
        );

        return res.json({
            message: "Login successful.",
            token,
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                studentNumber: user.student_number,
                email: user.email,
                role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            message: "Server error while logging in."
        });
    }
});

// =============================
// RESEND VERIFICATION EMAIL
// POST /api/auth/resend-verification
// =============================

router.post("/resend-verification", resendLimiter, async (req, res) => {
    const genericMessage =
        "If this email belongs to an unverified account, a new verification link will be sent.";

    let connection;

    try {
        const { email } = req.body || {};

        if (
            typeof email !== "string" ||
            !email.trim() ||
            email.length > 150
        ) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const [users] = await db.execute(
            `SELECT user_id, full_name, email_verified, role
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [cleanEmail]
        );

        if (
            users.length === 0 ||
            users[0].role !== "student" ||
            users[0].email_verified
        ) {
            return res.json({ message: genericMessage });
        }

        const user = users[0];

        const {
            token,
            tokenHash,
            expiresAt
        } = generateVerificationToken();

        connection = await db.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            `DELETE FROM email_verification_tokens
             WHERE user_id = ?`,
            [user.user_id]
        );

        await connection.execute(
            `INSERT INTO email_verification_tokens
                (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [
                user.user_id,
                tokenHash,
                toSqlDateTime(expiresAt)
            ]
        );

        await connection.commit();
        connection.release();
        connection = null;

        try {
            await sendVerificationEmail(
                cleanEmail,
                user.full_name,
                token
            );
        } catch (emailError) {
            console.error(
                "RESEND VERIFICATION EMAIL ERROR:",
                emailError.message
            );
        }

        return res.json({ message: genericMessage });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "RESEND VERIFICATION ROLLBACK ERROR:",
                    rollbackError
                );
            }
        }

        console.error("RESEND VERIFICATION ERROR:", error);

        return res.status(500).json({
            message: "Unable to process your request right now."
        });

    } finally {
        if (connection) connection.release();
    }
});

// =============================
// GET CURRENT USER
// GET /api/auth/me
// =============================

router.get("/me", requireAuth, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT
                user_id,
                full_name,
                student_number,
                email,
                role,
                created_at,
                email_verified
             FROM users
             WHERE user_id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const user = users[0];

        return res.json({
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                studentNumber: user.student_number,
                email: user.email,
                role: user.role || "student",
                createdAt: user.created_at,
                emailVerified: Boolean(user.email_verified)
            }
        });

    } catch (error) {
        console.error("GET ME ERROR:", error);

        return res.status(500).json({
            message: "Unable to retrieve user profile."
        });
    }
});

// =============================
// LOGOUT
// POST /api/auth/logout
// =============================

router.post("/logout", requireAuth, async (req, res) => {
    try {
        const [result] = await db.execute(
            `UPDATE user_sessions
             SET revoked_at = UTC_TIMESTAMP()
             WHERE session_id = ?
               AND user_id = ?
               AND revoked_at IS NULL`,
            [
                req.user.sessionId,
                req.user.userId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(401).json({
                message: "Session already expired or revoked."
            });
        }

        return res.status(200).json({
            message: "Logged out successfully."
        });

    } catch (error) {
        console.error("LOGOUT ERROR:", error);

        return res.status(500).json({
            message: "Unable to log out. Please try again."
        });
    }
});

// =============================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =============================

const PASSWORD_RESET_MESSAGE =
    "If an eligible account exists for this email, a password reset link will be sent.";

router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
    let connection;

    try {
        const { email } = req.body || {};

        if (
            typeof email !== "string" ||
            email.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Lock account first to serialize reset requests.
        const [users] = await connection.execute(
            `SELECT
                user_id,
                full_name,
                email,
                role,
                email_verified,
                account_status
             FROM users
             WHERE email = ?
             LIMIT 1
             FOR UPDATE`,
            [cleanEmail]
        );

        if (
            users.length !== 1 ||
            users[0].role !== "student" ||
            !users[0].email_verified ||
            users[0].account_status !== "active"
        ) {
            await connection.rollback();

            return res.json({
                message: PASSWORD_RESET_MESSAGE
            });
        }

        const user = users[0];

        // Five-minute cooldown per account.
        const [recent] = await connection.execute(
            `SELECT token_id
             FROM password_reset_tokens
             WHERE user_id = ?
               AND created_at > UTC_TIMESTAMP() - INTERVAL 5 MINUTE
             LIMIT 1`,
            [user.user_id]
        );

        if (recent.length > 0) {
            await connection.rollback();

            return res.json({
                message: PASSWORD_RESET_MESSAGE
            });
        }

        const token = randomBytes(32).toString("hex");

        const tokenHash = createHash("sha256")
            .update(token)
            .digest("hex");

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Invalidate previous reset tokens.
        await connection.execute(
            `UPDATE password_reset_tokens
             SET used_at = UTC_TIMESTAMP()
             WHERE user_id = ?
               AND used_at IS NULL`,
            [user.user_id]
        );

        await connection.execute(
            `INSERT INTO password_reset_tokens
                (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [
                user.user_id,
                tokenHash,
                toSqlDateTime(expiresAt)
            ]
        );

        await connection.commit();
        connection.release();
        connection = null;

        try {
            await sendPasswordResetEmail(
                user.email,
                user.full_name,
                token
            );
        } catch (emailError) {
            console.error(
                "PASSWORD RESET EMAIL ERROR:",
                emailError.message
            );
        }

        return res.json({
            message: PASSWORD_RESET_MESSAGE
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "FORGOT PASSWORD ROLLBACK ERROR:",
                    rollbackError
                );
            }
        }

        console.error("FORGOT PASSWORD ERROR:", error);

        return res.status(500).json({
            message: "Unable to process your request right now."
        });

    } finally {
        if (connection) connection.release();
    }
});

// =============================
// RESET PASSWORD
// POST /api/auth/reset-password
// =============================

router.post("/reset-password", passwordResetLimiter, async (req, res) => {
    let connection;

    try {
        const { token, password } = req.body || {};

        if (
            typeof token !== "string" ||
            !/^[a-f0-9]{64}$/.test(token)
        ) {
            return res.status(400).json({
                message: "Invalid password reset link."
            });
        }

        const passwordError = validatePassword(password);

        if (passwordError) {
            return res.status(400).json({
                message: passwordError
            });
        }

        const tokenHash = createHash("sha256")
            .update(token)
            .digest("hex");

        const newPasswordHash = await bcrypt.hash(password, 10);

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Identify account without locking token rows first.
        const [candidate] = await connection.execute(
            `SELECT user_id
             FROM password_reset_tokens
             WHERE token_hash = ?
             LIMIT 1`,
            [tokenHash]
        );

        if (candidate.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "This reset link is invalid, expired or already used."
            });
        }

        // Lock account before reset token.
        const [accounts] = await connection.execute(
            `SELECT user_id
             FROM users
             WHERE user_id = ?
               AND role = 'student'
               AND email_verified = 1
               AND account_status = 'active'
             FOR UPDATE`,
            [candidate[0].user_id]
        );

        if (accounts.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "This reset link is invalid, expired or already used."
            });
        }

        // Token must still be valid after acquiring the account lock.
        const [tokens] = await connection.execute(
            `SELECT token_id
             FROM password_reset_tokens
             WHERE token_hash = ?
               AND user_id = ?
               AND used_at IS NULL
               AND expires_at > UTC_TIMESTAMP()
             FOR UPDATE`,
            [tokenHash, candidate[0].user_id]
        );

        if (tokens.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "This reset link is invalid, expired or already used."
            });
        }

        await connection.execute(
            `UPDATE users
             SET password_hash = ?
             WHERE user_id = ?`,
            [newPasswordHash, candidate[0].user_id]
        );

        // Invalidate all outstanding reset links.
        await connection.execute(
            `UPDATE password_reset_tokens
             SET used_at = UTC_TIMESTAMP()
             WHERE user_id = ?
               AND used_at IS NULL`,
            [candidate[0].user_id]
        );

        // Revoke every existing login session.
        await connection.execute(
            `UPDATE user_sessions
             SET revoked_at = UTC_TIMESTAMP()
             WHERE user_id = ?
               AND revoked_at IS NULL`,
            [candidate[0].user_id]
        );

        await connection.commit();

        return res.status(200).json({
            message: "Password reset successfully. Please log in again."
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "RESET PASSWORD ROLLBACK ERROR:",
                    rollbackError
                );
            }
        }

        console.error("RESET PASSWORD ERROR:", error);

        return res.status(500).json({
            message: "Unable to reset password. Please try again."
        });

    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
