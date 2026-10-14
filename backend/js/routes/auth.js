const authenticateToken = require("../middleware/auth");
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
        const {
            fullName,
            studentNumber,
            email,
            password
        } = req.body;

        // Validate fields
        if (!fullName || !studentNumber || !email || !password) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        // Check if email already exists
        const [existingEmail] = await db.execute(
            "SELECT user_id FROM users WHERE email = ?",
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                message: "An account with that email already exists."
            });
        }

        // Check if student number already exists
        const [existingStudent] = await db.execute(
            "SELECT user_id FROM users WHERE student_number = ?",
            [studentNumber]
        );

        if (existingStudent.length > 0) {
            return res.status(409).json({
                message: "That student number is already registered."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.execute(
            `INSERT INTO users
            (full_name, student_number, email, password_hash)
            VALUES (?, ?, ?, ?)`,
            [
                fullName,
                studentNumber,
                email,
                passwordHash
            ]
        );

        // Generate JWT
        const token = jwt.sign(
            {
                userId: result.insertId,
                email: email
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(201).json({
            message: "Account created successfully.",
            token,
            user: {
                userId: result.insertId,
                fullName,
                studentNumber,
                email
            }
        });

    } catch (error) {

        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            message: "Server error while creating account."
        });
    }
});

// LOGIN
// POST /api/auth/login

router.post("/login", async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;

        // Validate
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        // Find user
        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.user_id,
                email: user.email
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
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

        res.status(500).json({
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

        res.json({
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

        res.status(500).json({
            message: "Unable to retrieve user profile."
        });
    }
});

module.exports = router;
