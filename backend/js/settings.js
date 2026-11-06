// Account-based settings with local storage as an immediate fallback.
document.addEventListener("DOMContentLoaded", async function () {
    const SETTINGS_KEY = "campusSyncSettings";
    const API_BASE_URL = window.API_BASE_URL || "https://reminderapp-production-36c1.up.railway.app";
    const language = document.getElementById("language");
    const syncButton = document.querySelector(".sync-btn");
    const syncStatusText = document.getElementById("syncStatusText");
    const preferenceInputs = Array.from(document.querySelectorAll("[data-preference]"));
    const darkMode = document.getElementById("darkMode");

    function readLocalSettings() {
        try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }
        catch (error) { return {}; }
    }

    function collectSettings() {
        return {
            theme: darkMode?.checked ? "dark" : "light",
            language: language?.value || "english",
            assignmentAlerts: document.getElementById("assignmentAlerts")?.checked ?? true,
            classReminders: document.getElementById("classReminders")?.checked ?? true,
            announcements: document.getElementById("announcements")?.checked ?? true,
            offlineMode: document.getElementById("offlineMode")?.checked ?? true
        };
    }

    function applySettings(settings) {
        if (settings.theme) {
            const isDark = settings.theme === "dark";
            if (darkMode) darkMode.checked = isDark;
            document.documentElement.classList.toggle("dark", isDark);
            document.body.classList.toggle("dark", isDark);
            localStorage.setItem("theme", settings.theme);
            localStorage.setItem("campusSyncDarkMode", String(isDark));
        }
        if (language && settings.language) {
            language.value = settings.language;
            localStorage.setItem("campusSyncLanguage", settings.language);
        }
        preferenceInputs.forEach(input => {
            const value = settings[input.dataset.preference];
            if (typeof value === "boolean") input.checked = value;
        });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readLocalSettings(), ...settings }));
    }

    async function requestSettings(method, settings) {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please log in to sync settings to your account.");
        const response = await fetch(API_BASE_URL + "/api/settings", {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            ...(settings ? { body: JSON.stringify(settings) } : {})
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Account settings request failed.");
        return data;
    }

    // Show the saved device copy immediately, then load the account copy.
    applySettings({
        theme: localStorage.getItem("theme") ||
            (localStorage.getItem("campusSyncDarkMode") === "true" ? "dark" : "light"),
        language: localStorage.getItem("campusSyncLanguage") || "english",
        ...readLocalSettings()
    });

    if (localStorage.getItem("token")) {
        try {
            const data = await requestSettings("GET");
            applySettings(data.settings || {});
            if (syncStatusText) syncStatusText.textContent = "Settings loaded from your account.";
        } catch (error) {
            console.warn("Account settings unavailable; using device copy.", error);
            if (syncStatusText) syncStatusText.textContent = "Using device settings; account sync unavailable.";
        }
    } else if (syncStatusText) {
        syncStatusText.textContent = "Saved on this device. Log in to sync across devices.";
    }

    async function persistCurrentSettings() {
        const settings = collectSettings();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        applySettings(settings);
        if (!localStorage.getItem("token")) {
            if (syncStatusText) syncStatusText.textContent = "Saved on this device. Log in to sync across devices.";
            return;
        }
        try {
            const data = await requestSettings("PUT", settings);
            applySettings(data.settings || settings);
            if (syncStatusText) syncStatusText.textContent = "Settings saved to your account.";
        } catch (error) {
            console.error("Settings account save failed:", error);
            if (syncStatusText) syncStatusText.textContent = "Account sync failed; device copy saved.";
        }
    }

    preferenceInputs.forEach(input => input.addEventListener("change", persistCurrentSettings));
    if (language) language.addEventListener("change", async function () {
        await persistCurrentSettings();
        if (language.value === "zulu") {
            alert("isiZulu preference saved. Full page translation is not available yet.");
        }
    });
    if (darkMode) darkMode.addEventListener("change", persistCurrentSettings);

    if (syncButton) {
        syncButton.removeAttribute("onclick");
        syncButton.addEventListener("click", async function () {
            syncButton.disabled = true;
            syncButton.textContent = "Syncing...";
            try {
                const data = await requestSettings("PUT", collectSettings());
                applySettings(data.settings || collectSettings());
                if (syncStatusText) syncStatusText.textContent = "Settings synced with your account.";
                syncButton.textContent = "Synced ✓";
            } catch (error) {
                if (syncStatusText) syncStatusText.textContent = error.message;
                syncButton.textContent = "Sync failed";
            } finally {
                window.setTimeout(() => {
                    syncButton.textContent = "Sync Now";
                    syncButton.disabled = false;
                }, 1600);
            }
        });
    }
});
