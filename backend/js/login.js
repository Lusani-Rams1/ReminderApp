document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');

  if (!form || !errorMessage) {
    console.error('Login form or error message element was not found.');
    return;
  }

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
      const res = await fetch('https://reminderapp-production-36c1.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMessage.textContent = data.message || 'Invalid email or password.';
        errorMessage.style.display = 'block';
        return;
      }

      // The backend must return the database role for this account.
      const role = String(data.user?.role || '').toLowerCase();
      if (!data.token || !data.user || !['student', 'admin'].includes(role)) {
        errorMessage.textContent = 'The server returned an incomplete account profile. Please contact support.';
        errorMessage.style.display = 'block';
        return;
      }

      // Save the authenticated session.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect according to the role assigned in the database.
      window.location.href = role === 'admin' ? 'admin.html' : 'dashboard.html';
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      errorMessage.textContent = 'Unable to reach the server. Please try again.';
      errorMessage.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});

function googleLogin() {
  alert('Google login is not set up yet.');
}
