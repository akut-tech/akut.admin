(function () {
  "use strict";

  var refs = {};

  document.addEventListener("DOMContentLoaded", function () {
    refs.alert          = document.getElementById("listAlert");
    refs.loading        = document.getElementById("listLoading");
    refs.empty          = document.getElementById("listEmpty");
    refs.root           = document.getElementById("menuListRoot");
    refs.newMenuBtn     = document.getElementById("newMenuBtn");
    refs.refreshListBtn = document.getElementById("refreshListBtn");
    refs.listView       = document.getElementById("listView");
    refs.editorView     = document.getElementById("editorView");

    refs.newMenuBtn.addEventListener("click", function () {
      showEditorView();
      window.MenuEditor.newMenu();
    });

    refs.refreshListBtn.addEventListener("click", loadMetadata);

    // Expose list-view controls so the editor can navigate back
    window.MenuList = { showListView: showListView };

    loadMetadata();
  });

  // ---- Metadata load ------------------------------------------------------

  function loadMetadata() {
    showState("loading");
    AkutApi.getMenuMetadata()
      .then(function (data) {
        if (!data || Object.keys(data).length === 0) { showState("empty"); return; }
        render(data);
      })
      .catch(function (err) {
        showState("none");
        showAlert("error", err.message || t("menu.list.errorLoad"));
      });
  }

  function render(data) {
    refs.root.innerHTML = "";
    var statuses = ["Active", "Disabled", "Deleted"];
    var hasAny = false;
    statuses.forEach(function (status) {
      var items = data[status] || [];
      refs.root.appendChild(renderSection(status, items));
      if (items.length) hasAny = true;
    });
    showState(hasAny ? "list" : "empty");
  }

  function renderSection(status, items) {
    var badgeClass = status === "Active"  ? "badge badge-success"
                   : status === "Deleted" ? "badge badge-danger"
                   : "badge";
    var header = h("div", { "class": "menu-group-header" }, [
      h("h2", null, [h("span", { "class": badgeClass }, [t("menu.list.status." + status)])])
    ]);
    var body = items.length
      ? h("div", { "class": "menu-list" }, items.map(function (item) { return renderMenuItem(item, status); }))
      : h("p", { "class": "muted pad" }, [t("menu.list.noMenus" + status)]);
    return h("section", { "class": "card" }, [header, body]);
  }

  function previewFromList(menuId, btn) {
    btn.disabled = true;
    AkutApi.getMenu(menuId)
      .then(function (menu) {
        if (!menu) throw new Error(t("menu.errorLoad"));
        return AkutApi.previewMenu(menuId, menu).then(function (result) {
          var previewMenuId = (result && result.menuId) ? result.menuId : menuId;
          var tenant = AkutApi.getSubTenant();
          var previewUrl = "https://menu.akut.pt/preview/" +
            encodeURIComponent(tenant) + "/" + encodeURIComponent(previewMenuId);
          window.open(previewUrl, "_blank", "noopener,noreferrer");
        });
      })
      .catch(function (err) {
        showAlert("error", err.message || t("menu.errorPreview"));
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  // Renders an inline action button; disables itself and shows loadingKey text while working.
  function statusActionBtn(labelKey, loadingKey, cssClass, onClick) {
    var btn = h("button", { "class": "btn btn-sm " + cssClass });
    btn.textContent = t(labelKey);
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      btn.disabled = true;
      btn.textContent = t(loadingKey);
      onClick(btn, labelKey);
    });
    return btn;
  }

  function renderMenuItem(item, status) {
    var updatedAt = formatDate(item.UpdatedAt);
    var actionBtns = [];

    if (status === "Active") {
      var tenant = AkutApi.getSubTenant();
      var publishedUrl = "https://menu.akut.pt/" + encodeURIComponent(tenant) + "/" + encodeURIComponent(item.Id);
      actionBtns.push(h("a", {
        "class": "btn btn-ghost btn-sm",
        href: publishedUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        onclick: function (e) { e.stopPropagation(); }
      }, [t("menu.list.viewPublished")]));

      actionBtns.push(statusActionBtn("menu.list.disable", "menu.list.disabling", "btn-secondary", function (btn, labelKey) {
        if (!confirm(t("menu.list.confirmDisable"))) {
          btn.disabled = false;
          btn.textContent = t(labelKey);
          return;
        }
        AkutApi.setMenuStatus(item.Id, "disabled")
          .then(function () { loadMetadata(); })
          .catch(function (err) {
            showAlert("error", err.message || t("menu.errorSave"));
            btn.disabled = false;
            btn.textContent = t(labelKey);
          });
      }));
    }

    if (status === "Disabled") {
      var previewBtn = h("button", { "class": "btn btn-ghost btn-sm" });
      previewBtn.textContent = t("menu.list.preview");
      previewBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        previewFromList(item.Id, previewBtn);
      });
      actionBtns.push(previewBtn);

      actionBtns.push(statusActionBtn("menu.list.activate", "menu.list.activating", "btn-primary", function (btn, labelKey) {
        AkutApi.setMenuStatus(item.Id, "active")
          .then(function () { loadMetadata(); })
          .catch(function (err) {
            showAlert("error", err.message || t("menu.errorSave"));
            btn.disabled = false;
            btn.textContent = t(labelKey);
          });
      }));

      actionBtns.push(statusActionBtn("menu.list.delete", "menu.list.deleting", "btn-danger", function (btn, labelKey) {
        if (!confirm(t("menu.list.confirmDelete"))) {
          btn.disabled = false;
          btn.textContent = t(labelKey);
          return;
        }
        AkutApi.deleteMenu(item.Id)
          .then(function () { loadMetadata(); })
          .catch(function (err) {
            showAlert("error", err.message || t("menu.errorSave"));
            btn.disabled = false;
            btn.textContent = t(labelKey);
          });
      }));
    }

    if (status === "Deleted") {
      actionBtns.push(statusActionBtn("menu.list.restore", "menu.list.restoring", "btn-secondary", function (btn, labelKey) {
        AkutApi.setMenuStatus(item.Id, "disabled")
          .then(function () { loadMetadata(); })
          .catch(function (err) {
            showAlert("error", err.message || t("menu.errorSave"));
            btn.disabled = false;
            btn.textContent = t(labelKey);
          });
      }));
    }

    var metaChildren = actionBtns.concat([
      h("span", null, [t("menu.list.updatedBy") + ": " + item.UpdatedBy]),
      h("span", { "class": "menu-item-date" }, [updatedAt])
    ]);

    var el = h("div", { "class": "menu-list-item", role: "button", tabindex: "0" }, [
      h("div", { "class": "menu-item-name" }, [item.Name]),
      h("div", { "class": "menu-item-meta" }, metaChildren)
    ]);
    function open() {
      showEditorView();
      window.MenuEditor.open(item.Id, status);
    }
    el.addEventListener("click", open);
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") open(); });
    return el;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return iso; }
  }

  // ---- View switching -----------------------------------------------------

  function showListView() {
    refs.listView.hidden   = false;
    refs.editorView.hidden = true;
    setHeading("list");
  }

  function showEditorView() {
    refs.listView.hidden   = true;
    refs.editorView.hidden = false;
    setHeading("editor");
  }

  function setHeading(which) {
    var h1  = document.querySelector(".page-header h1");
    var sub = document.querySelector(".page-header .page-sub");
    var key = which === "editor" ? "menu-edit" : "menu-list";
    if (h1)  h1.textContent  = t("page." + key + ".heading");
    if (sub) sub.textContent = t("page." + key + ".subheading");
  }

  // ---- State helpers ------------------------------------------------------

  function showState(which) {
    refs.loading.hidden = which !== "loading";
    refs.empty.hidden   = which !== "empty";
    refs.root.hidden    = which !== "list";
  }

  function showAlert(kind, message) {
    refs.alert.className   = "alert alert-" + kind;
    refs.alert.textContent = message;
    refs.alert.hidden      = false;
  }

  // ---- Tiny DOM helper ----------------------------------------------------

  function h(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "class") node.className = props[k];
        else if (k.slice(0, 2) === "on" && typeof props[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else if (props[k] === true) node.setAttribute(k, "");
        else if (props[k] !== false && props[k] != null) node.setAttribute(k, props[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
})();
