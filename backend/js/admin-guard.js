document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  try {
    const response = await fetch("https://reminderapp-production-36c1.up.railway.app/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("login.html");
      return;
    }

    if (!response.ok) throw new Error("Could not verify this account.");

    const data = await response.json();
    if (data.user?.role !== "admin") {
      window.location.replace("dashboard.html");
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    const name = document.getElementById("adminName");
    if (name) name.textContent = data.user.fullName || "Administrator";
    document.documentElement.classList.remove("auth-pending");
    window.dispatchEvent(new Event("admin-authenticated"));
  } catch (error) {
    console.error("Admin page guard:", error);
    document.body.innerHTML = "<main style='font-family:Arial;padding:40px'><h2>Unable to verify administrator access</h2><p>Please check your connection and try signing in again.</p><a href='login.html'>Return to login</a></main>";
  }
});
