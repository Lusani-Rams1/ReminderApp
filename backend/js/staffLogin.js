document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("staffLoginForm");
    const message = document.getElementById("staffLoginMessage");
    const allowedRoles = (form.dataset.allowedRoles || "").split(",").filter(Boolean);

    form.addEventListener("submit", event => {
        event.preventDefault();
        message.textContent = "";
        message.style.display = "none";
        const email = document.getElementById("staffEmail").value.trim();
        try {
            const user = window.CampusSyncLocal.signIn(
                email,
                document.getElementById("staffPassword").value,
                allowedRoles
            );
            window.location.replace(window.CampusSyncLocal.dashboards[user.role]);
        } catch (error) {
            message.textContent = error.message || "Unable to sign in.";
            message.style.display = "block";
        }
    });
});
