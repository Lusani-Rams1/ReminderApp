const gradeScale = [{min:80,grade:'A',points:4},{min:70,grade:'B',points:3},{min:60,grade:'C',points:2},{min:50,grade:'D',points:1},{min:0,grade:'F',points:0}];
function marksToGrade(value) { const mark = Number.parseFloat(value); return Number.isFinite(mark) ? gradeScale.find(grade => mark >= grade.min) || {grade:'-',points:null} : {grade:'-',points:null}; }
const gpaTable = document.getElementById('gpaTable');
const form = document.getElementById('gpa-form');
const gpaResult = document.getElementById('gpaResult');
let loadedModules = [];
let gpaDirty = false;
function createRow(module) {
  const row = document.createElement('div'); row.className = 'gpa-row'; row.dataset.id = module?.id || '';
  row.innerHTML = '<input type="text" class="course-input" placeholder="e.g. Math 101" required><input type="number" class="marks-input" placeholder="e.g. 85" min="0" max="100" step="1" required><div class="grade-display">-</div><input type="number" class="credit-input" placeholder="e.g. 3" min="1" step="1" required><button type="button" class="remove-row-btn" title="Remove course">&times;</button>';
  row.querySelector('.course-input').value = module?.moduleName || '';
  row.querySelector('.marks-input').value = module?.mark ?? '';
  row.querySelector('.credit-input').value = module?.credits ?? '';
  const showGrade = () => { row.querySelector('.grade-display').textContent = marksToGrade(row.querySelector('.marks-input').value).grade; };
  row.addEventListener('input', () => { gpaDirty = true; showGrade(); }); showGrade();
  row.querySelector('.remove-row-btn').onclick = () => { gpaDirty = true; row.remove(); };
  gpaTable.append(row);
}
function rows() { return [...gpaTable.querySelectorAll('.gpa-row:not(.gpa-row-header)')]; }
function fillModules(records) { rows().forEach(row => row.remove()); if (records.length) records.forEach(createRow); else for(let i=0;i<3;i++) createRow(); }
fillModules([]);
document.getElementById('addRowBtn').onclick = () => { gpaDirty = true; createRow(); };
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('[type="submit"]'); button.disabled = true;
  try {
    const firebase = await window.CampusFirebase;
    const values = rows().map(row => ({id:row.dataset.id, moduleName:row.querySelector('.course-input').value.trim(),mark:Number(row.querySelector('.marks-input').value),credits:Number(row.querySelector('.credit-input').value)}));
    if (!values.length || values.some(value => !value.moduleName || !Number.isInteger(value.mark) || value.mark<0 || value.mark>100 || !Number.isInteger(value.credits) || value.credits<=0)) throw Error('Enter a course, whole-number mark (0–100), and credits for each row.');
    // Only edit these records, preserving concurrent additions from the app.
    for (const value of values) {
      if (value.id) await firebase.updateItem('gpaModules', value.id, value);
      else value.id = await firebase.createItem('gpaModules', value);
    }
    for (const old of loadedModules) if (!values.some(value => value.id === old.id)) await firebase.removeItem('gpaModules', old.id);
    document.getElementById('gpaValue').textContent = (values.reduce((sum,value) => sum+value.credits*marksToGrade(value.mark).points,0)/values.reduce((sum,value) => sum+value.credits,0)).toFixed(2);
    gpaResult.style.display = 'block'; gpaDirty = false; loadedModules = values; fillModules(values);
  } catch (error) { alert(error.message); }
  finally { button.disabled = false; }
});
form.addEventListener('reset', () => { gpaDirty = true; gpaResult.style.display = 'none'; fillModules([]); });
(async () => {
  try { const firebase = await window.CampusFirebase; await firebase.watchItems('gpaModules', records => { if (!gpaDirty) { loadedModules = records; fillModules(records); } }, error => console.error(firebase.friendlyError(error))); }
  catch (error) { console.error(error); }
})();
