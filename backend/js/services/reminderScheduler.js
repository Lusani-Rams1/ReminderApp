
const db = require("../db");

let isRunning = false;

async function runReminderScheduler() {
    if (isRunning) {
        return;
    }

    isRunning = true;
    let connection;
    let transactionStarted = false;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [reminders] = await connection.execute(
            `SELECT reminder_id, user_id, task_id, message
             FROM reminders
             WHERE status = 'pending'
               AND remind_at <= NOW()
             ORDER BY remind_at ASC
             FOR UPDATE`
        );

        for (const reminder of reminders) {
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

            await connection.execute(
                `UPDATE reminders
                 SET status = 'sent'
                 WHERE reminder_id = ?
                   AND status = 'pending'`,
                [reminder.reminder_id]
            );
        }

        await connection.commit();
        transactionStarted = false;

        if (reminders.length > 0) {
            console.log(
                `Reminder scheduler: processed ${reminders.length} reminder(s).`
            );
        }
    } catch (error) {
        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Reminder rollback failed:",
                    rollbackError
                );
            }
        }

        console.error("Reminder scheduler failed:", {
            message: error?.message,
            code: error?.code,
            errno: error?.errno,
            sqlMessage: error?.sqlMessage,
            stack: error?.stack
        });
    } finally {
        if (connection) {
            connection.release();
        }

        isRunning = false;
    }
}

module.exports = runReminderScheduler;
