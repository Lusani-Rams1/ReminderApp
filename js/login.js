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
      const res = await fetch('/api/auth/login', {
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

      // Save session
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error(err);
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