# 5K Training

A plain HTML/CSS/JS phone app (PWA) for a 25-day 5K plan: Mon Nov 2 to race day, Thu Nov 26, 2026. No build step, no libraries, no network calls, no accounts. All data is in `localStorage` on the phone.

## Host it
It is a static folder, so anything that serves files works. It must be served over **https** (or localhost) for the offline service worker.

**GitHub Pages:** put the `five-k-training-app` folder in a repo (or make it the repo root), then Settings > Pages > deploy from the branch. Open `https://<user>.github.io/<repo>/five-k-training-app/`. All paths are relative, so any subfolder works.

**Locally:** `cd five-k-training-app && python3 -m http.server 8000`, then open http://localhost:8000.

Opening `index.html` directly (file://) works for the screens but not for offline install.

## Install on iPhone
1. Open the https address in **Safari**.
2. Tap the Share button, then **Add to Home Screen**, then Add.
3. Open it once with internet so it caches itself. After that it works offline.

## Edit the plan
`plan.js`: the `BEGINNER` and `INTERMEDIATE` lists, one line per run day: `[date, 'iv', [count, runSeconds, walkSeconds]]` for intervals or `[date, 'cont', [runSeconds, 'easy'|'long'|'shakeout']]` for one continuous run. Titles, totals and the calendar follow. Walk days are `WALK_DATES`. Run `node tests.js` afterwards. When you change any file, bump `CACHE` in `sw.js` so phones refresh.

## Tests
`node tests.js` (no dependencies): dates, plan, pace, Riegel, splits, streaks, badges, shoe miles, plan shifting, .ics, GPS maths.

## Files
Pure logic (browser and Node): `dates.js calc.js timer.js plan.js stats.js badges.js ics.js gps.js`. Screens: `v-*.js`. Shell: `ui.js charts.js share.js metronome.js onboarding.js app.js`.
