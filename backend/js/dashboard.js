

document.addEventListener("DOMContentLoaded", () => {
    loadUpcomingSubmission();
});

async function loadUpcomingSubmission() {
    const card = document.getElementById("upcoming-submissions");

    if (!card) {
        console.error("Dashboard card #upcoming-submissions was not found.");
        return;
    }

    card.textContent = "Loading submissions...";

    try {
        const firebase = await window.CampusFirebase;
        await firebase.watchItems('tasks', records => renderUpcoming(records), error => { card.textContent = firebase.friendlyError(error); });
    } catch (error) { card.textContent = error.message; }
}
function renderUpcoming(records) {
    const card = document.getElementById('upcoming-submissions');
    try {
        const data = {tasks: records.map(task => ({...task, due_date: task.dueDate ? task.dueDate + 'T23:59:59' : null, status: task.status.toLowerCase()}))};
        const tasks = data.tasks
            .filter(task => task.due_date && task.status !== "completed")
            .map(task => ({
                ...task,
                parsedDueDate: new Date(task.due_date)
            }))
            .filter(task => !Number.isNaN(task.parsedDueDate.getTime()))
            .sort((a, b) => a.parsedDueDate - b.parsedDueDate);

        card.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = "Upcoming submission";
        card.appendChild(heading);

        if (tasks.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No incomplete submissions with due dates.";
            card.appendChild(message);
            return;
        }

        const nextTask = tasks[0];
        const now = new Date();
        const isOverdue = nextTask.parsedDueDate < now;

        const title = document.createElement("p");
        title.textContent = nextTask.title;

        const dueDate = document.createElement("p");
        dueDate.textContent =
            "Due: " + nextTask.parsedDueDate.toLocaleString();

        const status = document.createElement("p");
        status.textContent = isOverdue ? "Status: Overdue" : "Status: Upcoming";

        card.append(title, dueDate, status);

    } catch (error) {
        console.error("Dashboard submissions error:", error);
        card.textContent = "Unable to load submissions. Check the browser console.";
    }
}
