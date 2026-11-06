# Shared Firebase connection

The website and the normal Android app sign-in now use Firebase project `campussync-intuthuko`.

## Run the website

Open this folder in VS Code and run `npm start`, then visit http://localhost:5500/login.html. The preview server uses Node's built-in modules; `npm install` is not needed to run it. VS Code Live Server on port 5500 also works.

Firebase handles sign-in and data directly over the internet. The old Express/MySQL server on port 5000 is no longer used by these website screens. Its source is retained for reference. Do not run two preview servers on port 5500 simultaneously.

## First app-and-website test

1. On the app's original sign-in screen, select Student and sign in with an existing Firebase account. Do not use the separate “Connect to website account” screen, which belongs to the previous local API test.
2. Sign into the website with that same email and password. If needed, create a new account once on either platform, then use it on the other.
3. Add a uniquely named assignment on the website. Keep the app open and connected to the internet; verify it appears in Assignments.
4. Complete that assignment in the app. The website assignment list should update through its Firestore listener.
5. Add a note in the app, open Notes on the website, select it, edit and Save. Check the change in the app.

The earlier `student.local@example.com` test account and records in the local MySQL database are separate. They have not been migrated or deleted. Device-only demo logins in debug Android builds are also separate from Firebase.

## What shares data

- Firebase Authentication shares email/password accounts. Google login uses the same Firebase project when enabled and the website domain is authorized.
- `profiles/{uid}` shares name, email, course, year and the app's other profile fields. Sign-in email is read-only in the website profile. “About” remains a website-only field.
- `accounts/{uid}/items/{documentId}` stores the existing Android `{kind, payload}` format. Document IDs are stable Firestore IDs, not the app's temporary numeric display IDs.
- Assignments: add, list, complete and delete; live updates. Transactions preserve app submission fields when completing tasks.
- Notes: list, select, create and save; live updates. Unsaved editor text is kept while another device changes a record.
- GPA: saved modules load on both platforms. Calculate saves module edits; the grade point scale now matches Android (80/70/60/50 -> 4/3/2/1).
- Calendar: app events appear in the website's CampusSync events section. The existing Google Calendar connection remains separate.
- Notifications: shared saved inbox records and read/delete changes. This does not add browser push notifications.
- Appearance/notification preferences remain device settings, matching the current Android behavior. They do not sync between devices.

## Reminders

The Android source now understands the optional `reminderAt` selected on the website. If no time is selected, the app retains its 09:00 due-day reminder. The phone must load the shared task while signed into Firebase so Android can schedule the local alarm. Existing notification permission and alarm settings still apply. This is not a new background push service that wakes a closed app for newly added remote tasks.

The reminder update passed Android unit tests. On 6 November 2026, APK assembly succeeded and `../CampusSync-firebase-debug.apk` was installed on the connected Samsung SM-A526B with an in-place update. Launch to the normal Student sign-in screen was verified. The previous `../CampusSync-connected-debug.apk` predates this change.

## Verification on 5 November 2026

- Six website schema/compatibility tests passed (`npm test`). The Android source compatibility check skips when the sibling Android working copy is absent.
- All 36 Android unit tests passed, including the two new website reminder-time tests.
- Syntax checks passed for all 22 top-level website JavaScript modules/scripts.
- Live Firebase test passed registration, second-session login, task read in the shared Android schema, completion seen by the first session, task deletion and Auth test-account cleanup. No existing user records were touched.
- An isolated Chrome browser loaded the real Firebase SDK and correct project, rendered Login, and redirected a signed-out Tasks visit to Login. Screenshot: `../firebase-website-login.png`.
- Update on 6 November: the phone is connected, the new APK built and installed successfully, and launch was verified. Signed-in check on 6 November: the website-created test assignment appeared on the phone with due date 7 November. It was marked Completed on the phone, which then showed “Synced with your account.” The user confirmed the website changed to Completed automatically without refreshing. Assignment sync in both directions is verified.

No Firebase rules were loosened or replaced. These website changes are proposed on the `feat/shared-firebase` branch; `main` is unchanged. The original Desktop Android project is unchanged; the working Android source is in `../SmartReminderApp`.
