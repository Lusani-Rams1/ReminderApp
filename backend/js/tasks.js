    function openModal() {
        document.getElementById("assignmentModal").style.display = "flex";
    }

    function closeModal() {
        document.getElementById("assignmentModal").style.display = "none";
    }


    
async function addTask(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const name = document.getElementById("assignmentName").value.trim();
    const module = document.getElementById("assignmentModule").value.trim();
    const date = document.getElementById("assignmentDate").value;
    const description = document.getElementById("assignmentDescription").value.trim();

    if (!name || !date) {
        alert("Please enter an assignment name and due date.");
        return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Your session has expired. Please log in again.");
        return;
    }

    // Use your deployed backend URL here when available.
    // For local testing, use https://reminderapp-production-36c1.up.railway.app.
    const API_BASE_URL = "https://reminderapp-production-36c1.up.railway.app";

    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                title: name,
                description: [module, description]
                    .filter(Boolean)
                    .join(" — "),
                dueDate: date,
                priority: "medium"
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to save task.");
        }

        alert("Assignment saved successfully!");

        form.reset();

        if (typeof closeModal === "function") {
            closeModal();
        }

        // Reload from the database instead of creating a temporary card.
        if (typeof loadTasks === "function") {
            await loadTasks();
        } else {
            window.location.reload();
        }

    } catch (error) {
        console.error("Error saving assignment:", error);
        alert("Could not save assignment: " + error.message);
    }
}


