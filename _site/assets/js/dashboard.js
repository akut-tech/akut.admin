/* Dashboard controller: shows session context and the admin sub-tenant
 * selector when the signed-in admin token carries no `custom:tenant`. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var c = AkutAuth.claims() || {};
    var name = [c.given_name, c.family_name].filter(Boolean).join(" ") ||
      c["cognito:username"] || "—";
    set("ctxUser", name);
    set("ctxEmail", c.email || "—");
    set("ctxRole", AkutAuth.isAdmin() ? "Admin" : "Customer");

    // The list of sub-tenants the user may target comes from the token's
    // custom:subtenants claim. Show the selector whenever it is populated.
    var subTenants = AkutAuth.subTenants();
    if (subTenants.length) {
      var block = document.getElementById("subTenantBlock");
      block.hidden = false;
      var select = document.getElementById("subTenantSelect");

      // Resolve the active selection: keep a previously saved value if it is
      // still valid, otherwise default to the tenant claim (when listed) or the
      // first available sub-tenant.
      var current = AkutApi.getSubTenant();
      if (subTenants.indexOf(current) === -1) {
        current = subTenants.indexOf(c["custom:tenant"]) !== -1
          ? c["custom:tenant"]
          : subTenants[0];
        AkutApi.setSubTenant(current);
      }

      subTenants.forEach(function (t) {
        var opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        if (t === current) opt.selected = true;
        select.appendChild(opt);
      });

      set("ctxTenant", current);
      document.getElementById("subTenantSave").addEventListener("click", function () {
        AkutApi.setSubTenant(select.value);
        set("ctxTenant", select.value);
        var saved = document.getElementById("subTenantSaved");
        saved.hidden = false;
        setTimeout(function () { saved.hidden = true; }, 1800);
      });
    } else {
      set("ctxTenant", c["custom:tenant"] || "—");
    }
  });

  function set(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
})();
