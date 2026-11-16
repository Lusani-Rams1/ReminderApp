
const { rateLimit } = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const { randomUUID } = require("crypto");

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Convert a UTC Date into a MySQL DATETIME string.
function toSqlDateTime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

// LOGIN RATE LIMITER
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again in 15 minutes."
    }
});

// REGISTRATION RATE LIMITER
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many registration attempts. Please try again later."
    }
});

// =====================================================
// REGISTER STUDENT
// POST /api/auth/register
// =====================================================
router.post("/register", registerLimiter, async (req, res) => {
    try {
        const { fullName, studentNumber, email, password } = req.body;

        if (
            typeof fullName !== "string" || !fullName.trim() ||
            typeof studentNumber !== "string" || !studentNumber.trim() ||
            typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || !password
        ) {
            return res.status(400).json({
                message: "Full name, student number, email and password are required as text."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }

        const cleanFullName = fullName.trim();
        const cleanStudentNumber = studentNumber.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Check for an existing email.
        const [existingEmail] = await db.execute(
            "SELECT user_id FROM users WHERE email = ?",
            [cleanEmail]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                message: "An account with that email already exists."
            });
        }

        // Check for an existing student number.
        const [existingStudentNumber] = await db.execute(
            "SELECT user_id FROM users WHERE student_number = ?",
            [cleanStudentNumber]
        );

        if (existingStudentNumber.length > 0) {
            return res.status(409).json({
                message: "An account with that student number already exists."
            });
        }

        // Hash the password.
        const passwordHash = await bcrypt.hash(password, 10);

        // Create the student account.
        const [result] = await db.execute(
            `INSERT INTO users
                (full_name, student_number, email, password_hash, role)
             VALUES (?, ?, ?, ?, 'student')`,
            [
                cleanFullName,
                cleanStudentNumber,
                cleanEmail,
                passwordHash
            ]
        );

        // Create a session for the new student.
        const sessionId = randomUUID();
        const expiresAt = new Date(
            Date.now() + 12 * 60 * 60 * 1000
        );

        await db.execute(
            `INSERT INTO user_sessions
                (session_id, user_id, expires_at)
             VALUES (?, ?, ?)`,
            [
                sessionId,
                result.insertId,
                toSqlDateTime(expiresAt)
            ]
        );

        // Generate a JWT with the session ID.
        const token = jwt.sign(
            {
                userId: result.insertId,
                email: cleanEmail,
                role: "student",
                sessionId
            },
            JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: "12h"
            }
        );

        return res.status(201).json({
            message: "Account created successfully.",
            token,
            user: {
                userId: result.insertId,
                fullName: cleanFullName,
                studentNumber: cleanStudentNumber,
                email: cleanEmail,
                role: "student"
            }
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "An account with that email or student number already exists."
            });
        }

        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            message: "Server error while creating account."
        });
    }
});

// =====================================================
// LOGIN - STUDENT AND ADMIN
// POST /api/auth/login
// =====================================================
router.post("/login", loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || !password
        ) {
            return res.status(400).json({
                message: "Email and password are required as text."
            });
        }

        const cleanEmail = email.trim();

        // Find the account.
        const [users] = await db.execute(
            `SELECT
                user_id,
                full_name,
                student_number,
                email,
                password_hash,
                role,
                account_status
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

        // Verify the password.
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Prevent suspended students from logging in.
        if (
            user.role === "student" &&
            user.account_status === "suspended"
        ) {
            return res.status(403).json({
                message: "Your account has been suspended. Please contact the administrator."
            });
        }

        // Validate the role.
        const role = user.role || "student";

        if (!["student", "admin"].includes(role)) {
            return res.status(403).json({
                message: "This account has an unrecognised role. Please contact support."
            });
        }

        // Create a new session.
        const sessionId = randomUUID();

        // Admin: 1 hour
        // Student: 12 hours
        const sessionHours = role === "admin" ? 1 : 12;

        const expiresAt = new Date(
            Date.now() + sessionHours * 60 * 60 * 1000
        );

        // Save session in MySQL.
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

        // Generate JWT with sessionId.
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

        return res.status(200).json({
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

// =====================================================
// GET CURRENT AUTHENTICATED USER
// GET /api/auth/me
// =====================================================
router.get("/me", requireAuth, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT
                user_id,
                full_name,
                student_number,
                email,
                role,
                created_at
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
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error("GET ME ERROR:", error);

        return res.status(500).json({
            message: "Unable to retrieve user profile."
        });
    }
});

module.exports = router;
