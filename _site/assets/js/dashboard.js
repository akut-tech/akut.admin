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
    set("ctxTenant", c["custom:tenant"] || "(none — using sub-tenant)");

    // Show the sub-tenant control only when it is actually required.
    var needsSubTenant = AkutAuth.isAdmin() && !c["custom:tenant"];
    if (needsSubTenant) {
      var block = document.getElementById("subTenantBlock");
      block.hidden = false;
      var input = document.getElementById("subTenantInput");
      input.value = AkutApi.getSubTenant();
      document.getElementById("subTenantSave").addEventListener("click", function () {
        AkutApi.setSubTenant(input.value.trim());
        var saved = document.getElementById("subTenantSaved");
        saved.hidden = false;
        set("ctxTenant", input.value.trim() || "(none — using sub-tenant)");
        setTimeout(function () { saved.hidden = true; }, 1800);
      });
    }
  });

  function set(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
})();
