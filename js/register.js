    document
        .getElementById("registerForm")
        .addEventListener("submit", function(event) {

            event.preventDefault();


            const fullName =
                document.getElementById("fullName").value;

            const studentNumber =
                document.getElementById("studentNumber").value;

            const email =
                document.getElementById("email").value;

            const password =
                document.getElementById("password").value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;


            const error =
                document.getElementById("errorMessage");


            const success =
                document.getElementById("successMessage");


            error.style.display = "none";


            if (password !== confirmPassword) {

                error.textContent =
                    "Passwords do not match.";

                error.style.display = "block";

                return;

            }


            let users =
                JSON.parse(
                    localStorage.getItem("campusSyncUsers")
                ) || [];


            const existingUser =
                users.find(
                    user => user.email === email
                );


            if (existingUser) {

                error.textContent =
                    "An account with this email already exists.";

                error.style.display = "block";

                return;

            }


            const newUser = {

                id: Date.now(),

                fullName: fullName,

                studentNumber: studentNumber,

                email: email,

                password: password

            };


            users.push(newUser);


            localStorage.setItem(
                "campusSyncUsers",
                JSON.stringify(users)
            );


            success.style.display = "block";


            setTimeout(function() {

                window.location.href =
                    "Login.html";

            }, 1500);

        });