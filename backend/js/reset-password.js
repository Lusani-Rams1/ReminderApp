
document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL =
        "https://reminderapp-production-36c1.up.railway.app";

    const form = document.getElementById("resetPasswordForm");
    const message = document.getElementById("message");
    const resetBtn = document.getElementById("resetBtn");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );

    function showMessage(text, success = false) {
        message.textContent = text;
        message.style.color = success ? "green" : "red";
    }

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        showMessage("Invalid password reset link. Please request a new one.");
        form.style.display = "none";
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            return;
        }

        if (password.length < 12) {
            showMessage("Password must contain at least 12 characters.");
            return;
        }

        resetBtn.disabled = true;
        resetBtn.textContent = "Resetting...";

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/reset-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ token, password })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || "Password reset failed.");
                return;
            }

            showMessage(
                "Password reset successfully! You can now log in.",
                true
            );

            form.style.display = "none";

        } catch (error) {
            console.error("RESET PASSWORD ERROR:", error);
            showMessage(
                "Unable to connect to the server. Please try again."
            );
        } finally {
            resetBtn.disabled = false;
            resetBtn.textContent = "Reset Password";
        }
    });
});
