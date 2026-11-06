import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
  signOut, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getFirestore, doc, collection, getDoc, getDocs, runTransaction, onSnapshot,
  setDoc } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.mjs';
import { unpackItem, packItem, defaultProfile, newTask } from './shared-schema.mjs';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
let openedUid;
let opening;
const listeners = new Set();

export function friendlyError(error) {
  const messages = {
    'auth/invalid-credential': 'Email or password is incorrect. Use your Firebase app account, not the old local test account.',
    'auth/email-already-in-use': 'This email is already registered. Sign in with your app password.',
    'auth/weak-password': 'Use a password of at least 8 characters.',
    'auth/unauthorized-domain': 'Add this website address to Firebase Authentication → Settings → Authorized domains.',
    'permission-denied': 'Firebase could not allow this request. Check that the app’s Firestore rules are published.',
    'auth/network-request-failed': 'Unable to reach Firebase. Check your internet connection.'
  };
  return messages[error?.code] || error?.message || 'Firebase could not complete this request.';
}

export async function currentUser() {
  await auth.authStateReady();
  return auth.currentUser;
}

async function openAccount(user, name, studentNumber) {
  const role = await getDoc(doc(db, 'roles', user.uid));
  if (role.data()?.disabled === true) { await logout(); throw new Error('This account is disabled. Contact your campus administrator.'); }
  const profile = doc(db, 'profiles', user.uid);
  const account = doc(db, 'accounts', user.uid);
  await runTransaction(db, async transaction => {
    const profileSnapshot = await transaction.get(profile);
    const accountSnapshot = await transaction.get(account);
    if (!profileSnapshot.exists()) transaction.set(profile, defaultProfile(user, name, studentNumber));
    if (!accountSnapshot.exists()) transaction.set(account, {schemaVersion: 1});
  });
  openedUid = user.uid;
  return user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error('Please sign in to your Firebase account.');
  if (openedUid !== user.uid) {
    if (!opening) opening = openAccount(user).finally(() => { opening = null; });
    await opening;
  }
  return user;
}

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  try { return await openAccount(credential.user); }
  catch (error) { await logout(); throw error; }
}
export async function register(name, studentNumber, email, password) {
  if (name.trim().length < 3) throw new Error('Enter a name of at least 3 characters.');
  if (password.length < 8) throw new Error('Use a password of at least 8 characters.');
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, {displayName: name.trim()});
  // If setup fails, retain the Auth account. Signing in retries profile setup safely.
  return openAccount(credential.user, name.trim(), studentNumber.trim());
}
export async function googleLogin() {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return openAccount(credential.user);
}
export async function logout() {
  for (const stop of listeners) stop();
  listeners.clear(); openedUid = null;
  await signOut(auth);
  // Remove the previous backend session; Firebase manages its own persistence.
  for (const key of ['token', 'user', 'campusSyncCurrentUser']) localStorage.removeItem(key);
}

async function itemsCollection() {
  const user = await requireUser();
  return collection(db, 'accounts', user.uid, 'items');
}
export async function watchItems(kind, next, failure) {
  const items = await itemsCollection();
  const stop = onSnapshot(items, snapshot => {
    try { next(snapshot.docs.map(record => unpackItem(record.id, record.data())).filter(record => record?.kind === kind)); }
    catch (error) { failure(error); }
  }, failure);
  listeners.add(stop);
  return () => { stop(); listeners.delete(stop); };
}
export async function listItems(kind) {
  const snapshot = await getDocs(await itemsCollection());
  return snapshot.docs.map(record => unpackItem(record.id, record.data())).filter(record => record?.kind === kind);
}
export async function createItem(kind, value) {
  const ref = doc(await itemsCollection());
  await setDoc(ref, packItem(kind, value));
  return ref.id;
}
export async function updateItem(kind, id, changes) {
  const ref = doc(await itemsCollection(), id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().kind !== kind) throw new Error('This record no longer exists.');
    const existing = unpackItem(id, snapshot.data());
    transaction.set(ref, packItem(kind, {...existing, ...changes}));
  });
}
export async function removeItem(kind, id) {
  const ref = doc(await itemsCollection(), id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists() && snapshot.data().kind !== kind) throw new Error('Record type does not match.');
    transaction.delete(ref);
  });
}
export async function createTask(values) { return createItem('tasks', newTask(values)); }
export async function getProfile() {
  const user = await requireUser();
  return (await getDoc(doc(db, 'profiles', user.uid))).data();
}
export async function saveProfile(changes) {
  const user = await requireUser();
  const ref = doc(db, 'profiles', user.uid);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    transaction.set(ref, {...snapshot.data(), ...changes, email: user.email});
  });
}
