// JS/calendar.js

// ⚠️ PASTE YOUR CLIENT ID HERE — the one ending in .apps.googleusercontent.com
const CLIENT_ID = '163709139673-17knckoejlmkno95al02hm6hjcsrhfen.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

const signinPanel = document.getElementById('signinPanel');
const calendarPanel = document.getElementById('calendarPanel');
const signinBtn = document.getElementById('signinBtn');
const signoutBtn = document.getElementById('signoutBtn');
const userEmail = document.getElementById('userEmail');
const eventsList = document.getElementById('eventsList');

let tokenClient;
let accessToken = null;

function initGoogle() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            if (response.error) {
                console.error('Auth error:', response);
                alert('Sign-in failed. Check console for details.');
                return;
            }
            accessToken = response.access_token;
            onSignedIn();
        }
    });
}

signinBtn.addEventListener('click', () => {
    tokenClient.requestAccessToken();
});

signoutBtn.addEventListener('click', () => {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            accessToken = null;
            signinPanel.style.display = 'block';
            calendarPanel.style.display = 'none';
        });
    }
});

async function onSignedIn() {
    signinPanel.style.display = 'none';
    calendarPanel.style.display = 'block';

    // Get user info for display
    try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const profile = await profileRes.json();
        userEmail.textContent = profile.email || '';
    } catch (err) {
        console.error('Could not fetch profile', err);
    }

    fetchEvents();
}

async function fetchEvents() {
    eventsList.innerHTML = '<p class="empty-state">Loading events…</p>';

    const now = new Date().toISOString();

    try {
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=15&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        renderEvents(data.items || []);
    } catch (err) {
        console.error(err);
        eventsList.innerHTML = '<p class="empty-state">Could not load events. Try signing in again.</p>';
    }
}

function renderEvents(events) {
    if (events.length === 0) {
        eventsList.innerHTML = '<p class="empty-state">No upcoming events found.</p>';
        return;
    }

    eventsList.innerHTML = events.map(event => {
        const start = event.start.dateTime || event.start.date;
        const dateObj = new Date(start);
        const formatted = event.start.dateTime
            ? dateObj.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
            : dateObj.toLocaleDateString(undefined, { dateStyle: 'medium' }); // all-day event

        return `
            <div class="event-card">
                <div class="event-title">${escapeHtml(event.summary || '(No title)')}</div>
                <div class="event-time">${formatted}</div>
            </div>
        `;
    }).join('');
}

// basic escaping so event titles can't inject HTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

initGoogle();