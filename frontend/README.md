# FlakeTest frontend

The React 19 dashboard uses Vite and Tailwind CSS. Its source is organized into four layers:

- `src/app`: application shell and global styles
- `src/features`: authentication and dashboard features
- `src/shared`: reusable API client and UI components
- `src/main.jsx`: browser entry point

Application styling is processed by Tailwind CSS; shared component selectors use Tailwind `@apply` utilities in `src/app/app.css`.

Run `npm run dev` from this directory. Vite proxies `/api` requests to the backend at `http://localhost:3001`.

Users can register or sign in before accessing the dashboard. The backend stores users and revocable, expiring sessions in MongoDB; the session token is held in an HTTP-only cookie.

After signing in, select **Connect Jira** in the dashboard header and provide your Jira site URL, account email, and API token. Create an Atlassian API token in your Atlassian account's security settings. The connection is verified with Jira before use. Credentials are stored in the current browser tab's session storage so they survive reloads, and are cleared when you disconnect, log out, or close the tab. They are not saved to MongoDB or `.env`. You can optionally enable posting run summaries as ticket comments.
