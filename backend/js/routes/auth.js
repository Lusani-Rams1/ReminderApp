const { requireAuth } = require("../middleware/auth");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// REGISTER
// POST /api/auth/register
router.post("/register", async (req, res) => {
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

        const cleanFullName = fullName.trim();
        const cleanStudentNumber = studentNumber.trim();
        const cleanEmail = email.trim();

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
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

        const [existingStudent] = await db.execute(
            "SELECT user_id FROM users WHERE student_number = ?",
            [cleanStudentNumber]
        );
        if (existingStudent.length > 0) {
            return res.status(409).json({
                message: "That student number is already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // The unique indexes are the final protection against simultaneous signups.
        const [result] = await db.execute(
            `INSERT INTO users (full_name, student_number, email, password_hash)
             VALUES (?, ?, ?, ?)`,
            [cleanFullName, cleanStudentNumber, cleanEmail, passwordHash]
        );

        const token = jwt.sign(
            { userId: result.insertId, email: cleanEmail },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            message: "Account created successfully.",
            token,
            user: {
                userId: result.insertId,
                fullName: cleanFullName,
                studentNumber: cleanStudentNumber,
                email: cleanEmail
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

// LOGIN
// POST /api/auth/login
router.post("/login", async (req, res) => {
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
        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [cleanEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { userId: user.user_id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            message: "Login successful.",
            token,
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                studentNumber: user.student_number,
                email: user.email
            }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(500).json({
            message: "Server error while logging in."
        });
    }
});

// GET CURRENT USER
// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT user_id, full_name, student_number, email, created_at
             FROM users WHERE user_id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = users[0];
        return res.json({
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                studentNumber: user.student_number,
                email: user.email,
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
