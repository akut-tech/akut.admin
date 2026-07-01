# Akut Admin

A static [Jekyll](https://jekyllrb.com/) admin console for **akut**. It runs
entirely in the browser and talks to the `lambda.akut` HTTP API to manage a
tenant's **menus** and **tenant status**. Authentication is handled by **Amazon
Cognito**.

## Pages

| Page          | Path       | Description                                             |
| ------------- | ---------- | ------------------------------------------------------- |
| **Sign in**   | `/login/`  | Cognito `USER_PASSWORD_AUTH` flow                       |
| **Dashboard** | `/`        | Session info + sub-tenant selector                      |
| **Menu**      | `/menu/`   | Menu list and editor (see below)                        |
| **Tenant**    | `/tenant/` | Enable / disable the tenant (admin only)                |

Every request sends the Cognito ID token as `Authorization: Bearer <idToken>`
and the selected sub-tenant as the `sub-tenant` header.

## Menu management

The menu page is split into two views: a **list** and an **editor**.

### Menu lifecycle

Menus move through three statuses managed by the `lambda.akut` API:

```
[New] ──POST──► Disabled ◄──PATCH──► Active
                    │
                  DELETE / PATCH deleted
                    ▼
                 Deleted ──PATCH disabled──► Disabled
```

| Transition | HTTP call | Notes |
|---|---|---|
| Create | `POST /menu` | Server assigns the ID; initial status is **Disabled** |
| Update body | `PUT /menu/{id}` | Does not change status |
| Activate | `PATCH /menu/{id}` `{ nextStatus: "active" }` | Disabled → Active |
| Disable | `PATCH /menu/{id}` `{ nextStatus: "disabled" }` | Active → Disabled |
| Delete | `DELETE /menu/{id}` | Disabled → Deleted; 30-day restore window |
| Restore | `PATCH /menu/{id}` `{ nextStatus: "disabled" }` | Deleted → Disabled |

**Deleted menus** remain recoverable for **30 days** from the deletion date
(`UpdatedAt`). After that the restore button is disabled and the countdown
badge turns red. Restore is not possible past the deadline.

### List view

Menus are grouped into three sections — **Active**, **Disabled**, **Deleted** —
loaded from `GET /menu/metadata`. Each row shows inline action buttons:

- **Active**: View published link · Disable (with confirmation)
- **Disabled**: Preview · Activate · Delete (with confirmation + 30-day notice)
- **Deleted**: Restore (disabled after 30 days) · countdown badge

### Editor

The editor opens when a menu is selected from the list or **New menu** is
clicked. It exposes a form view and a raw-JSON view over the `akut.domain`
`Menu` shape. The toolbar adapts to the current menu status:

| Status | Available actions |
|---|---|
| New (unsaved) | Save · Preview |
| Disabled | Save · Preview · Publish (activates) · Delete |
| Active | Save · Preview · Disable |
| Deleted | Restore (read-only — Save and Publish are disabled) |

## Configuration

All runtime configuration lives under `akut:` in [`_config.yml`](./_config.yml)
and is baked into `assets/js/config.js` at build time. **Rebuild after changing it.**

```yaml
akut:
  api_base_url:        "https://<api-id>.execute-api.eu-west-1.amazonaws.com"
  menu_path:           "/menu"
  menu_metadata_path:  "/menu/metadata"
  tenant_path:         "/tenant"
  cognito_region:      "eu-west-1"
  cognito_client_id:   "<client-id>"
```

> The Cognito client must allow the `USER_PASSWORD_AUTH` flow. The API Gateway
> must allow CORS from this site's origin, including the `Authorization` and
> `sub-tenant` headers.

## Run locally

Requires Ruby + Bundler.

```bash
bundle install
bundle exec jekyll serve
```

Open <http://localhost:4000/login/>.

## Build for deployment

```bash
bundle exec jekyll build   # outputs to _site/
```

Deploy `_site/` to any static host (S3 + CloudFront, GitHub Pages, etc.).
Set `baseurl` in `_config.yml` if serving from a sub-path.

## Project layout

```
akut.admin/
├── _config.yml            # site config + akut runtime values
├── index.html             # dashboard
├── login.html             # sign-in
├── menu.html              # menu list + editor
├── tenant.html            # tenant enable/disable
├── _layouts/
│   ├── app.html           # authenticated layout (sidebar + page shell)
│   └── default.html       # plain layout (login)
├── _includes/
│   ├── head.html
│   └── nav.html           # sidebar navigation
└── assets/
    ├── css/style.css      # design tokens + all component styles
    └── js/
        ├── config.js      # Liquid-generated runtime config (window.AKUT_CONFIG)
        ├── auth.js        # Cognito auth, token refresh, session guards
        ├── api.js         # menu + tenant HTTP client (window.AkutApi)
        ├── i18n.js        # translations EN/PT (window.t, window.AkutI18n)
        ├── confirm.js     # styled confirm modal utility (window.AkutConfirm)
        ├── menu-list.js   # menu list view, status actions, restore countdown
        ├── menu.js        # menu editor (form + JSON, create/update/publish)
        ├── login.js
        ├── dashboard.js
        └── tenant.js
```

## Notes

- **Enum serialization**: the lambda uses Newtonsoft.Json. Enum values are sent
  as integers in the menu body; `Translations` keys are language names
  (e.g. `"Portuguese"`). `ProductStatus` names (`"active"`, `"disabled"`,
  `"deleted"`) are used in `PATCH` requests.
- **i18n**: the UI supports English and Portuguese. The language preference is
  persisted in `localStorage`. All user-visible strings go through `window.t(key)`.
- **Confirmation modals**: destructive actions (Disable, Delete) use a styled
  in-page modal (`window.AkutConfirm`) instead of native `confirm()`.
- **Tenant status**: the API does not expose a read endpoint for tenant status,
  so the tenant page reflects only the last action taken in the current session.
- **Sub-tenant**: admins without a `custom:tenant` Cognito claim select a target
  sub-tenant on the dashboard; it is stored in `localStorage` and sent as the
  `sub-tenant` header on every request.
