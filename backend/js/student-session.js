(() => {
    const marker = 'campusSyncFirebaseSession';
    let client;
    let cloudUser = null;
    let restoreError = null;

    function loadFirebase() {
        client ??= import('./firebase-client.mjs').catch(error => {
            client = null;
            throw error;
        });
        return client;
    }

    async function restore() {
        if (localStorage.getItem(marker) !== 'active') return null;
        const firebase = await loadFirebase();
        const account = await firebase.currentUser();
        if (!account) {
            localStorage.removeItem(marker);
            return null;
        }
        await firebase.requireUser();
        cloudUser = {id: account.uid, email: account.email, fullName: account.displayName || account.email, role: 'student'};
        return firebase;
    }

    const ready = restore().catch(error => {
        restoreError = error;
        console.error('Could not restore the Firebase session.', error);
        return null;
    });

    window.CampusSyncSession = {
        ready,
        get user() { return cloudUser; },
        get error() { return restoreError; },
        loadFirebase,
        async signInWithGoogle(firebase) {
            await firebase.googleLogin();
            window.CampusSyncLocal.removeCurrentUser();
            localStorage.setItem(marker, 'active');
        },
        async signOut() {
            await ready;
            if (localStorage.getItem(marker) !== 'active') return;
            await (await loadFirebase()).logout();
            localStorage.removeItem(marker);
            cloudUser = null;
            restoreError = null;
        }
    };
})();
