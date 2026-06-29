/* Thin client over the lambda.akut HTTP API.
 *
 * Endpoints (see akut.function/Function.cs):
 *   GET  {menuPath}?status=Active|Draft   -> Menu JSON ("{}" when none)
 *   PUT  {menuPath}    body = Menu JSON    -> 204
 *   PUT  {tenantPath}  body = {status}     -> 204   (admin-only operation)
 *
 * Auth: Bearer <idToken>. The target sub-tenant (chosen from the token's
 * `custom:subtenants` claim) is sent via the `sub-tenant` header. */
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

  function buildHeaders(idToken, extra) {
    var headers = Object.assign({}, extra || {});
    if (idToken) headers["Authorization"] = "Bearer " + idToken;
    var sub = getSubTenant();
    if (sub) headers["sub-tenant"] = sub;
    return headers;
  }

  function url(path) {
    return (cfg().apiBaseUrl || "").replace(/\/$/, "") + path;
  }

  function handleResponse(res) {
    if (res.status === 403) {
      return res.text().then(function (t) {
        var err = new Error("You are not allowed to perform this action." + (t ? (" " + t) : ""));
        err.status = 403;
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
  }

  function fetchWithToken(idToken, path, options) {
    return fetch(url(path), {
      method: options.method || "GET",
      headers: buildHeaders(idToken, options.headers),
      body: options.body
    });
  }

  // Centralised fetch: proactively refreshes an expired token before the
  // request, and retries once if the server still returns 401 (e.g. clock skew
  // or a race). After a failed retry the session is cleared and the user is
  // redirected to login.
  function request(path, options) {
    options = options || {};
    return window.AkutAuth.getValidToken().then(function (idToken) {
      return fetchWithToken(idToken, path, options).then(function (res) {
        if (res.status !== 401) return handleResponse(res);
        // One retry after a fresh refresh.
        return window.AkutAuth.refresh().then(function (newSession) {
          return fetchWithToken(newSession.idToken, path, options);
        }).then(function (res2) {
          if (res2.status === 401) {
            window.AkutAuth.logout();
            throw new Error("Your session has expired. Please sign in again.");
          }
          return handleResponse(res2);
        });
      });
    }).catch(function (err) {
      // getValidToken rejects when there is no refresh token left.
      if (!window.AkutAuth.getSession()) {
        window.AkutAuth.logout();
      }
      throw err;
    });
  }

  // ---- Menu ---------------------------------------------------------------

  function getMenuMetadata() {
    return request(cfg().menuMetadataPath, { method: "GET" })
      .then(function (res) { return res.json(); });
  }

  function getMenu(menuId, status) {
    var id = encodeURIComponent(menuId);
    var s = encodeURIComponent(status || "Active");
    return request(cfg().menuPath + "?menuId=" + id + "&status=" + s, { method: "GET" })
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

  function previewMenu(menu) {
    var payload = Object.assign({}, menu, { Status: "preview" });
    return request(cfg().menuPath, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function () { return true; });
  }

  // ---- Tenant -------------------------------------------------------------

  // status: "Enabled" | "Disabled"
  function setTenantStatus(status) {
    return request(cfg().tenantPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status })
    }).then(function () { return true; });
  }

  window.AkutApi = {
    getMenuMetadata: getMenuMetadata,
    getMenu: getMenu,
    saveMenu: saveMenu,
    previewMenu: previewMenu,
    setTenantStatus: setTenantStatus,
    getSubTenant: getSubTenant,
    setSubTenant: setSubTenant
  };
})();
