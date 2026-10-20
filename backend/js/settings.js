// CampusSync settings: persist user preferences on this device.
document.addEventListener("DOMContentLoaded", function () {
    const SETTINGS_KEY = "campusSyncSettings";
    const language = document.getElementById("language");
    const syncButton = document.querySelector(".sync-btn");
    const syncStatusText = document.getElementById("syncStatusText");

    function readSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        } catch (error) {
            console.warn("Saved settings could not be read.", error);
            return {};
        }
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    let settings = readSettings();

    // Restore and persist the preference switches.
    document.querySelectorAll("[data-preference]").forEach(function (input) {
        const key = input.dataset.preference;
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
            input.checked = Boolean(settings[key]);
        }

        input.addEventListener("change", function () {
            settings[key] = input.checked;
            saveSettings(settings);
        });
    });

    // Keep the language selection across visits. Selecting isiZulu is saved,
    // but full translation requires translated page content to be implemented.
    if (language) {
        language.value = settings.language || localStorage.getItem("campusSyncLanguage") || "english";

        language.addEventListener("change", function () {
            settings.language = language.value;
            localStorage.setItem("campusSyncLanguage", language.value);
            saveSettings(settings);

            if (language.value === "zulu") {
                alert("isiZulu is saved as your preferred language. Full page translation is not available yet.");
            }
        });
    }

    // Sync Now confirms that local preferences can be read and saved.
    // This is a local preference check, not a server/database sync.
    if (syncButton) {
        syncButton.addEventListener("click", function () {
            syncButton.disabled = true;
            syncButton.textContent = "Checking...";
            settings = readSettings();
            saveSettings(settings);

            if (syncStatusText) {
                syncStatusText.textContent = "Preferences saved on this device.";
            }

            window.setTimeout(function () {
                syncButton.textContent = "Saved ✓";
                window.setTimeout(function () {
                    syncButton.textContent = "Sync Now";
                    syncButton.disabled = false;
                }, 1200);
            }, 300);
        });
    }
});
