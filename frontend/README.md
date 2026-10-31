# FlakeTest frontend

The React 19 dashboard uses Vite and Tailwind CSS. Its source is organized into four layers:

- `src/app`: application shell and global styles
- `src/features`: authentication and dashboard features
- `src/shared`: reusable API client and UI components
- `src/main.jsx`: browser entry point

Application styling is processed by Tailwind CSS; shared component selectors use Tailwind `@apply` utilities in `src/app/app.css`.

Run `npm run dev` from this directory. Vite proxies `/api` requests to the backend at `http://localhost:3001`; override the target locally with `VITE_API_PROXY_TARGET`.

For the Vercel deployment, `vercel.json` rewrites `/api` requests to `https://flakytest.onrender.com`. Keep API requests on the frontend's own origin; this covers normal API calls, live run-event streams, and screenshots, and lets the session cookie work with its existing `SameSite=Strict` setting. Do not set `VITE_API_BASE_URL` to the Render URL for this deployment. The backend's `FRONTEND_ORIGIN` setting is only needed for direct cross-origin browser access; local development through Vite's `/api` proxy does not require it.

The browser session uses an HTTP-only cookie. Keeping the API on the Vercel frontend origin avoids cross-site cookie restrictions and does not require weakening the cookie's `SameSite=Strict` protection.

The backend runs Playwright Chromium for website previews and test runs. For Render, deploy it using the Docker runtime and `backend/Dockerfile` (or set the service root directory to `backend` and use `Dockerfile`). The image installs the Chromium browser and its operating-system dependencies, which are required by Playwright.

Users can register or sign in before accessing the dashboard. The backend stores users and revocable, expiring sessions in MongoDB; the session token is held in an HTTP-only cookie.

After signing in, select **Connect Jira** in the dashboard header and provide your Jira site URL, account email, and API token. Create an Atlassian API token in your Atlassian account's security settings. The connection is verified with Jira before use. Credentials are stored in the current browser tab's session storage so they survive reloads, and are cleared when you disconnect, log out, or close the tab. They are not saved to MongoDB or `.env`. You can optionally enable posting run summaries as ticket comments.
