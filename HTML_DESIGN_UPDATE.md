# HTML design update

This copy uses the navy-and-blue Intuthuko College design from https://github.com/Azwidalimayaga1/Smart_Reminder_System-Intuthuko.

- The landing page uses the reference HTML layout, college logo and reference photographs. Two specialist cards use initials on this branch.
- Sign-in and registration use the reference form layout and background.
- The dashboard uses the reference summary cards, rewards panel and task sections.
- Tasks use the reference table structure and status controls.
- The other pages use the same reference stylesheet, navigation and restrained panels.
- Text is static: no colour-cycling letters, floating decorative shapes, or splash animations.

The pages are plain HTML, CSS and JavaScript. No PHP runtime, React build or bundler is required. Upload the HTML pages plus `CSS`, `images` and `backend/js` to static hosting. For a local preview, run `npm run start:site` and open http://localhost:8080 (or set SITE_PORT to another available port).

Student sign-in offers Continue with Google using the Android app’s Firebase project. Sign in with the same Google account on both devices to share assignments. Browser demo accounts and staff demo workflows use CampusSyncLocal. Google sign-in requires a served HTTP or HTTPS page.

Original existing files replaced by this update are backed up in the Codex workspace under `work/partner-site-before-reference-style`.
