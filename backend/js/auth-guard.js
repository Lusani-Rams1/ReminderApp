
document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE_URL = "https://reminderapp-production-36c1.up.railway.app";
    const token = localStorage.getItem("token");

    // No token means the user is not logged in.
    if (!token) {
        window.location.replace("login.html");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        // Invalid or expired token.
        if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.replace("login.html");
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to verify your session.");
        }

        const data = await response.json();

        // Refresh the saved user details.
        if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
        }

        // Authentication succeeded. The protected page can load.
        document.documentElement.style.visibility = "visible";

    } catch (error) {
        console.error("Authentication guard error:", error);

        document.body.innerHTML = `
            <main style="
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 60px 20px;
            ">
                <h2>Unable to verify your session</h2>
                <p>Please make sure the CampusSync API server is running.</p>
                <button onclick="location.reload()">Try again</button>
            </main>
        `;
    }
});
