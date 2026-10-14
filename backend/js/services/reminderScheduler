const db = require("../db");

let isRunning = false;

async function runReminderScheduler() {
    // Prevent overlapping scheduler runs
    if (isRunning) {
        return;
    }

    isRunning = true;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Find reminders that are due
        const [reminders] = await connection.execute(
            `SELECT reminder_id, user_id, task_id, message
             FROM reminders
             WHERE status = 'pending'
               AND remind_at <= NOW()
             ORDER BY remind_at ASC
             FOR UPDATE`
        );

        for (const reminder of reminders) {
            // Create an in-app notification
            await connection.execute(
                `INSERT INTO notifications
                    (user_id, reminder_id, title, message, is_read)
                 VALUES (?, ?, ?, ?, FALSE)`,
                [
                    reminder.user_id,
                    reminder.reminder_id,
                    "CampusSync Reminder",
                    reminder.message
                ]
            );

            // Mark the reminder as sent
            await connection.execute(
                `UPDATE reminders
                 SET status = 'sent'
                 WHERE reminder_id = ?
                   AND status = 'pending'`,
                [reminder.reminder_id]
            );
        }

        await connection.commit();

        if (reminders.length > 0) {
            console.log(
                `Reminder scheduler: processed ${reminders.length} reminder(s).`
            );
        }
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Reminder rollback failed:", rollbackError.message);
            }
        }

        console.error("Reminder scheduler error:", error.message);
    } finally {
        if (connection) {
            connection.release();
        }

        isRunning = false;
    }
}

module.exports = runReminderScheduler;