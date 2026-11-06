-- Run this migration against the campussync_db database once.
-- It is safe to run more than once.
USE campussync_db;

CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT NOT NULL,
    theme ENUM('light', 'dark') NOT NULL DEFAULT 'light',
    language ENUM('english', 'zulu') NOT NULL DEFAULT 'english',
    assignment_alerts TINYINT(1) NOT NULL DEFAULT 1,
    class_reminders TINYINT(1) NOT NULL DEFAULT 1,
    announcements TINYINT(1) NOT NULL DEFAULT 1,
    offline_mode TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;
