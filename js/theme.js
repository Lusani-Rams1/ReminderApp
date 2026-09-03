// theme.js
// Pairs with the inline snippet at the top of <body> that prevents a flash
// of the wrong theme on load.

document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('darkMode');
  if (!toggle) return;

  // Sync the switch's visual state with whatever theme is currently applied
  // (the inline snippet in <body> already set the class before this ran).
  toggle.checked = document.body.classList.contains('dark');

  toggle.addEventListener('change', function () {
    document.body.classList.toggle('dark', toggle.checked);
    localStorage.setItem('theme', toggle.checked ? 'dark' : 'light');
  });
});