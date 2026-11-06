async function logout() {
  try { await (await window.CampusFirebase).logout(); window.location.replace('login.html'); }
  catch (error) { alert('Could not sign out. Please try again.'); console.error(error); }
}
