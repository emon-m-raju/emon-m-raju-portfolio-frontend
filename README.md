# DevFolio frontend

React 19 and Vite frontend for the DevFolio portfolio, public blog, and
single-owner content dashboard.

## Architecture

```text
src/
  api/          Axios client, API operations, response/error helpers
  auth/         Owner authentication context
  components/   Reusable UI, theme control, and error/resource states
  dashboard/   Protected owner routes and management screens
  hooks/        Shared portfolio queries and theme preference
  sections/     Public profile, portfolio, blog, contact, and login sections
  App.jsx       Application routes and public/owner page composition
  main.jsx      Query client, router, and error-boundary providers
```

TanStack Query manages API server state. `api/axiosClient.js` is the shared
Axios transport, adds a persistent `X-Visitor-Id`, and attaches a stored owner
JWT when present. Owner-only routes verify the session through the backend.
Light/dark theme preference and owner tokens are persisted in local storage.
Because browser storage is accessible to site JavaScript, protect the app
against cross-site scripting and never put secrets in frontend environment
variables.

## Requirements and local development

Use a Node.js release supported by the Vite version in `package-lock.json`. In
this directory:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Run the Django backend separately. Configure `VITE_API_BASE_URL` in `.env` to
the API root, including the `/api/` prefix and trailing slash. The example uses
`http://127.0.0.1:8000/api/`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Absolute HTTP(S) URL to the Django API root, normally ending in `/api/` |

Vite embeds variables prefixed with `VITE_` into client-side assets. Do not put
passwords, database URLs, private keys, or other secrets in them. The backend
must allow the deployed frontend origin in `CORS_ALLOWED_ORIGINS` and allow
`X-Visitor-Id` in its CORS headers.

## Commands

```powershell
npm run dev
npm run build
npm run preview
```

The production bundle is emitted to `dist/` with hashed asset filenames. The
repository currently has no dedicated automated frontend test script.

## Deployment

### Vercel

1. Import the frontend Git repository into Vercel.
2. Set the project root to the repository root.
3. Use `npm install` (or `npm ci`) as the install command and `npm run build` as
   the build command.
4. Set the output directory to `dist`.
5. Add `VITE_API_BASE_URL` for the Production environment, pointing to the
   deployed backend API root, for example
   `https://<render-service>.onrender.com/api/`.
6. Add the same variable to Preview if preview deployments should use the
   backend, and redeploy after changing environment variables.
7. Ensure the backend includes the production Vercel origin in
   `CORS_ALLOWED_ORIGINS`, then verify public API requests and the browser
   console after deployment.

The frontend is a static SPA; configure host rewrites to serve `index.html` for
client-side routes such as `/owner` and `/login` if the hosting platform does
not apply SPA fallback routing automatically.

Backend setup, API endpoints, seed commands, and Render deployment are
documented in the root [README](../README.md).
