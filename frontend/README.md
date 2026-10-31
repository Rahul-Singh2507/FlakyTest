# FlakeTest frontend

The React 19 dashboard uses Vite and Tailwind CSS. Its source is organized into four layers:

- `src/app`: application shell and global styles
- `src/features`: authentication and dashboard features
- `src/shared`: reusable API client and UI components
- `src/main.jsx`: browser entry point

Run `npm run dev` from this directory. Vite proxies `/api` requests to the backend at `http://localhost:3001`.

Users can register or sign in before accessing the dashboard. The backend stores users and revocable, expiring sessions in MongoDB; the session token is held in an HTTP-only cookie.

After signing in, select **Connect Jira** in the dashboard header and provide your Jira site URL, account email, and API token. Create an Atlassian API token in your Atlassian account's security settings. The connection is verified with Jira before use. Tokens are held in frontend memory only and are sent only to the backend for Jira requests; they are not saved to MongoDB or `.env`, and must be entered again after a page refresh or logout. You can optionally enable posting run summaries as ticket comments.
