# Click Or Trick Frontend

React + Vite + TypeScript client that now mirrors the original static mockups shipped inside `HTML_UI/` (home, login, create account, and level selection) while adding a dedicated **Game API Lab** screen to exercise the backend endpoints. Every screen is implemented in TSX, responsive, and now wired to the real auth/profile/scoreboard/level APIs so players can log in, unlock missions, submit verdicts, and climb the leaderboard.

## Scripts
```bash
npm install       # install deps (React 19, TS, ESLint flat config)
npm run dev       # start Vite dev server on http://localhost:5173
npm run build     # production bundle
npm run preview   # serve the production bundle locally
```

## Environment
Create `frontend/.env` (or copy `.env.example`) and set:
```
VITE_API_BASE=http://localhost:4000/api
```
Adjust the URL when the backend is deployed elsewhere. If unset, the client defaults to `http://localhost:4000/api`. Make sure the backend exposes the new auth/level routes and that `JWT_SECRET` is set server-side.

## Screens
- `/home` – faithful recreation of `home.html` that now shows the authenticated player’s score/level plus a modal-driven mission feed and leaderboard pulled from `/api/profile`.
- `/login` and `/create-account` – TSX ports of the original auth forms hooked to `/api/auth/register` + `/api/auth/login` (JWT-backed) with graceful status/validation handling.
- `/levels` – original draggable map upgraded with API-driven lock/unlock states, mission briefings, control-room modal, and score modal tied to `/api/levels` and `/api/health`.
- `/game` – Game API Lab that requires an unlocked level, fetches campaign artefacts (using level metadata), submits verdicts to `/api/challenges/results`, and refreshes the player profile/scoreboard after each win.

All layouts inherit their typography/spacing from the legacy CSS so you can continue iterating visually while still benefiting from React routing, linted TypeScript, JWT-aware auth state, and an API-driven progression system.
