document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const googleButton = document.getElementById('googleSignIn');
    const session = window.CampusSyncSession;
    const emailButton = form.querySelector('[type=submit]');
    let busy = false;

    function setBusy(value) {
        busy = value;
        emailButton.disabled = value;
        googleButton.disabled = value;
    }
    let firebase;
    session.loadFirebase().then(client => { firebase = client; }).catch(() => {});

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        errorMessage.style.display = 'none';
        try {
            await session.signOut();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const user = window.CampusSyncLocal.signIn(email, password, ['student']);
            location.assign(window.CampusSyncLocal.dashboards[user.role]);
        } catch (error) {
            showError(error.message);
        } finally { setBusy(false); }
    });

    googleButton.addEventListener('click', async () => {
        if (busy) return;
        errorMessage.style.display = 'none';
        if (!firebase) {
            showError('Google sign-in is loading. Try again in a moment.');
            try {
                firebase = await session.loadFirebase();
                errorMessage.style.display = 'none';
            } catch {
                showError('Could not load Google sign-in. Check your internet connection and try again.');
            }
            return;
        }
        setBusy(true);
        try {
            await session.signInWithGoogle(firebase);
            location.assign('dashboard.html');
        } catch (error) {
            showError(firebase.friendlyError(error));
        } finally {
            setBusy(false);
        }
    });
});
