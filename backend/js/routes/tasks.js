const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Convert browser datetime-local values and ISO timestamps to MariaDB DATETIME.
// ISO timestamps with a timezone are normalized to UTC; milliseconds/timezone
// suffixes are not included because MariaDB DATETIME does not store them.
function toSqlDateTime(value) {
    if (typeof value !== "string" || !value.trim()) return null;

    const input = value.trim();
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(input)) {
        const date = new Date(input);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 19).replace("T", " ");
    }

    const normalized = input.replace("T", " ");
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized + " 00:00:00";
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
        return normalized + ":00";
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) {
        return normalized.slice(0, 19);
    }
    return null;
}

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

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "Task title is required as text." });
        }
        if (typeof description !== "string") {
            return res.status(400).json({ message: "Task description must be text." });
        }
        if (!["low", "medium", "high"].includes(priority)) {
            return res.status(400).json({ message: "Priority must be low, medium, or high." });
        }

        let sqlDueDate = null;
        if (dueDate !== null && dueDate !== "") {
            if (typeof dueDate !== "string") {
                return res.status(400).json({ message: "Due date must be a date/time string." });
            }
            sqlDueDate = toSqlDateTime(dueDate);
            if (!sqlDueDate) {
                return res.status(400).json({ message: "Please provide a valid due date." });
            }
        }

        if (categoryId != null) {
            const [categories] = await db.execute(
                `SELECT category_id FROM categories
                 WHERE category_id = ? AND user_id = ?`,
                [categoryId, req.user.userId]
            );
            if (!categories.length) {
                return res.status(400).json({ message: "Invalid category." });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO tasks
             (user_id, category_id, title, description, due_date, priority)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.userId, categoryId, title.trim(), description, sqlDueDate, priority]
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
            if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue;
            let value = req.body[key];

            if (key === "title") {
                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({ message: "Task title must be non-empty text." });
                }
                value = value.trim();
            }
            if (key === "description" && typeof value !== "string" && value !== null) {
                return res.status(400).json({ message: "Task description must be text or null." });
            }
            if (key === "priority" && !["low", "medium", "high"].includes(value)) {
                return res.status(400).json({ message: "Invalid priority." });
            }
            if (key === "status" && !["pending", "in_progress", "completed"].includes(value)) {
                return res.status(400).json({ message: "Invalid task status." });
            }
            if (key === "dueDate") {
                if (value === null || value === "") {
                    value = null;
                } else {
                    if (typeof value !== "string") {
                        return res.status(400).json({ message: "Due date must be a date/time string or null." });
                    }
                    value = toSqlDateTime(value);
                    if (!value) {
                        return res.status(400).json({ message: "Please provide a valid due date." });
                    }
                }
            }
            if (key === "categoryId" && value != null) {
                const [categories] = await db.execute(
                    `SELECT category_id FROM categories
                     WHERE category_id = ? AND user_id = ?`,
                    [value, req.user.userId]
                );
                if (!categories.length) {
                    return res.status(400).json({ message: "Invalid category." });
                }
            }

            updates.push(`${column} = ?`);
            values.push(value);
        }

        if (!updates.length) {
            return res.status(400).json({ message: "No valid fields provided to update." });
        }

        values.push(taskId, req.user.userId);
        const [result] = await db.execute(
            `UPDATE tasks SET ${updates.join(", ")}
             WHERE task_id = ? AND user_id = ?`,
            values
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Task not found." });
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
            return res.status(404).json({ message: "Task not found." });
        }
        res.json({ message: "Task deleted successfully." });
    } catch (error) {
        console.error("DELETE TASK:", error);
        res.status(500).json({ message: "Unable to delete task." });
    }
});

module.exports = router;
