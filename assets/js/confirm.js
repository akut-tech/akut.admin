/* Shared confirmation modal utility.
 *
 * Requires a modal scaffold in the page HTML with IDs:
 *   confirmModal, confirmModalTitle, confirmModalMessage,
 *   confirmModalOk, confirmModalCancel
 *
 * Usage:
 *   window.AkutConfirm({
 *     title:        "Delete menu",
 *     message:      "This cannot be undone.",
 *     confirmLabel: "Delete",
 *     confirmClass: "btn-danger"   // optional, default: btn-primary
 *   }).then(function(ok) { if (ok) { ... } });
 */
(function () {
  "use strict";

  var modal, titleEl, msgEl, okBtn, cancelBtn, pendingResolve;

  function close(result) {
    if (modal) modal.hidden = true;
    document.removeEventListener("keydown", onEsc);
    if (pendingResolve) { pendingResolve(result); pendingResolve = null; }
  }

  function onEsc(e) { if (e.key === "Escape") close(false); }

  document.addEventListener("DOMContentLoaded", function () {
    modal     = document.getElementById("confirmModal");
    titleEl   = document.getElementById("confirmModalTitle");
    msgEl     = document.getElementById("confirmModalMessage");
    okBtn     = document.getElementById("confirmModalOk");
    cancelBtn = document.getElementById("confirmModalCancel");
    if (!modal) return;
    okBtn.addEventListener("click",     function () { close(true); });
    cancelBtn.addEventListener("click", function () { close(false); });
    modal.addEventListener("click",     function (e) { if (e.target === modal) close(false); });
  });

  window.AkutConfirm = function (opts) {
    if (!modal) return Promise.resolve(false);
    titleEl.textContent   = opts.title        || "";
    msgEl.textContent     = opts.message      || "";
    okBtn.textContent     = opts.confirmLabel  || "OK";
    okBtn.className       = "btn btn-block " + (opts.confirmClass || "btn-primary");
    cancelBtn.textContent = t("confirm.cancel");
    modal.hidden = false;
    document.addEventListener("keydown", onEsc);
    cancelBtn.focus();
    return new Promise(function (resolve) { pendingResolve = resolve; });
  };
})();
