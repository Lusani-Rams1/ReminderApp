// Start loading once; classic page scripts await this promise before using Firebase.
window.CampusFirebase = import('./firebase-client.mjs');
window.CampusFirebase.catch(error => console.error('Firebase SDK could not load.', error));
