(async () => {
  const heading = document.createElement('h2'); heading.textContent = 'CampusSync events';
  const list = document.createElement('div'); list.className = 'events-list'; list.textContent = 'Loading your app calendar...';
  const section = document.createElement('section'); section.append(heading,list);
  document.getElementById('signinPanel').before(section);
  try {
    const firebase = await window.CampusFirebase;
    await firebase.watchItems('calendarEvents', records => {
      list.replaceChildren();
      if (!records.length) { const empty = document.createElement('p'); empty.className='empty-state'; empty.textContent='No saved CampusSync events. Events added in the app appear here.'; list.append(empty); }
      records.sort((a,b) => (a.eventDate+(a.eventTime||'')).localeCompare(b.eventDate+(b.eventTime||''))).forEach(event => {
        const card=document.createElement('div'); card.className='event-card';
        const title=document.createElement('h3'); title.textContent=event.title;
        const when=document.createElement('p'); when.textContent=[event.eventDate,event.eventTime,event.eventType].filter(Boolean).join(' · ');
        const description=document.createElement('p'); description.textContent=event.description||'';
        card.append(title,when,description); list.append(card);
      });
    }, error => { list.textContent = firebase.friendlyError(error); });
  } catch(error) { list.textContent = error.message; }
})();
