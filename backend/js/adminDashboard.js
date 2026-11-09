(function () {
    function showMessage(id, message) {
        document.getElementById(id).textContent = message;
    }

    function loadDashboard() {
        const overview = window.CampusSyncLocal.getAdminOverview();
        const allTasks = overview.tasks;
        const assignmentCount = overview.assignments.length;

        document.getElementById("studentCount").textContent = overview.students.length;
        document.getElementById("tutorCount").textContent = overview.tutors.length;
        document.getElementById("completedTaskCount").textContent = overview.completedTasks;
        document.getElementById("openTaskCount").textContent = overview.openTasks;
        document.getElementById("totalTaskCount").textContent = `${allTasks.length} total tasks`;
        document.getElementById("tutorAssignmentCount").textContent = `${assignmentCount} assigned students`;

        document.getElementById("recentStudents").innerHTML = overview.students.length
            ? overview.students.slice(0, 8).map(student =>
                `<tr><td><strong>${escapeHtml(student.fullName)}</strong></td><td>${escapeHtml(student.email)}</td><td>${escapeHtml(new Date(student.createdAt).toLocaleDateString())}</td></tr>`
            ).join("")
            : '<tr><td colspan="3">No student accounts yet.</td></tr>';

        document.getElementById("tutorList").innerHTML = overview.tutors.length
            ? overview.tutors.map(tutor =>
                `<div class="role-list-item"><div><strong>${escapeHtml(tutor.fullName)}</strong><small>${escapeHtml(tutor.email)} · ${tutor.studentCount} students</small></div><span class="status-pill success">Active</span></div>`
            ).join("")
            : "<p>No tutors added yet.</p>";

        document.getElementById("assignmentTutor").innerHTML =
            '<option value="">Select a tutor</option>' +
            overview.tutors.map(tutor =>
                `<option value="${escapeHtml(tutor.id)}">${escapeHtml(tutor.fullName)}</option>`
            ).join("");
        document.getElementById("assignmentStudent").innerHTML =
            '<option value="">Select a student</option>' +
            overview.students.map(student =>
                `<option value="${escapeHtml(student.id)}">${escapeHtml(student.fullName)}</option>`
            ).join("");
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }

    document.addEventListener("campussync:role-ready", event => {
        document.getElementById("staffName").textContent = event.detail.fullName;
        loadDashboard();
    });

    document.getElementById("createTutorForm").addEventListener("submit", event => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        document.getElementById("temporaryCredentials").hidden = true;
        try {
            const result = window.CampusSyncLocal.createAccount({
                fullName: document.getElementById("tutorName").value,
                email: document.getElementById("tutorEmail").value,
                role: "tutor"
            });
            document.getElementById("credentialUser").textContent =
                `${result.account.fullName} · ${result.account.email}`;
            document.getElementById("credentialPassword").textContent = result.temporaryPassword;
            document.getElementById("temporaryCredentials").hidden = false;
            form.reset();
            showMessage("adminMessage", "Tutor account created in this browser.");
            loadDashboard();
        } catch (error) {
            showMessage("adminMessage", error.message);
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById("assignStudentForm").addEventListener("submit", event => {
        event.preventDefault();
        try {
            window.CampusSyncLocal.assignStudent(
                document.getElementById("assignmentTutor").value,
                document.getElementById("assignmentStudent").value
            );
            showMessage("assignmentMessage", "Student assigned to tutor.");
            loadDashboard();
        } catch (error) {
            showMessage("assignmentMessage", error.message);
        }
    });

    document.getElementById("copyCredentials").addEventListener("click", async () => {
        const credentials = `${document.getElementById("credentialUser").textContent}\nPassword: ${document.getElementById("credentialPassword").textContent}`;
        try {
            await navigator.clipboard.writeText(credentials);
            showMessage("adminMessage", "Credentials copied.");
        } catch (error) {
            showMessage("adminMessage", "Clipboard access failed. Copy the displayed credentials manually.");
        }
    });

    document.querySelector("[data-logout]").addEventListener("click", () => {
        window.CampusSyncLocal.removeCurrentUser();
        window.location.replace("admin-login.html");
    });
})();
