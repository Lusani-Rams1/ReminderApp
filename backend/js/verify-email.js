
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL =
    "https://reminderapp-production-36c1.up.railway.app";

  const message = document.getElementById("verificationMessage");
  const verifyBtn = document.getElementById("verifyEmailBtn");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  // Remove the token from the visible URL.
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

  function showMessage(text, status) {
    message.textContent = text;
    message.className = `message ${status}`;
    message.style.display = "block";
  }

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    showMessage(
      "Invalid verification link. Please request a new one.",
      "error"
    );
    return;
  }

  showMessage(
    "Click the button below to verify your CampusSync email address.",
    ""
  );

  verifyBtn.style.display = "block";

  verifyBtn.addEventListener("click", async () => {
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(
          data.message || "Verification failed.",
          "error"
        );
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Try Again";
        return;
      }

      showMessage(
        "Email verified successfully! You can now log in.",
        "success"
      );

      verifyBtn.style.display = "none";

    } catch (error) {
      console.error("EMAIL VERIFICATION ERROR:", error);

      showMessage(
        "Unable to reach the server. Please try again.",
        "error"
      );

      verifyBtn.disabled = false;
      verifyBtn.textContent = "Try Again";
    }
  });
});
