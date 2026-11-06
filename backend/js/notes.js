let selectedNote = null;
let noteRecords = [];
let dirty = false;
let autoTimer;
const editor = document.getElementById('editor');
const picker = document.createElement('select');
picker.setAttribute('aria-label', 'Your saved notes');
document.querySelector('.toolbar').prepend(picker);
const status = document.getElementById('lastSaved');
function updateNotePreview() {
  document.getElementById('preview').textContent = editor.value;
  document.getElementById('wc').textContent = 'Words: ' + (editor.value.trim().match(/\S+/g) || []).length;
  document.getElementById('chars').textContent = 'Chars: ' + editor.value.length;
}
function showNote(note) {
  selectedNote = note?.id || null;
  editor.value = note?.body || '';
  picker.value = selectedNote || '';
  dirty = false; updateNotePreview(); status.textContent = note ? 'Loaded from your account' : 'New note';
}
function updatePicker() {
  picker.replaceChildren();
  const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'New note'; picker.append(empty);
  for (const note of noteRecords) { const option = document.createElement('option'); option.value = note.id; option.textContent = note.title || 'Untitled'; picker.append(option); }
  picker.value = selectedNote || '';
}
picker.onchange = () => {
  if (dirty && !confirm('Discard unsaved note changes?')) { picker.value = selectedNote || ''; return; }
  showNote(noteRecords.find(note => note.id === picker.value));
};
async function saveNote() {
  clearTimeout(autoTimer);
  const button = document.getElementById('saveBtn'); button.disabled = true;
  try {
    const firebase = await window.CampusFirebase;
    const body = editor.value;
    const previous = noteRecords.find(note => note.id === selectedNote);
    const value = {title: previous?.title || body.split('\n')[0].trim().slice(0,160) || 'Untitled', body, updatedAt: new Date().toISOString()};
    if (selectedNote) await firebase.updateItem('notes', selectedNote, value);
    else selectedNote = await firebase.createItem('notes', {...value, subjectName:'', isPinned:false, isOfflineAvailable:false});
    dirty = editor.value !== body; updatePicker(); status.textContent = 'Saved to your account';
  } catch (error) { status.textContent = 'Not saved: ' + error.message; }
  finally { button.disabled = false; }
}
document.getElementById('saveBtn').onclick = saveNote;
document.getElementById('newBtn').onclick = () => { if (!dirty || confirm('Discard unsaved changes?')) showNote(null); };
editor.oninput = () => { dirty = true; status.textContent = 'Unsaved changes'; updateNotePreview(); clearTimeout(autoTimer); if (document.getElementById('autosave').checked) autoTimer = setTimeout(saveNote, 1000); };
document.getElementById('clearBtn').onclick = () => { editor.value = ''; editor.dispatchEvent(new Event('input')); };
document.getElementById('search').oninput = event => { const at = editor.value.toLowerCase().indexOf(event.target.value.toLowerCase()); if (at >= 0 && event.target.value) { editor.focus(); editor.setSelectionRange(at, at + event.target.value.length); } };
document.getElementById('exportBtn').onclick = () => {
  const url = URL.createObjectURL(new Blob([editor.value], {type:'text/plain'}));
  const link = document.createElement('a'); link.href = url; link.download = document.getElementById('filename').value || 'note.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.getElementById('importFile').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  if (dirty && !confirm('Replace unsaved note text?')) return;
  showNote(null); editor.value = await file.text(); editor.dispatchEvent(new Event('input'));
};
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
(async () => {
  try {
    const firebase = await window.CampusFirebase;
    await firebase.watchItems('notes', records => {
      noteRecords = records; updatePicker();
      const current = records.find(note => note.id === selectedNote);
      if (!dirty && current) showNote(current);
      else if (!dirty && !selectedNote && records.length) showNote(records[0]);
      else if (!dirty && selectedNote && !current) showNote(null);
    }, error => { status.textContent = 'Sync failed: ' + firebase.friendlyError(error); });
  } catch (error) { status.textContent = error.message; }
})();
