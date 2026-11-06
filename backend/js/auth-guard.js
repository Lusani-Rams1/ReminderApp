document.addEventListener('DOMContentLoaded', async () => {
  try {
    const firebase = await window.CampusFirebase;
    if (!await firebase.currentUser()) { window.location.replace('login.html'); return; }
    await firebase.requireUser();
    document.documentElement.style.visibility = 'visible';
  } catch (error) {
    document.documentElement.style.visibility = 'visible';
    const main = document.createElement('main');
    main.style.cssText = 'font-family:Arial,sans-serif;text-align:center;padding:60px 20px';
    const heading = document.createElement('h2');
    heading.textContent = 'Unable to open your Firebase account';
    const message = document.createElement('p');
    const firebase = await window.CampusFirebase.catch(() => null);
    message.textContent = firebase ? firebase.friendlyError(error) : 'Check your internet connection, then try again.';
    const retry = document.createElement('button');
    retry.textContent = 'Try again'; retry.onclick = () => location.reload();
    const login = document.createElement('a');
    login.href = 'login.html'; login.textContent = 'Back to sign in';
    main.append(heading, message, retry, document.createTextNode(' '), login);
    document.body.replaceChildren(main);
  }
});
