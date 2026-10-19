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
    // For local testing, use http://localhost:5000.
    const API_BASE_URL = "http://localhost:5000";

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