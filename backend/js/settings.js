// Appearance and notification switches are device preferences on both platforms.
// Personal account records (assignments, notes, GPA, calendar) live in Firestore.
document.addEventListener('DOMContentLoaded', () => {
  const key = 'campusSyncSettings';
  const dark = document.getElementById('darkMode');
  const language = document.getElementById('language');
  const inputs = [...document.querySelectorAll('[data-preference]')];
  const status = document.getElementById('syncStatusText');
  function collect() {
    return {theme: dark?.checked ? 'dark' : 'light', language: language?.value || 'english', ...Object.fromEntries(inputs.map(input => [input.dataset.preference,input.checked]))};
  }
  function apply(settings) {
    if (settings.theme) {
      const isDark = settings.theme === 'dark';
      document.documentElement.classList.toggle('dark',isDark); document.body.classList.toggle('dark',isDark);
      if(dark) dark.checked = isDark; localStorage.setItem('theme',settings.theme);
    }
    if (language && settings.language) language.value = settings.language;
    inputs.forEach(input => { if (typeof settings[input.dataset.preference] === 'boolean') input.checked = settings[input.dataset.preference]; });
  }
  function save() {
    try { const settings = collect(); localStorage.setItem(key,JSON.stringify(settings)); apply(settings); if(status) status.textContent = 'Preferences saved on this device. Your account records sync through Firebase.'; }
    catch(error) { if(status) status.textContent = 'Could not save preferences: ' + error.message; }
  }
  try { apply({...JSON.parse(localStorage.getItem(key)||'{}'),theme:localStorage.getItem('theme')||'light'}); }
  catch(error) { console.warn('Could not restore device preferences.',error); }
  if(status) status.textContent = 'Preferences apply to this device. Your account records sync through Firebase.';
  [...inputs,dark,language].filter(Boolean).forEach(input => input.addEventListener('change',save));
  const button = document.querySelector('.sync-btn');
  if(button) { button.removeAttribute('onclick'); button.textContent = 'Save preferences'; button.addEventListener('click',save); }
});
