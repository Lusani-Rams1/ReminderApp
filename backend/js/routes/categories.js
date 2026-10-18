const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/categories - list categories belonging to the signed-in user
router.get("/", async (req, res) => {
    try {
        const [categories] = await db.execute(
            `SELECT category_id, category_name, created_at
             FROM categories
             WHERE user_id = ?
             ORDER BY category_name ASC`,
            [req.user.userId]
        );
        res.json({ categories });
    } catch (error) {
        console.error("GET CATEGORIES:", error);
        res.status(500).json({ message: "Unable to load categories." });
    }
});

// POST /api/categories - create a category
router.post("/", async (req, res) => {
    try {
        const { categoryName } = req.body;

        if (typeof categoryName !== "string" || !categoryName.trim()) {
            return res.status(400).json({
                message: "Category name is required and must be text."
            });
        }

        const name = categoryName.trim();
        if (name.length > 100) {
            return res.status(400).json({
                message: "Category name must be 100 characters or fewer."
            });
        }

        const [result] = await db.execute(
            "INSERT INTO categories (user_id, category_name) VALUES (?, ?)",
            [req.user.userId, name]
        );

        res.status(201).json({
            message: "Category created successfully.",
            category: {
                categoryId: result.insertId,
                categoryName: name
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "You already have a category with that name."
            });
        }
        console.error("CREATE CATEGORY:", error);
        res.status(500).json({ message: "Unable to create category." });
    }
});

// DELETE /api/categories/:id - delete a category owned by the signed-in user
router.delete("/:id", async (req, res) => {
    try {
        const categoryId = Number(req.params.id);
        if (!Number.isInteger(categoryId) || categoryId < 1) {
            return res.status(400).json({ message: "Invalid category ID." });
        }

        const [result] = await db.execute(
            "DELETE FROM categories WHERE category_id = ? AND user_id = ?",
            [categoryId, req.user.userId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.json({ message: "Category deleted successfully." });
    } catch (error) {
        console.error("DELETE CATEGORY:", error);
        res.status(500).json({ message: "Unable to delete category." });
    }
});

module.exports = router;
