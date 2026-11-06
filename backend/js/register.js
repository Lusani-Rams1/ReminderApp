document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');

  errorMessage.style.display = 'none';
  successMessage.style.display = 'none';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    const fullName = document.getElementById('fullName').value.trim();
    const studentNumber = document.getElementById('studentNumber').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = form.querySelector('.register-btn');

    if (password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match.';
      errorMessage.style.display = 'block';
      return;
    }
    if (password.length < 8) {
      errorMessage.textContent = 'Password must be at least 8 characters.';
      errorMessage.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';

    try {
      const firebase = await window.CampusFirebase;
      await firebase.register(fullName, studentNumber, email, password);

      successMessage.style.display = 'block';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
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
