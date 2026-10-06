    function openModal() {
        document.getElementById("assignmentModal").style.display = "flex";
    }

    function closeModal() {
        document.getElementById("assignmentModal").style.display = "none";
    }


    function addTask(event) {

        event.preventDefault();

        const name =
            document.getElementById("assignmentName").value;

        const module =
            document.getElementById("assignmentModule").value;

        const date =
            document.getElementById("assignmentDate").value;

        const description =
            document.getElementById("assignmentDescription").value;


        const formattedDate =
            new Date(date).toLocaleDateString(
                "en-GB",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );


        const card =
            document.createElement("div");

        card.className = "task-card";

        card.dataset.status = "pending";

        card.innerHTML = `

            <div class="task-top">

                <div>

                    <div class="task-title">
                        ${name}
                    </div>

                    <div class="module">
                        ${module}
                    </div>

                </div>

            </div>

            <p class="task-description">
                ${description}
            </p>

            <div class="due-date">
                Due: ${formattedDate}
            </div>

            <div class="task-actions">

                <button class="complete-btn"
                        onclick="completeTask(this)">
                    Mark Complete
                </button>

                <button class="delete-btn"
                        onclick="deleteTask(this)">
                    Delete
                </button>

            </div>

        `;


        document
            .getElementById("taskContainer")
            .appendChild(card);


        event.target.reset();

        closeModal();

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