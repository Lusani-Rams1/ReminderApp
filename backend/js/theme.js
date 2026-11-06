// Apply the cached theme immediately; refresh it from the signed-in account.
(function () {


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

        // Appearance is a device preference; account records use Firestore.
    });
})();
