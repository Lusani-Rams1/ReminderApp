document.addEventListener('DOMContentLoaded', async function () {
  const authActions = document.querySelectorAll('[data-auth-actions]');
  const scheduleAction = document.getElementById('scheduleAction');

  let firebase;
  let isLoggedIn = false;
  try { firebase = await window.CampusFirebase; isLoggedIn = Boolean(await firebase.currentUser()); }
  catch (error) { console.error('Could not load Firebase sign-in.', error); }

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
      logoutButton.addEventListener('click', async function () {
        try { await firebase.logout(); }
        catch (error) { alert('Could not sign out. Please try again.'); return; }
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
