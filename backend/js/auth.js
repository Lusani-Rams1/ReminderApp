document.addEventListener('DOMContentLoaded', function () {
  const authActions = document.querySelectorAll('[data-auth-actions]');
  const scheduleAction = document.getElementById('scheduleAction');

  // Login/register store the session under "token" and "user".
  // The old script checked "campusSyncCurrentUser", so it incorrectly
  // displayed Login/Get Started even after a successful API login.
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (error) {
    currentUser = null;
  }

  const isLoggedIn = Boolean(localStorage.getItem('token'));

  authActions.forEach(function (actions) {
    if (isLoggedIn) {
      // Use links with visible labels so navigation still works even if
      // an icon library is not loaded on a particular page.
      actions.innerHTML =
        '<a href="notifications.html" class="user-chip nav-account-link" aria-label="Notifications" title="Notifications">' +
          '<i class="bi bi-bell fs-4" aria-hidden="true"></i><span class="user-name">Notifications</span>' +
        '</a>' +
        '<a href="profile.html" class="user-chip nav-account-link" aria-label="Open your profile" title="Profile">' +
          '<i class="bi bi-person-circle fs-4" aria-hidden="true"></i><span class="user-name">Profile</span>' +
        '</a>' +
        '<button type="button" class="btn btn-outline logout-btn">Log out</button>';

      const logoutButton = actions.querySelector('.logout-btn');
      logoutButton.addEventListener('click', function () {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('campusSyncCurrentUser');
        window.location.href = 'login.html';
      });
    } else {
      actions.innerHTML =
        '<a href="login.html" class="btn btn-outline">Login</a>' +
        '<a href="register.html" class="btn btn-primary">Get Started</a>';
    }
  });

  if (scheduleAction && isLoggedIn) {
    scheduleAction.textContent = 'Manage your schedule';
    scheduleAction.href = 'calendar.html';
  }
});
