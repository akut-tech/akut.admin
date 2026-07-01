/* Thin client over the lambda.akut HTTP API.
 *
 * Endpoints (see akut.function/Function.cs):
 *   GET    {menuPath}/{menuId}                     -> Menu JSON or 404
 *   POST   {menuPath}            body = Menu JSON  -> 201 { menuId }
 *   POST   {menuPath}/{menuId}/preview body = Menu -> 201 { menuId }
 *   PUT    {menuPath}/{menuId}   body = Menu JSON  -> 204
 *   PATCH  {menuPath}/{menuId}   body = { nextStatus } -> 204
 *   DELETE {menuPath}/{menuId}                     -> 204
 *   GET    {menuMetadataPath}                      -> metadata grouped by status
 *   PATCH  {tenantPath}          body = { status } -> 204  (admin-only)
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

  // GET /menu/{menuId} — returns null when the menu does not exist (404).
  function getMenu(menuId) {
    var id = encodeURIComponent(menuId);
    return request(cfg().menuPath + "/" + id, { method: "GET" })
      .then(function (res) { return res.json(); })
      .catch(function (err) {
        if (err.status === 404) return null;
        throw err;
      });
  }

  // POST /menu — creates a new menu (server assigns Id, initial status=Disabled).
  // Resolves with { menuId } from the 201 response body.
  function createMenu(menu) {
    return request(cfg().menuPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menu)
    }).then(function (res) { return res.json(); });
  }

  // PUT /menu/{menuId} — replaces the menu body (does not change status).
  function updateMenu(menuId, menu) {
    var id = encodeURIComponent(menuId);
    return request(cfg().menuPath + "/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menu)
    }).then(function () { return true; });
  }

  // PATCH /menu/{menuId} — transitions the menu status.
  // nextStatus: "active" | "disabled" | "deleted"
  function setMenuStatus(menuId, nextStatus) {
    var id = encodeURIComponent(menuId);
    return request(cfg().menuPath + "/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatus: nextStatus })
    }).then(function () { return true; });
  }

  // POST /menu/{menuId}/preview — stores an ephemeral preview copy.
  // Resolves with { menuId } — the server-assigned preview ID for the URL.
  function previewMenu(menuId, menu) {
    var id = encodeURIComponent(menuId);
    return request(cfg().menuPath + "/" + id + "/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menu)
    }).then(function (res) { return res.json(); });
  }

  // DELETE /menu/{menuId} — soft-deletes the menu (status → Deleted).
  function deleteMenu(menuId) {
    var id = encodeURIComponent(menuId);
    return request(cfg().menuPath + "/" + id, {
      method: "DELETE"
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
    createMenu: createMenu,
    updateMenu: updateMenu,
    setMenuStatus: setMenuStatus,
    previewMenu: previewMenu,
    deleteMenu: deleteMenu,
    setTenantStatus: setTenantStatus,
    getSubTenant: getSubTenant,
    setSubTenant: setSubTenant
  };
})();
