
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

// GET /api/tasks - list my tasks
router.get("/", async (req, res) => {
    try {
        const [tasks] = await db.execute(
            `SELECT t.*, c.category_name
             FROM tasks t
             LEFT JOIN categories c ON c.category_id = t.category_id
             WHERE t.user_id = ?
             ORDER BY t.due_date IS NULL, t.due_date ASC`,
            [req.user.userId]
        );

        res.json({ tasks });
    } catch (error) {
        console.error("GET TASKS:", error);
        res.status(500).json({ message: "Unable to load tasks." });
    }
});

// POST /api/tasks - create a task
router.post("/", async (req, res) => {
    try {
        const {
            title,
            description = "",
            dueDate = null,
            priority = "medium",
            categoryId = null
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Task title is required."
            });
        }

        if (!["low", "medium", "high"].includes(priority)) {
            return res.status(400).json({
                message: "Priority must be low, medium, or high."
            });
        }

        if (dueDate && Number.isNaN(Date.parse(dueDate))) {
            return res.status(400).json({
                message: "Please provide a valid due date."
            });
        }

        if (categoryId != null) {
            const [categories] = await db.execute(
                `SELECT category_id FROM categories
                 WHERE category_id = ? AND user_id = ?`,
                [categoryId, req.user.userId]
            );

            if (categories.length === 0) {
                return res.status(400).json({
                    message: "Invalid category."
                });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO tasks
             (user_id, category_id, title, description, due_date, priority)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.user.userId,
                categoryId,
                title.trim(),
                description,
                dueDate ? dueDate.replace("T", " ") : null,
                priority
            ]
        );

        res.status(201).json({
            message: "Task created successfully.",
            taskId: result.insertId
        });
    } catch (error) {
        console.error("CREATE TASK:", error);
        res.status(500).json({ message: "Unable to create task." });
    }
});

// PATCH /api/tasks/:id - update a task
router.patch("/:id", async (req, res) => {
    try {
        const taskId = Number(req.params.id);

        if (!Number.isInteger(taskId) || taskId < 1) {
            return res.status(400).json({ message: "Invalid task ID." });
        }

        const allowed = {
            title: "title",
            description: "description",
            dueDate: "due_date",
            priority: "priority",
            status: "status",
            categoryId: "category_id"
        };

        const updates = [];
        const values = [];

        for (const [key, column] of Object.entries(allowed)) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                let value = req.body[key];

                if (key === "title" && (!value || !value.trim())) {
                    return res.status(400).json({
                        message: "Task title cannot be empty."
                    });
                }

                if (
                    key === "priority" &&
                    !["low", "medium", "high"].includes(value)
                ) {
                    return res.status(400).json({
                        message: "Invalid priority."
                    });
                }

                if (
                    key === "status" &&
                    !["pending", "in_progress", "completed"].includes(value)
                ) {
                    return res.status(400).json({
                        message: "Invalid task status."
                    });
                }

                if (key === "title") value = value.trim();
                if (key === "dueDate" && value) value = value.replace("T", " ");
                if (key === "dueDate" && !value) value = null;

                if (key === "categoryId" && value != null) {
                    const [categories] = await db.execute(
                        `SELECT category_id FROM categories
                         WHERE category_id = ? AND user_id = ?`,
                        [value, req.user.userId]
                    );

                    if (!categories.length) {
                        return res.status(400).json({
                            message: "Invalid category."
                        });
                    }
                }

                updates.push(`${column} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                message: "No valid fields provided to update."
            });
        }

        values.push(taskId, req.user.userId);

        const [result] = await db.execute(
            `UPDATE tasks SET ${updates.join(", ")}
             WHERE task_id = ? AND user_id = ?`,
            values
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Task not found."
            });
        }

        res.json({ message: "Task updated successfully." });
    } catch (error) {
        console.error("UPDATE TASK:", error);
        res.status(500).json({ message: "Unable to update task." });
    }
});

// DELETE /api/tasks/:id - delete a task
router.delete("/:id", async (req, res) => {
    try {
        const taskId = Number(req.params.id);

        if (!Number.isInteger(taskId) || taskId < 1) {
            return res.status(400).json({ message: "Invalid task ID." });
        }

        const [result] = await db.execute(
            "DELETE FROM tasks WHERE task_id = ? AND user_id = ?",
            [taskId, req.user.userId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Task not found."
            });
        }

        res.json({ message: "Task deleted successfully." });
    } catch (error) {
        console.error("DELETE TASK:", error);
        res.status(500).json({ message: "Unable to delete task." });
    }
});

module.exports = router;
