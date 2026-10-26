// Apply the cached theme immediately; refresh it from the signed-in account.
(function () {
    const API_BASE_URL = window.API_BASE_URL || "https://reminderapp-production-36c1.up.railway.app";

    function applyTheme(theme) {
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        if (document.body) document.body.classList.toggle("dark", isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
        localStorage.setItem("campusSyncDarkMode", String(isDark));
        const toggle = document.getElementById("darkMode");
        if (toggle) toggle.checked = isDark;
    }

    const cachedTheme = localStorage.getItem("theme") ||
        (localStorage.getItem("campusSyncDarkMode") === "true" ? "dark" : "light");
    applyTheme(cachedTheme);

    document.addEventListener("DOMContentLoaded", function () {
        const toggle = document.getElementById("darkMode");

        // settings.js owns saving the switch on Settings to avoid duplicate requests.
        if (toggle) {
            toggle.addEventListener("change", function () {
                applyTheme(toggle.checked ? "dark" : "light");
            });
        }

        const token = localStorage.getItem("token");
        if (!token) return;

        fetch(API_BASE_URL + "/api/settings", {
            headers: { "Authorization": "Bearer " + token }
        }).then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Could not load account theme.");
            if (data.settings?.theme) applyTheme(data.settings.theme);
        }).catch(error => console.warn("Account theme unavailable; using cached theme.", error));
    });
})();
