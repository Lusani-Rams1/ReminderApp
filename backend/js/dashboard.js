
const API_BASE_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", () => {
    loadUpcomingSubmission();
});

async function loadUpcomingSubmission() {
    const card = document.getElementById("upcoming-submissions");

    if (!card) return;

    const token = localStorage.getItem("token");

    if (!token) {
        card.textContent = "Please log in to view upcoming submissions.";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            card.textContent = "Your session has expired. Please log in again.";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load tasks.");
        }

        const data = await response.json();
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];

        const now = new Date();

        const upcomingTasks = tasks
            .filter(task =>
                task.due_date &&
                task.status !== "completed" &&
                new Date(task.due_date) >= now
            )
            .sort((a, b) =>
                new Date(a.due_date) - new Date(b.due_date)
            );

        const nextTask = upcomingTasks[0];

        if (!nextTask) {
            card.textContent = "No upcoming submissions.";
            return;
        }

        const dueDate = new Date(nextTask.due_date);

        card.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = "Upcoming submission";

        const taskTitle = document.createElement("p");
        taskTitle.textContent = nextTask.title;

        const dueText = document.createElement("p");
        dueText.textContent = `Due: ${dueDate.toLocaleString()}`;

        card.append(heading, taskTitle, dueText);

    } catch (error) {
        console.error("Dashboard task error:", error);
        card.textContent = "Unable to load submissions. Check that the API server is running.";
    }
}
