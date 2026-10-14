
function logout() {
    // Remove the saved login session.
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect to the login page.
    window.location.replace("login.html");
}
