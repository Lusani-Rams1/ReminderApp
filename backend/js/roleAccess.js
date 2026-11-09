(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const app = document.querySelector("[data-role-page]");
        if (!app) return;

        const allowedRoles = (app.dataset.rolePage || "").split(",").filter(Boolean);
        const user = window.CampusSyncLocal.getCurrentUser();
        if (!user || !allowedRoles.includes(user.role)) {
            const role = allowedRoles[0] || "admin";
            window.location.replace(window.CampusSyncLocal.loginPages[role]);
            return;
        }

        document.body.classList.add("role-verified");
        document.dispatchEvent(new CustomEvent("campussync:role-ready", { detail: user }));
    });
})();
