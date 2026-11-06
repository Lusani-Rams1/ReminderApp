let activeTaskFilter = 'all';
let taskRecords = [];
function openModal() { document.getElementById('assignmentModal').style.display = 'flex'; }
function closeModal() { document.getElementById('assignmentModal').style.display = 'none'; }
window.addEventListener('click', event => { if (event.target === document.getElementById('assignmentModal')) closeModal(); });
async function addTask(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const firebase = await window.CampusFirebase;
    await firebase.createTask({
      title: document.getElementById('assignmentName').value,
      description: [document.getElementById('assignmentModule').value.trim(), document.getElementById('assignmentDescription').value.trim()].filter(Boolean).join(' — '),
      dueDate: document.getElementById('assignmentDate').value,
      reminderAt: document.getElementById('reminderDateTime').value || null
    });
    form.reset(); closeModal();
  } catch (error) {
    const firebase = await window.CampusFirebase.catch(() => null);
    alert(firebase ? firebase.friendlyError(error) : 'Unable to load Firebase.');
  } finally { button.disabled = false; }
}
function filterTasks(filter, button) {
  activeTaskFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(item => item.classList.toggle('active', item === button));
  renderTasks();
}
function renderTasks() {
  const container = document.getElementById('taskContainer');
  container.replaceChildren();
  const visible = taskRecords.filter(task => activeTaskFilter === 'all' || task.status?.toLowerCase() === activeTaskFilter);
  if (!visible.length) { const empty = document.createElement('p'); empty.textContent = 'No assignments to show.'; container.append(empty); }
  visible.forEach(task => {
    const card = document.createElement('div'); card.className = 'task-card'; card.dataset.status = task.status.toLowerCase();
    const title = document.createElement('div'); title.className = 'task-title'; title.textContent = task.title;
    const description = document.createElement('p'); description.className = 'task-description'; description.textContent = task.description || '';
    const date = document.createElement('div'); date.className = 'due-date';
    date.textContent = 'Due: ' + (task.dueDate ? new Date(task.dueDate + 'T12:00:00').toLocaleDateString('en-GB') : 'No due date');
    const actions = document.createElement('div'); actions.className = 'task-actions';
    const complete = document.createElement('button'); complete.className = 'complete-btn';
    complete.textContent = task.status === 'Completed' ? 'Completed' : 'Mark Complete'; complete.disabled = task.status === 'Completed';
    complete.onclick = async () => {
      complete.disabled = true;
      try { await (await window.CampusFirebase).updateItem('tasks', task.id, {status: 'Completed'}); }
      catch (error) { complete.disabled = false; alert(error.message); }
    };
    const remove = document.createElement('button'); remove.className = 'delete-btn'; remove.textContent = 'Delete';
    remove.onclick = async () => {
      if (!confirm('Delete this assignment?')) return;
      remove.disabled = true;
      try { await (await window.CampusFirebase).removeItem('tasks', task.id); }
      catch (error) { remove.disabled = false; alert(error.message); }
    };
    actions.append(complete, remove); card.append(title, description, date, actions); container.append(card);
  });
}
async function loadTasks() {
  const container = document.getElementById('taskContainer');
  container.textContent = 'Loading assignments...';
  try {
    const firebase = await window.CampusFirebase;
    await firebase.watchItems('tasks', records => { taskRecords = records; renderTasks(); }, error => { container.textContent = firebase.friendlyError(error); });
  } catch (error) { container.textContent = error.message; }
}
document.addEventListener('DOMContentLoaded', loadTasks);
