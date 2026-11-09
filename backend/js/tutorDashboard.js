(function () {
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }

    function loadDashboard(tutor) {
        const overview = window.CampusSyncLocal.getTutorOverview(tutor.id);
        const totalTasks = overview.tasks.length;
        document.getElementById("tutorStudentCount").textContent = overview.students.length;
        document.getElementById("tutorTaskCount").textContent = totalTasks;
        document.getElementById("tutorCompletedCount").textContent = overview.completedTasks;
        document.getElementById("tutorCompletionRate").textContent = `${overview.completionRate}%`;

        document.getElementById("assignedStudents").innerHTML = overview.students.length
            ? overview.students.map(student =>
                `<tr><td><strong>${escapeHtml(student.fullName)}</strong></td><td>${escapeHtml(student.email)}</td><td>${student.totalTasks}</td><td>${student.completedTasks}</td></tr>`
            ).join("")
            : '<tr><td colspan="4">No students are assigned to your tutor account yet.</td></tr>';

        document.getElementById("recentStudentTasks").innerHTML = overview.recentTasks.length
            ? overview.recentTasks.map(task => `
                <div class="role-list-item">
                    <div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.studentName)} · Due ${escapeHtml(task.dueDate || "No date")}</small></div>
                    <span class="status-pill ${task.status === "completed" ? "success" : task.priority === "high" ? "warning" : "info"}">${escapeHtml(task.status === "completed" ? "Complete" : task.priority)}</span>
                </div>`).join("")
            : "<p>No tasks from assigned students yet.</p>";

        document.getElementById("tutorTaskHint").textContent = overview.students.length
            ? "Progress here reflects only students assigned to your tutor account."
            : "An administrator can assign students from the Admin workspace.";
    }

    document.addEventListener("campussync:role-ready", event => {
        document.getElementById("staffName").textContent = event.detail.fullName;
        loadDashboard(event.detail);
    });

    document.querySelector("[data-logout]").addEventListener("click", () => {
        window.CampusSyncLocal.removeCurrentUser();
        window.location.replace("tutor-login.html");
    });
})();
