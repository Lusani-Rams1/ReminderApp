
-- CampusSync Database Schema
-- Database: campussync_db

CREATE DATABASE IF NOT EXISTS campussync_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;

USE campussync_db;

-- USERS
CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    student_number VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_student_number (student_number),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;

-- CATEGORIES
CREATE TABLE categories (
    category_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (category_id),
    UNIQUE KEY uq_category_user_name (user_id, category_name),
    KEY idx_categories_user (user_id),

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;

-- TASKS
CREATE TABLE tasks (
    task_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT DEFAULT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT NULL,
    due_date DATETIME DEFAULT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (task_id),
    KEY idx_tasks_user (user_id),
    KEY idx_tasks_category (category_id),
    KEY idx_tasks_due_date (due_date),

    CONSTRAINT fk_tasks_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tasks_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;

-- REMINDERS
CREATE TABLE reminders (
    reminder_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    task_id INT DEFAULT NULL,
    message VARCHAR(255) NOT NULL,
    remind_at DATETIME NOT NULL,
    status ENUM('pending', 'sent', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (reminder_id),
    KEY idx_reminders_user (user_id),
    KEY idx_reminders_task (task_id),
    KEY idx_reminders_schedule (status, remind_at),

    CONSTRAINT fk_reminders_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reminders_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(task_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;

-- NOTIFICATIONS
CREATE TABLE notifications (
    notification_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    reminder_id INT DEFAULT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(255) NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (notification_id),
    KEY idx_notifications_user (user_id),
    KEY idx_notifications_reminder (reminder_id),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_reminder
        FOREIGN KEY (reminder_id)
        REFERENCES reminders(reminder_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;