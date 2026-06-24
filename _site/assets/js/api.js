/* Thin client over the lambda.akut HTTP API.
 *
 * Endpoints (see akut.function/Function.cs):
 *   GET  {menuPath}?status=Active|Draft   -> Menu JSON ("{}" when none)
 *   PUT  {menuPath}    body = Menu JSON    -> 204
 *   PUT  {tenantPath}  body = {status}     -> 204   (admin-only operation)
 *
 * Auth: Bearer <idToken>. Admin users whose token has no `custom:tenant`
 * claim must identify the target tenant via the `sub-tenant` header. */
(function () {
  "use strict";

  // Selected sub-tenant for admin requests, persisted across pages.
  var SUBTENANT_KEY = "akut.admin.subtenant";

  function cfg() { return window.AKUT_CONFIG || {}; }

  function getSubTenant() {
    return localStorage.getItem(SUBTENANT_KEY) || "";
  }

  function setSubTenant(value) {
    if (value) localStorage.setItem(SUBTENANT_KEY, value);
    else localStorage.removeItem(SUBTENANT_KEY);
  }

  function authHeaders(extra) {
    var session = window.AkutAuth.getSession();
    var headers = Object.assign({}, extra || {});
    if (session && session.idToken) {
      headers["Authorization"] = "Bearer " + session.idToken;
    }
    // An admin token without a tenant claim needs the sub-tenant header.
    var claims = window.AkutAuth.claims();
    var needsSubTenant = claims && !claims["custom:tenant"] && window.AkutAuth.isAdmin();
    var sub = getSubTenant();
    if (sub && (needsSubTenant || sub)) {
      headers["sub-tenant"] = sub;
    }
    return headers;
  }

  function url(path) {
    return (cfg().apiBaseUrl || "").replace(/\/$/, "") + path;
  }

  // Centralised fetch with auth + error normalisation.
  function request(path, options) {
    options = options || {};
    return fetch(url(path), {
      method: options.method || "GET",
      headers: authHeaders(options.headers),
      body: options.body
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        return res.text().then(function (t) {
          var err = new Error(
            res.status === 401
              ? "Your session is not authorized. Please sign in again."
              : "You are not allowed to perform this action." + (t ? (" " + t) : "")
          );
          err.status = res.status;
          throw err;
        });
      }
      if (!res.ok) {
        return res.text().then(function (t) {
          var err = new Error("Request failed (" + res.status + "): " + (t || res.statusText));
          err.status = res.status;
          throw err;
        });
      }
      return res;
    });
  }

  // ---- Menu ---------------------------------------------------------------

  function getMenu(status) {
    var s = encodeURIComponent(status || "Active");
    return request(cfg().menuPath + "?status=" + s, { method: "GET" })
      .then(function (res) { return res.json(); })
      .then(function (menu) {
        // The API returns "{}" when no menu exists for the tenant/status.
        if (!menu || Object.keys(menu).length === 0) return null;
        return menu;
      });
  }

  function saveMenu(menu) {
    return request(cfg().menuPath, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menu)
    }).then(function () { return true; });
  }

  // ---- Tenant -------------------------------------------------------------

  // status: "Enabled" | "Disabled"
  function setTenantStatus(status) {
    return request(cfg().tenantPath, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status })
    }).then(function () { return true; });
  }

  window.AkutApi = {
    getMenu: getMenu,
    saveMenu: saveMenu,
    setTenantStatus: setTenantStatus,
    getSubTenant: getSubTenant,
    setSubTenant: setSubTenant
  };
})();
