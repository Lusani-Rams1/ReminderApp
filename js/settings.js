    /* DARK MODE */

    const darkMode =
        document.getElementById("darkMode");


    darkMode.addEventListener(
        "change",
        function() {

            document.body.classList.toggle(
                "dark",
                this.checked
            );


            localStorage.setItem(
                "campusSyncDarkMode",
                this.checked
            );

        }
    );


    /* LOAD SAVED DARK MODE */

    const savedDarkMode =
        localStorage.getItem(
            "campusSyncDarkMode"
        );


    if (savedDarkMode === "true") {

        darkMode.checked = true;

        document.body.classList.add("dark");

    }

    /* LANGUAGE */

    const language =
        document.getElementById("language");


    language.addEventListener(
        "change",
        function() {

            localStorage.setItem(
                "campusSyncLanguage",
                this.value
            );


            if (this.value === "zulu") {

                alert(
                    "isiZulu language support selected."
                );

            }

        }
    );

    /* LOAD LANGUAGE */

    const savedLanguage =
        localStorage.getItem(
            "campusSyncLanguage"
        );


    if (savedLanguage) {

        language.value = savedLanguage;

    }

    /* SYNC */

    function syncData() {

        const button =
            document.querySelector(".sync-btn");


        button.textContent =
            "Syncing...";


        button.disabled = true;


        setTimeout(function() {

            button.textContent =
                "Synced ✓";


            setTimeout(function() {

                button.textContent =
                    "Sync Now";

                button.disabled = false;

            }, 1500);

        }, 1500);

    }