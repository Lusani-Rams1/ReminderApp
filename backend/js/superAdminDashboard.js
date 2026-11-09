(function () {
    function showMessage(message) {
        document.getElementById("superAdminMessage").textContent = message;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }

    function loadDashboard() {
        const overview = window.CampusSyncLocal.getSuperAdminOverview();
        const completedTasks = overview.tasks.filter(task => task.status === "completed").length;
        document.getElementById("totalAccounts").textContent = overview.accounts.length;
        document.getElementById("totalStudents").textContent = overview.totalStudents;
        document.getElementById("totalTutors").textContent = overview.totalTutors;
        document.getElementById("totalAdmins").textContent = overview.totalAdmins;
        document.getElementById("totalSuperAdmins").textContent =
            `Super Admin accounts: ${overview.totalSuperAdmins}`;
        document.getElementById("allTasks").textContent = overview.tasks.length;
        document.getElementById("allCompletedTasks").textContent = completedTasks;

        const administrators = overview.accounts.filter(account =>
            account.role === "admin" || account.role === "super_admin"
        );
        document.getElementById("adminAccounts").innerHTML = administrators.length
            ? administrators.map(account => `
                <tr>
                    <td><strong>${escapeHtml(account.fullName)}</strong></td>
                    <td>${escapeHtml(account.email)}</td>
                    <td><span class="status-pill ${account.role === "super_admin" ? "info" : "neutral"}">${account.role === "super_admin" ? "Super Admin" : "Admin"}</span></td>
                    <td><span class="status-pill success">Active</span></td>
                </tr>`).join("")
            : '<tr><td colspan="4">No administrator accounts yet.</td></tr>';
    }

    document.addEventListener("campussync:role-ready", event => {
        document.getElementById("staffName").textContent = event.detail.fullName;
        loadDashboard();
    });

    document.getElementById("createAdminForm").addEventListener("submit", event => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        document.getElementById("adminCredentials").hidden = true;
        try {
            const result = window.CampusSyncLocal.createAccount({
                fullName: document.getElementById("adminName").value,
                email: document.getElementById("adminEmail").value,
                role: "admin"
            });
            document.getElementById("adminCredentialUser").textContent =
                `${result.account.fullName} · ${result.account.email}`;
            document.getElementById("adminCredentialPassword").textContent = result.temporaryPassword;
            document.getElementById("adminCredentials").hidden = false;
            form.reset();
            showMessage("Administrator account created in this browser.");
            loadDashboard();
        } catch (error) {
            showMessage(error.message);
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById("copyAdminCredentials").addEventListener("click", async () => {
        const text = `${document.getElementById("adminCredentialUser").textContent}\nPassword: ${document.getElementById("adminCredentialPassword").textContent}`;
        try {
            await navigator.clipboard.writeText(text);
            showMessage("Credentials copied.");
        } catch (error) {
            showMessage("Clipboard access failed. Copy the displayed credentials manually.");
        }
    });

    document.querySelector("[data-logout]").addEventListener("click", () => {
        window.CampusSyncLocal.removeCurrentUser();
        window.location.replace("super-admin-login.html");
    });
})();
