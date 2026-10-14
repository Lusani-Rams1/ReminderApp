
const db = require("../db");

async function runReminderScheduler() {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [dueReminders] = await connection.execute(
            `SELECT reminder_id, user_id, message
             FROM reminders
             WHERE status = 'pending'
               AND remind_at <= NOW()
             FOR UPDATE`
        );

        for (const reminder of dueReminders) {
            await connection.execute(
                `INSERT INTO notifications
                 (user_id, reminder_id, title, message)
                 VALUES (?, ?, ?, ?)`,
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
                 WHERE reminder_id = ? AND status = 'pending'`,
                [reminder.reminder_id]
            );
        }

        await connection.commit();

        if (dueReminders.length > 0) {
            console.log(
                `Processed ${dueReminders.length} due reminder(s).`
            );
        }
    } catch (error) {
        await connection.rollback();
        console.error("REMINDER SCHEDULER ERROR:", error);
    } finally {
        connection.release();
    }
}

module.exports = runReminderScheduler;
