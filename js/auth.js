document.addEventListener('DOMContentLoaded', function () {
  const authActions = document.querySelectorAll('[data-auth-actions]');
  const scheduleAction = document.getElementById('scheduleAction');
  const currentUser = JSON.parse(localStorage.getItem('campusSyncCurrentUser') || 'null');

  authActions.forEach(function (actions) {
    if (currentUser) {
      const name = currentUser.name || currentUser.fullName || currentUser.email || 'Account';
      const initials = name
        .split(/\s+/)
        .map(function (part) { return part.charAt(0); })
        .join('')
        .slice(0, 2)
        .toUpperCase();

      actions.innerHTML = '<a href="profile.html" class="user-chip" aria-label="Open your profile">'
        + '<span class="user-avatar">' + initials + '</span>'
        + '<span class="user-name">' + name + '</span>'
        + '</a><button type="button" class="btn btn-outline logout-btn">Log out</button>';

      actions.querySelector('.logout-btn').addEventListener('click', function () {
        localStorage.removeItem('campusSyncCurrentUser');
        window.location.reload();
      });
    } else {
      actions.innerHTML = '<a href="login.html" class="btn btn-outline">Login</a>'
        + '<a href="register.html" class="btn btn-primary">Get Started</a>';
    }
  });

  if (scheduleAction && currentUser) {
    scheduleAction.textContent = 'Manage your schedule';
    scheduleAction.href = 'calendar.html';
  }
});
