# ReminderApp (CampusSync)

ReminderApp is an academic productivity web app for students. It keeps assignments, deadlines, reminders, notes, GPA tracking, and your schedule in one place, with account-based settings that follow you across devices.

## Features

- **Accounts** — register, log in, and stay signed in with JWT authentication
- **Dashboard** — overview of upcoming work and study progress
- **Tasks / Assignments** — add, edit, complete, delete, and categorise academic tasks
- **Reminders** — schedule reminders for tasks, with a background scheduler that creates notifications
- **Notifications** — in-app notification centre with read/unread state
- **Schedule and Calendar** — timetable and calendar views
- **Notes** — write and manage study notes
- **GPA Calculator** — calculate your GPA from course marks and credits
- **Settings and Themes** — preferences and theme saved to your account and applied across all pages
- **Help pages** — About, FAQ, Help Center, Contact, and Privacy

## Tech Stack

**Front end:** HTML, CSS, vanilla JavaScript

**Back end:** Node.js, Express 5, MySQL (`mysql2`), JWT (`jsonwebtoken`), `bcryptjs`, `cors`, `dotenv`

**Hosting:** front end on GitHub Pages (see `.github/workflows/static.yml`), API on Railway

## Project Structure

```
ReminderApp/
├── *.html                  # Front-end pages (index, login, register, dashboard, tasks, notes, gpa, ...)
├── CSS/                    # Page stylesheets
├── backend/js/
│   ├── server.js           # Express entry point
│   ├── db.js               # MySQL connection
│   ├── middleware/auth.js  # JWT auth middleware
│   ├── routes/             # auth, tasks, categories, reminders, notifications, settings, schedule
│   ├── services/reminderScheduler.js
│   └── *.js                # Front-end scripts (login, tasks, dashboard, theme, settings, ...)
├── database/
│   ├── schema.sql          # Tables: users, categories, tasks, reminders, notifications, user_settings
│   └── migrations/         # Incremental SQL changes
├── postman/ .postman/      # Postman workspace files
└── .github/workflows/      # GitHub Pages deployment
```

## API Overview

All routes except register and login require a `Bearer` token in the `Authorization` header.

| Route | Methods |
|---|---|
| `/api/auth` | `POST /register`, `POST /login`, `GET /me` |
| `/api/tasks` | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `/api/categories` | `GET /`, `POST /`, `DELETE /:id` |
| `/api/reminders` | `GET /`, `POST /`, `PATCH /:id/cancel`, `DELETE /:id` |
| `/api/notifications` | `GET /`, `PATCH /:id/read` |
| `/api/settings` | `GET /`, `PUT /` |

## Getting Started

### Prerequisites

- Node.js 18+
- A MySQL database

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Lusani-Rams1/ReminderApp.git
   cd ReminderApp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create the database tables by running `database/schema.sql`, then the files in `database/migrations/`.
4. Create a `.env` file in the project root:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=your_database
   JWT_SECRET=a_long_random_string
   ```
5. Start the server:
   ```bash
   node backend/js/server.js
   ```
   The API runs at `http://localhost:5000`.
6. Open `index.html` in your browser (or serve the folder with any static server).

### Pointing the front end at your own API

The front-end scripts use `window.API_BASE_URL` and fall back to the hosted Railway API. To use a local server, set `window.API_BASE_URL = "http://localhost:5000"` before the scripts load.

## Usage

1. Register an account and log in.
2. Add tasks and categories, and set reminders for deadlines.
3. Check the dashboard and notifications for what is coming up.
4. Use the GPA calculator and notes page for study tracking.
5. Change your theme and preferences in Settings; they sync to your account.

## Security Notes

- Never commit `.env`; it is already in `.gitignore`.
- Passwords are hashed with `bcryptjs`; sessions use signed JWTs.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
