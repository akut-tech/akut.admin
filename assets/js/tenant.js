/* Tenant page controller: enable/disable the tenant.
 *
 * The tenant lambda only accepts a status update (204) and does not expose a
 * read, so we track the last action locally for display. */
(function () {
  "use strict";

  var LAST_KEY = "akut.admin.tenant.lastStatus";

  var badge = document.getElementById("tenantBadge");
  var alertBox = document.getElementById("tenantAlert");
  var enableBtn = document.getElementById("enableBtn");
  var disableBtn = document.getElementById("disableBtn");

  document.addEventListener("DOMContentLoaded", function () {
    renderBadge(localStorage.getItem(LAST_KEY));
    enableBtn.addEventListener("click", function () { update("Enabled"); });
    disableBtn.addEventListener("click", function () { update("Disabled"); });
  });

  function renderBadge(status) {
    if (status === "Enabled") {
      badge.textContent = "Enabled";
      badge.className = "badge badge-success";
    } else if (status === "Disabled") {
      badge.textContent = "Disabled";
      badge.className = "badge badge-danger";
    } else {
      badge.textContent = "Unknown";
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
        !window.confirm("Disable this tenant? Its menu will be hidden from customers.")) {
      return;
    }
    alertBox.hidden = true;
    setBusy(true);
    AkutApi.setTenantStatus(status)
      .then(function () {
        localStorage.setItem(LAST_KEY, status);
        renderBadge(status);
        showAlert("success", "Tenant " + status.toLowerCase() + " successfully.");
      })
      .catch(function (err) {
        showAlert("error", err.message || "Failed to update tenant status.");
      })
      .finally(function () { setBusy(false); });
  }
})();
