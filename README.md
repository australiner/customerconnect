# Family Portal (static + self-hosted auth)

Plain HTML/CSS/JS frontend with a self-hosted authentication API — no Azure
App Service Plan required. Everything runs on **Azure Static Web Apps' free
tier**, which bundles a managed serverless API at no extra cost.

## How it fits together

```
Browser (HTML/CSS/JS)
  │
  ▼
Azure Static Web App  ──serves──▶  static files (login.html, dashboard.html…)
  │
  ▼
  └──/api/*──▶  managed Functions API (this repo's /api folder)
                  - signup / login: bcrypt-hashed passwords, JWT session cookie
                  - Google OAuth: redirect + callback, JWT session cookie
                  - customer: reads the session cookie, queries Azure SQL
                       │
                       ▼
                Azure SQL Database (your existing SchoolServiceCustomers
                table, plus a new CustomerUsers table for credentials)
```

Nothing here needs its own Function App or App Service Plan — Static Web
Apps' Standard *and* Free tier both include this "managed functions" model.
The frontend and API share one domain, so session cookies work without any
CORS configuration.

## 1. Database setup

Run `database/schema.sql` against your Azure SQL Database. It adds a new
`CustomerUsers` table for credentials (email, password hash, provider) — your
existing `dbo.SchoolServiceCustomers` and `dbo.ServiceStops` tables aren't
touched. The app links the two by matching `CustomerUsers.Email` to
`SchoolServiceCustomers.CustomerEmail`, then joins through to
`ServiceStops` (via `CustomerStopAMID`/`CustomerStopPMID`) to show the
actual AM/PM pickup location alongside the parent and student names.

Create a dedicated, least-privilege SQL login for the app rather than
reusing an admin account (see the commented-out lines at the top of
`schema.sql`), and grant only what's in the `GRANT` statements at the
bottom.

## 2. Google OAuth setup

1. In the [Google Cloud Console](https://console.cloud.google.com/), create
   an OAuth 2.0 Client ID (Application type: Web application).
2. Add authorized redirect URIs:
   - `http://localhost:4280/api/auth/google/callback` (for local dev)
   - `https://<your-swa-domain>/api/auth/google/callback` (once deployed)
3. Copy the Client ID and Client Secret — you'll need both below.

## 3. Configure environment variables

```bash
cd api
cp local.settings.json.example local.settings.json
```

Fill in `local.settings.json` with your Azure SQL credentials, a
`JWT_SECRET` (generate with `openssl rand -base64 32`), and your Google
OAuth Client ID/Secret. `COOKIE_SECURE` is set to `false` there only so
session cookies work over plain `http://localhost` during development —
make sure it's **not** set to `false` in production (the default, when the
variable is omitted, is secure).

## 4. Run it locally

```bash
npm install -g @azure/static-web-apps-cli
cd api && npm install && cd ..
swa start . --api-location api
```

This serves the static site and the API together (by default at
`http://localhost:4280`), matching how it'll behave once deployed.

## 5. Deploy

1. In the Azure Portal, create a **Static Web App** resource (Free or
   Standard plan — no App Service Plan involved), pointing at your GitHub
   repo with:
   - App location: `/`
   - Api location: `api`
   - Output location: *(leave blank)*
2. Azure automatically commits a GitHub Actions workflow to deploy on every
   push — `.github/workflows/azure-static-web-apps.yml` in this repo already
   matches that format, so you can reuse it if you're wiring this up
   manually.
3. In the Static Web App's **Configuration**, add the same environment
   variables as `local.settings.json` (Azure SQL, `JWT_SECRET`, Google
   OAuth) as Application Settings. Leave `COOKIE_SECURE` unset so it
   defaults to secure cookies.
4. Update the Google OAuth Client's redirect URI and your
   `GOOGLE_REDIRECT_URI` setting to use your real Static Web App domain.

## Project structure

```
index.html, login.html, dashboard.html   the three pages
css/styles.css                            shared styles
js/auth.js                                sign-in/sign-up form logic
js/dashboard.js                           loads + renders the customer record

api/
  shared/db.js                            Azure SQL connection pool
  shared/jwt.js                           JWT + session cookie helpers
  auth-google-start/                      GET  /api/auth/google
  auth-google-callback/                   GET  /api/auth/google/callback
  auth-signup/                            POST /api/auth/signup
  auth-login/                             POST /api/auth/login
  auth-logout/                            POST /api/auth/logout
  customer/                               GET  /api/customer  (protected)

database/schema.sql                       CustomerUsers table + grants
```

## Security notes worth knowing

- Passwords are hashed with bcrypt (cost factor 12) and never stored in
  plain text.
- Sessions are JWTs in an **httpOnly, Secure, SameSite=Lax** cookie — not
  readable by page JavaScript, which limits exposure to XSS.
- The login endpoint always runs a bcrypt comparison (against a dummy hash
  if the account doesn't exist) so response timing can't be used to guess
  valid emails.
- All SQL queries are parameterized — no string-concatenated SQL anywhere.
- Consider adding rate limiting on `/api/auth/login` and `/api/auth/signup`
  before launch (e.g. via Azure Front Door, or a simple attempt counter in
  the database) — Static Web Apps doesn't throttle this for you by default.

## Extending this

- To require email verification before granting access, add a
  `VerifiedAt` column to `CustomerUsers` and check it in `auth-login`.
- To support password resets, you'd add a short-lived reset-token table and
  an email-sending step (e.g. via Azure Communication Services or
  SendGrid) — ask if you'd like that built out.
