
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL =
    "https://reminderapp-production-36c1.up.railway.app";

  const form = document.getElementById("registerForm");
  const errorMessage = document.getElementById("errorMessage");
  const successMessage = document.getElementById("successMessage");
  const submitBtn = document.getElementById("registerBtn");

  const verificationSection =
    document.getElementById("verificationSection");
  const resendBtn =
    document.getElementById("resendVerificationBtn");
  const resendMessage =
    document.getElementById("resendMessage");

  let registeredEmail = "";
  let registrationComplete = false;

  function showMessage(element, message) {
    element.textContent = message;
    element.style.display = "block";
  }

  function showVerificationSection() {
    form.style.display = "none";
    verificationSection.style.display = "block";
    registrationComplete = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorMessage.style.display = "none";
    successMessage.style.display = "none";

    const fullName =
      document.getElementById("fullName").value.trim();
    const studentNumber =
      document.getElementById("studentNumber").value.trim();
    const email =
      document.getElementById("email").value.trim();
    const password =
      document.getElementById("password").value;
    const confirmPassword =
      document.getElementById("confirmPassword").value;

    if (password.length < 12) {
      showMessage(
        errorMessage,
        "Password must contain at least 12 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage(errorMessage, "Passwords do not match.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fullName,
            studentNumber,
            email,
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok && !data.emailDeliveryFailed) {
        showMessage(
          errorMessage,
          data.message || "Registration failed."
        );
        return;
      }

      registeredEmail = email;
      showVerificationSection();

      if (data.emailDeliveryFailed) {
        showMessage(
          errorMessage,
          "Your account was created, but the email could not be sent. Please use the resend button."
        );
      } else {
        showMessage(
          successMessage,
          "Account created successfully! Check your email for a verification link."
        );
      }

      form.reset();

    } catch (error) {
      console.error("REGISTRATION ERROR:", error);
      showMessage(
        errorMessage,
        "Unable to reach the server. Please try again."
      );
    } finally {
      submitBtn.disabled = registrationComplete;
      submitBtn.textContent = "Create Account";
    }
  });

  resendBtn.addEventListener("click", async () => {
    if (!registeredEmail) {
      showMessage(
        resendMessage,
        "No registration email found. Please register first."
      );
      return;
    }

    resendBtn.disabled = true;
    resendBtn.textContent = "Sending...";

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: registeredEmail
          })
        }
      );

      const data = await response.json();

      showMessage(
        resendMessage,
        data.message ||
          (response.ok
            ? "If your account is unverified, a new link will be sent."
            : "Unable to process your request.")
      );

    } catch (error) {
      showMessage(
        resendMessage,
        "Unable to contact the server. Please try again."
      );
    } finally {
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend Verification Email";
    }
  });
});
