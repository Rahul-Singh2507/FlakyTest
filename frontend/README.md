# FlakeTest frontend

The React 19 dashboard uses Vite and Tailwind CSS. Its source is organized into four layers:

- `src/app`: application shell and global styles
- `src/features`: authentication and dashboard features
- `src/shared`: reusable API client and UI components
- `src/main.jsx`: browser entry point

Application styling is processed by Tailwind CSS; shared component selectors use Tailwind `@apply` utilities in `src/app/app.css`.

Run `npm run dev` from this directory. Vite proxies `/api` requests to the backend at `http://localhost:3001`; override the target locally with `VITE_API_PROXY_TARGET`.

For a deployed frontend, set `VITE_API_BASE_URL=https://flakytest.onrender.com` in the frontend build environment. The production build then sends API requests, run-event streams, and screenshot requests to the Render backend. The backend must allow the deployed frontend origin: set `FRONTEND_ORIGIN` in the backend environment to the frontend's exact origin (scheme and host, without a path). For local development, this defaults to `http://localhost:5173`.

The browser session uses an HTTP-only cookie and credentialed API requests. Deploy the frontend on the same site as the backend (for example, another `*.onrender.com` host) so the existing `SameSite=Strict` session cookie can be sent. A frontend on a different site needs an explicit cookie/CSRF deployment design; changing `SameSite` alone is not sufficient.

Users can register or sign in before accessing the dashboard. The backend stores users and revocable, expiring sessions in MongoDB; the session token is held in an HTTP-only cookie.

After signing in, select **Connect Jira** in the dashboard header and provide your Jira site URL, account email, and API token. Create an Atlassian API token in your Atlassian account's security settings. The connection is verified with Jira before use. Credentials are stored in the current browser tab's session storage so they survive reloads, and are cleared when you disconnect, log out, or close the tab. They are not saved to MongoDB or `.env`. You can optionally enable posting run summaries as ticket comments.
