document
        .getElementById("loginForm")
        .addEventListener("submit", function(event) {

            event.preventDefault();

            const email =
                document.getElementById("email").value;

            const password =
                document.getElementById("password").value;

            const error =
                document.getElementById("errorMessage");


            /*
                TEMPORARY PROTOTYPE LOGIN

                This will later be replaced with:
                POST /api/auth/login
            */

            const users =
                JSON.parse(
                    localStorage.getItem("campusSyncUsers")
                ) || [];


            const user =
                users.find(
                    u =>
                    u.email === email &&
                    u.password === password
                );


            if (user) {

                localStorage.setItem(
                    "campusSyncCurrentUser",
                    JSON.stringify(user)
                );

                window.location.href =
                    "dashboard.html";

            } else {

                error.style.display = "block";

            }

        });


    function googleLogin() {

        alert(
            "Google Sign-In will be connected during the PoE build phase."
        );

    }