async function addTask(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const name = document.getElementById("assignmentName").value.trim();
    const module = document.getElementById("assignmentModule").value.trim();
    const date = document.getElementById("assignmentDate").value;
    const description = document.getElementById("assignmentDescription").value.trim();
    const reminderAt = document.getElementById("reminderDateTime").value;

    if (!name || !date) {
        alert("Please enter an assignment name and due date.");
        return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Your session has expired. Please log in again.");
        return;
    }

    // Validate an optional reminder before creating the task.
    if (reminderAt) {
        const reminderDate = new Date(reminderAt);
        const dueDate = new Date(`${date}T23:59:59`);

        if (Number.isNaN(reminderDate.getTime())) {
            alert("Please select a valid reminder date and time.");
            return;
        }

        if (reminderDate <= new Date()) {
            alert("The reminder must be set for a future time.");
            return;
        }

        if (reminderDate > dueDate) {
            alert("Choose a reminder time before the assignment deadline.");
            return;
        }
    }

    const API_BASE_URL = "https://reminderapp-production-36c1.up.railway.app";

    try {
        // First, save the assignment.
        const taskResponse = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                title: name,
                description: [module, description]
                    .filter(Boolean)
                    .join(" — "),
                dueDate: date,
                priority: "medium"
            })
        });

        const taskResult = await taskResponse.json();

        if (!taskResponse.ok) {
            throw new Error(
                taskResult.message || "Failed to save assignment."
            );
        }

        // Only create a reminder if the student selected a time.
        if (reminderAt) {
            const taskId = taskResult.taskId ?? taskResult.task_id;

            if (!taskId) {
                alert(
                    "Assignment saved, but the server did not return its ID. " +
                    "The reminder was not created."
                );

                form.reset();

                if (typeof closeModal === "function") closeModal();
                await loadTasks();
                return;
            }

            try {
                const reminderResponse = await fetch(
                    `${API_BASE_URL}/api/reminders`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            message: `Reminder: ${name}${module ? ` (${module})` : ""} is due on ${date}.`,
                            remindAt: reminderAt,
                            taskId: taskId
                        })
                    }
                );

                const reminderResult = await reminderResponse.json();

                if (!reminderResponse.ok) {
                    throw new Error(
                        reminderResult.message || "Could not create reminder."
                    );
                }

                alert("Assignment and reminder saved successfully!");

            } catch (reminderError) {
                console.error("Reminder creation failed:", reminderError);

                // The assignment was already saved; don't imply otherwise.
                alert(
                    "Assignment saved successfully, but the reminder could not " +
                    "be created: " + reminderError.message
                );
            }
        } else {
            alert("Assignment saved successfully!");
        }

        form.reset();

        if (typeof closeModal === "function") {
            closeModal();
        }

        if (typeof loadTasks === "function") {
            await loadTasks();
        } else {
            window.location.reload();
        }

    } catch (error) {
        console.error("Error saving assignment:", error);
        alert("Could not save assignment: " + error.message);
    }
}

    function completeTask(button) {

        const card =
            button.closest(".task-card");

        card.dataset.status = "completed";

        card.classList.add("completed");

        button.textContent = "Completed";

        button.disabled = true;

    }


    function deleteTask(button) {

        const card =
            button.closest(".task-card");

        if (confirm("Delete this assignment?")) {

            card.remove();

        }

    }


    function filterTasks(filter, button) {

        document
            .querySelectorAll(".filter-btn")
            .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");


        document
            .querySelectorAll(".task-card")
            .forEach(card => {

                if (
                    filter === "all" ||
                    card.dataset.status === filter
                ) {

                    card.style.display = "block";

                } else {

                    card.style.display = "none";

                }

            });

    }

    window.onclick = function(event) {

        const modal =
            document.getElementById("assignmentModal");

        if (event.target === modal) {

            closeModal();

        }

    };

    async function loadTasks() {
    const API_BASE_URL = "https://reminderapp-production-36c1.up.railway.app";
    const token = localStorage.getItem("token");
    const container = document.getElementById("taskContainer");

    if (!container) {
        console.error("Task container not found.");
        return;
    }

    if (!token) {
        console.error("No authentication token found.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Failed to load assignments."
            );
        }

        if (!Array.isArray(result.tasks)) {
            throw new Error("The server returned an unexpected task format.");
        }

        // Remove old cards before displaying database records.
        container.innerHTML = "";

        result.tasks.forEach(task => {
            const card = document.createElement("div");
            card.className = "task-card";
            card.dataset.status = task.status || "pending";

            const dueDate = task.due_date
                ? new Date(task.due_date).toLocaleDateString("en-GB")
                : "No due date";

            const title = document.createElement("div");
            title.className = "task-title";
            title.textContent = task.title;

            const description = document.createElement("p");
            description.className = "task-description";
            description.textContent = task.description || "";

            const date = document.createElement("div");
            date.className = "due-date";
            date.textContent = `Due: ${dueDate}`;

            const actions = document.createElement("div");
            actions.className = "task-actions";

            const completeButton = document.createElement("button");
            completeButton.className = "complete-btn";
            completeButton.textContent =
                task.status === "completed"
                    ? "Completed"
                    : "Mark Complete";

            completeButton.disabled = task.status === "completed";

            completeButton.addEventListener("click", async () => {
                try {
                    const update = await fetch(
                        `${API_BASE_URL}/api/tasks/${task.task_id}`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                status: "completed"
                            })
                        }
                    );

                    const data = await update.json();

                    if (!update.ok) {
                        throw new Error(
                            data.message || "Could not complete assignment."
                        );
                    }

                    await loadTasks();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-btn";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", async () => {
                if (!confirm("Delete this assignment?")) return;

                try {
                    const deletion = await fetch(
                        `${API_BASE_URL}/api/tasks/${task.task_id}`,
                        {
                            method: "DELETE",
                            headers: {
                                "Authorization": `Bearer ${token}`
                            }
                        }
                    );

                    const data = await deletion.json();

                    if (!deletion.ok) {
                        throw new Error(
                            data.message || "Could not delete assignment."
                        );
                    }

                    await loadTasks();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });

            actions.append(completeButton, deleteButton);
            card.append(title, description, date, actions);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading assignments:", error);
        alert("Could not load assignments: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", loadTasks);