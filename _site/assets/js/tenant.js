/* Tenant page controller: enable/disable the tenant.
 *
 * Restricted to users with the Admin Cognito group. Non-admins see an
 * access-denied message and cannot call the API.
 *
 * The tenant lambda only accepts a status update (204) and does not expose a
 * read, so we track the last action locally for display. */
(function () {
  "use strict";

  var LAST_KEY_PREFIX = "akut.admin.tenant.lastStatus";

  function lastKey() {
    var sub = (window.AkutApi && AkutApi.getSubTenant()) || "";
    return sub ? LAST_KEY_PREFIX + ":" + sub : LAST_KEY_PREFIX;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!AkutAuth.isAdmin()) {
      document.getElementById("tenantDenied").hidden = false;
      document.getElementById("tenantCard").hidden = true;
      return;
    }

    var badge = document.getElementById("tenantBadge");
    var alertBox = document.getElementById("tenantAlert");
    var enableBtn = document.getElementById("enableBtn");
    var disableBtn = document.getElementById("disableBtn");

    setupTenantSwitcher();
    renderBadge(localStorage.getItem(lastKey()));
    enableBtn.addEventListener("click", function () { update("Enabled"); });
    disableBtn.addEventListener("click", function () { update("Disabled"); });

    function setupTenantSwitcher() {
      var tenants = AkutAuth.subTenants();
      if (!tenants.length) return;

      var block = document.getElementById("tenantSwitchBlock");
      var select = document.getElementById("tenantSwitchSelect");
      block.hidden = false;

      var c = AkutAuth.claims() || {};
      var current = AkutApi.getSubTenant();
      if (tenants.indexOf(current) === -1) {
        current = tenants.indexOf(c["custom:tenant"]) !== -1
          ? c["custom:tenant"]
          : tenants[0];
        AkutApi.setSubTenant(current);
      }

      tenants.forEach(function (tn) {
        var opt = document.createElement("option");
        opt.value = tn;
        opt.textContent = tn;
        if (tn === current) opt.selected = true;
        select.appendChild(opt);
      });

      document.getElementById("tenantSwitchSave").addEventListener("click", function () {
        AkutApi.setSubTenant(select.value);
        AkutAuth.renderUserCard();
        alertBox.hidden = true;
        renderBadge(localStorage.getItem(lastKey()));

        var headerTag = document.getElementById("pageHeaderTenant");
        if (headerTag) {
          headerTag.textContent = select.value;
          headerTag.hidden = !select.value;
        }

        var saved = document.getElementById("tenantSwitchSaved");
        saved.hidden = false;
        setTimeout(function () { saved.hidden = true; }, 1800);
      });
    }

    function renderBadge(status) {
      if (status === "Enabled") {
        badge.textContent = t("tenant.enabled");
        badge.className = "badge badge-success";
      } else if (status === "Disabled") {
        badge.textContent = t("tenant.disabled");
        badge.className = "badge badge-danger";
      } else {
        badge.textContent = t("tenant.unknown");
        badge.className = "badge";
      }
    }

    function showAlert(kind, message) {
      alertBox.className = "alert alert-" + kind;
      alertBox.textContent = message;
      alertBox.hidden = false;
    }

    function setBusy(busy) {
      enableBtn.disabled = busy;
      disableBtn.disabled = busy;
    }

    function update(status) {
      if (status === "Disabled" &&
          !window.confirm(t("tenant.confirmDisable"))) {
        return;
      }
      alertBox.hidden = true;
      setBusy(true);
      AkutApi.setTenantStatus(status)
        .then(function () {
          localStorage.setItem(lastKey(), status);
          renderBadge(status);
          var msg = status === "Enabled" ? t("tenant.enabledSuccess") : t("tenant.disabledSuccess");
          showAlert("success", msg);
        })
        .catch(function (err) {
          showAlert("error", err.message || t("tenant.errorUpdate"));
        })
        .finally(function () { setBusy(false); });
    }
  });
})();
