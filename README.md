# DevFolio frontend

React/Vite frontend for the DevFolio public portfolio and its protected owner dashboard.

## Requirements and setup

Install Node.js/npm compatible with the Vite version in `package-lock.json`. In this folder:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Configure `VITE_API_BASE_URL` in the local `.env` to the Django API root, normally `http://127.0.0.1:8000/api/`. Start the Django server separately. Do not commit `.env` or place secrets in `VITE_` variables.

## Features

- Public profile, education, experience, skills, projects, and published blog content loaded from the API.
- Responsive dashboard with owner-only routes for profile, skills, projects, posts, categories, tags, comments, and contact messages.
- Shared Axios client for API requests; TanStack Query manages server-state queries and mutations.
- Dashboard respects the shared light/dark theme. API-backed empty/loading/error/retry states are shown where data is fetched.

## Commands

```powershell
npm run dev
npm run build
npm run preview
```

There is currently no frontend automated test script configured. Owner-page mock-response interaction checks should be run without issuing real API mutations. Backend setup, API details, and the Postman collection are documented in the root [README](../README.md).
