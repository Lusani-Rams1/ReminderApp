document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');

  // Hide the error banner until we actually need it
  errorMessage.style.display = 'none';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = form.querySelector('.login-btn');

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';

    try {
      const firebase = await window.CampusFirebase;
      await firebase.login(email, password);

      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error(err);
      const firebase = await window.CampusFirebase.catch(() => null);
      errorMessage.textContent = firebase ? firebase.friendlyError(err) : 'Unable to load Firebase. Check your internet connection.';
      errorMessage.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});

async function googleLogin() {
  try {
    const firebase = await window.CampusFirebase;
    await firebase.googleLogin();
    window.location.href = 'dashboard.html';
  } catch (error) {
    const firebase = await window.CampusFirebase.catch(() => null);
    const message = document.getElementById('errorMessage');
    message.textContent = firebase ? firebase.friendlyError(error) : 'Unable to load Firebase.';
    message.style.display = 'block';
  }
}
