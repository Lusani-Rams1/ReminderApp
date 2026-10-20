// Apply the same saved theme on every page.
(function () {
    const savedTheme = localStorage.getItem("theme") ||
        (localStorage.getItem("campusSyncDarkMode") === "true" ? "dark" : "light");

    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    document.addEventListener("DOMContentLoaded", function () {
        document.body.classList.toggle("dark", savedTheme === "dark");

        const toggle = document.getElementById("darkMode");
        if (!toggle) return;

        toggle.checked = savedTheme === "dark";
        toggle.addEventListener("change", function () {
            const theme = toggle.checked ? "dark" : "light";
            localStorage.setItem("theme", theme);
            localStorage.setItem("campusSyncDarkMode", String(toggle.checked));
            document.documentElement.classList.toggle("dark", toggle.checked);
            document.body.classList.toggle("dark", toggle.checked);
        });
    });
})();
