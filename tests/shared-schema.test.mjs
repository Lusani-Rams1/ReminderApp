import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newTask,packItem,unpackItem,defaultProfile} from '../backend/js/shared-schema.mjs';

test('website writes the Android enum names, date format and ownership-free payload', () => {
  const value=newTask({title:' Physics ',description:' Lab ',dueDate:'2099-11-05'});
  const packed=packItem('tasks',{...value,taskId:32,userId:1,assignedBy:1,id:'local-id'});
  const payload=JSON.parse(packed.payload);
  assert.equal(payload.status,'Pending'); assert.equal(payload.priority,'Medium');
  assert.equal(payload.title,'Physics'); assert.equal(payload.dueDate,'2099-11-05');
  for(const key of ['id','taskId','userId','assignedBy']) assert.equal(key in payload,false);
  assert.equal(unpackItem('firestore-id',packed).id,'firestore-id');
});
test('updating a task preserves submission metadata and an optional website reminder', () => {
  const original=packItem('tasks',{...newTask({title:'Report',dueDate:'2099-11-05',reminderAt:'2099-11-04T15:30'}),submissionNote:'Submitted in the app',submittedAt:'2099-11-03T12:00'});
  const updated=JSON.parse(packItem('tasks',{...unpackItem('a',original),status:'Completed'}).payload);
  assert.equal(updated.submissionNote,'Submitted in the app'); assert.equal(updated.reminderAt,'2099-11-04T15:30'); assert.equal(updated.status,'Completed');
});
test('profile matches the existing Firestore rules and Android field names', () => {
  assert.deepEqual(defaultProfile({email:'student@example.test'},'Student','ST1'),{username:'Student',email:'student@example.test',studentNumber:'ST1',phone:'',institution:'',course:'',yearOfStudy:1});
});
test('bad record types and oversized notes fail before any cloud write', () => {
  assert.throws(()=>packItem('roles',{role:'Admin'})); assert.throws(()=>packItem('notes',{body:'a'.repeat(61000)}));
  assert.throws(()=>unpackItem('a',{kind:'tasks',payload:'null'}));
});
test('website reminder dates are validated', () => {
  assert.throws(()=>newTask({title:'Report',dueDate:'2099-11-05',reminderAt:'2099-11-06T11:00'}));
  assert.throws(()=>newTask({title:'Report',dueDate:'2099-11-05',reminderAt:'2020-01-01T11:00'}));
});
test('Android reads the same project, collection and serialized task fields', async context => {
  const root=new URL('../../SmartReminderApp/',import.meta.url);
  let config;
  try { config=JSON.parse(await readFile(new URL('app/google-services.json',root),'utf8')); }
  catch(error) { if(error.code==='ENOENT') { context.skip('Android working copy is not alongside this checkout.'); return; } throw error; }
  assert.equal(config.project_info.project_id,'campussync-intuthuko');
  const cloud=await readFile(new URL('app/src/main/java/com/intuthuko/smartreminder/data/CloudStore.kt',root),'utf8');
  assert.match(cloud,/collection\("accounts"\)/); assert.match(cloud,/collection\("items"\)/); assert.match(cloud,/getString\("payload"\)/);
  const model=await readFile(new URL('app/src/main/java/com/intuthuko/smartreminder/data/model/Task.kt',root),'utf8');
  assert.match(model,/val reminderAt: String\? = null/);
});
