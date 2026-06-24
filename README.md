# Akut Admin

A static [Jekyll](https://jekyllrb.com/) admin console for **akut**. It runs
entirely in the browser and talks to the `lambda.akut` HTTP API to manage a
tenant's **menu** and **tenant status**. Sign-in is handled by **Amazon
Cognito**.

## What it does

| Page          | Path        | Backend call                                            |
| ------------- | ----------- | ------------------------------------------------------- |
| **Sign in**   | `/login/`   | Cognito `InitiateAuth` (`USER_PASSWORD_AUTH`)           |
| **Dashboard** | `/`         | — (session context + admin sub-tenant selector)         |
| **Menu**      | `/menu/`    | `GET/PUT {menu_path}` (Active or Draft, form + raw JSON) |
| **Tenant**    | `/tenant/`  | `PUT {tenant_path}` (Enable / Disable)                  |

The login obtains a Cognito **ID token**, which is stored in `localStorage` and
sent as `Authorization: Bearer <idToken>` on every API call — matching the
identity claims (`given_name`, `family_name`, `email`, `custom:tenant`,
`cognito:groups`) that the lambda reads. Admin accounts without a `custom:tenant`
claim pick a target tenant on the dashboard; it is sent as the `sub-tenant`
header.

## Configuration

All runtime configuration lives under `akut:` in [`_config.yml`](./_config.yml)
and is baked into `assets/js/config.js` at build time. **Rebuild after changing
it.**

```yaml
akut:
  api_base_url: "https://REPLACE-WITH-YOUR-API-ID.execute-api.eu-west-1.amazonaws.com"
  menu_path: "/menu"
  tenant_path: "/tenant"
  cognito_region: "eu-west-1"
  cognito_client_id: "175hkjpgbetjh1a5r05vkcps8r"
```

Set `api_base_url` to the deployed API Gateway base URL, and confirm
`menu_path` / `tenant_path` match the routes mapped to the Menu and Tenant
lambda handlers.

> The Cognito client must allow the `USER_PASSWORD_AUTH` flow, and (when serving
> from a different origin) the API Gateway must allow CORS from this site's
> origin, including the `Authorization` and `sub-tenant` headers.

## Run locally

Requires Ruby + Bundler.

```bash
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000/login/>.

## Build for deployment

```bash
bundle exec jekyll build   # outputs static site to _site/
```

Deploy the contents of `_site/` to any static host (S3 + CloudFront, GitHub
Pages, etc.). If you deploy under a sub-path, set `baseurl` in `_config.yml`.

## Project layout

```
akut.admin/
├── _config.yml            # site + akut runtime config
├── index.html             # dashboard
├── login.html             # Cognito sign-in
├── menu.html              # menu editor
├── tenant.html            # tenant enable/disable
├── _layouts/              # default (login) + app (authenticated) layouts
├── _includes/             # head + sidebar nav
└── assets/
    ├── css/style.css
    └── js/
        ├── config.js      # generated from _config.yml (Liquid)
        ├── auth.js        # Cognito login, session, guards
        ├── api.js         # menu/tenant API client
        ├── login.js
        ├── dashboard.js
        ├── menu.js        # form + raw-JSON menu editor
        └── tenant.js
```

## Notes

- The menu editor mirrors the `akut.domain` `Menu` shape (categories → items,
  per-language `Translations`, images, diets, prices). Enum values are sent as
  integers and translation keys as language names, matching the lambda's
  Newtonsoft (de)serialization.
- The tenant API only accepts status updates (no read), so the tenant page shows
  the last status set during the current session.
