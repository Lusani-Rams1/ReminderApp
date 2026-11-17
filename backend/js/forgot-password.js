
document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL =
        "https://reminderapp-production-36c1.up.railway.app";

    const form = document.getElementById("forgotPasswordForm");
    const message = document.getElementById("message");
    const submitBtn = document.getElementById("submitBtn");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();

        message.textContent = "";
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email })
                }
            );

            const data = await response.json();

            message.textContent = data.message ||
                (response.ok
                    ? "If an eligible account exists, a reset link will be sent."
                    : "Unable to process your request.");

            message.style.color = response.ok ? "green" : "red";

        } catch (error) {
            console.error("FORGOT PASSWORD ERROR:", error);
            message.textContent =
                "Unable to connect to the server. Please try again.";
            message.style.color = "red";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Send Reset Link";
        }
    });
});
