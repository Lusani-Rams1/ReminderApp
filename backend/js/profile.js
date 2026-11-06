const fields = Object.fromEntries(['fullName','email','course','year','bio'].map(id => [id, document.getElementById(id)]));
let savedProfile;
function updatePreview() {
  const name = fields.fullName.value.trim() || 'Student';
  document.getElementById('avatarInitials').textContent = name.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase();
  document.getElementById('displayName').textContent = name;
  document.getElementById('displayCourse').textContent = [fields.course.value, fields.year.value].filter(Boolean).join(' · ') || 'Add your course and year below';
}
function fillProfile(profile) {
  fields.fullName.value = profile.username || '';
  fields.email.value = profile.email || ''; fields.email.readOnly = true;
  fields.course.value = profile.course || '';
  fields.year.value = profile.yearOfStudy || 1;
  updatePreview();
}
document.getElementById('profileForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const year = Number.parseInt(fields.year.value, 10);
    if (!fields.fullName.value.trim() || !Number.isInteger(year) || year < 1 || year > 10) throw Error('Enter your name and a year of study from 1 to 10.');
    const firebase = await window.CampusFirebase;
    await firebase.saveProfile({username: fields.fullName.value.trim(), course: fields.course.value.trim(), yearOfStudy: year});
    savedProfile = await firebase.getProfile();
    // About is a website-only field; keep it separate from the app's profile schema.
    localStorage.setItem('campusSyncBio_' + (await firebase.requireUser()).uid, fields.bio.value);
    fillProfile(savedProfile);
    const confirmation = document.getElementById('saveConfirm'); confirmation.style.display = 'block';
    setTimeout(() => { confirmation.style.display = 'none'; }, 2000);
  } catch (error) { alert(error.message); }
  finally { button.disabled = false; }
});
document.getElementById('resetProfileBtn').onclick = () => { if (savedProfile) fillProfile(savedProfile); };
[fields.fullName, fields.course, fields.year].forEach(input => input.addEventListener('input', updatePreview));
(async () => {
  try {
    const firebase = await window.CampusFirebase;
    savedProfile = await firebase.getProfile(); fillProfile(savedProfile);
    fields.bio.value = localStorage.getItem('campusSyncBio_' + (await firebase.requireUser()).uid) || '';
  } catch (error) { console.error(error); }
})();
