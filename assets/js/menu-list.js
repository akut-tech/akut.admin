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
      window.MenuEditor.newMenu("Draft");
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
    var statuses = ["Active", "Draft"];
    var hasAny = false;
    statuses.forEach(function (status) {
      var items = data[status] || [];
      refs.root.appendChild(renderSection(status, items));
      if (items.length) hasAny = true;
    });
    showState(hasAny ? "list" : "empty");
  }

  function renderSection(status, items) {
    var badgeClass = "badge" + (status === "Active" ? " badge-success" : "");
    var header = h("div", { "class": "menu-group-header" }, [
      h("h2", null, [h("span", { "class": badgeClass }, [t("menu.list.status." + status)])])
    ]);
    var body = items.length
      ? h("div", { "class": "menu-list" }, items.map(function (item) { return renderMenuItem(item, status); }))
      : h("p", { "class": "muted pad" }, [t("menu.list.noMenus" + status)]);
    return h("section", { "class": "card" }, [header, body]);
  }

  function renderMenuItem(item, status) {
    var updatedAt = formatDate(item.UpdatedAt);
    var tenant = AkutApi.getSubTenant();
    var publishedUrl = "https://menu.akut.pt/" + encodeURIComponent(tenant) + "/" + encodeURIComponent(item.Id);
    var viewLink = h("a", {
      "class": "btn btn-ghost btn-sm",
      href: publishedUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      onclick: function (e) { e.stopPropagation(); }
    }, [t("menu.list.viewPublished")]);
    var el = h("div", { "class": "menu-list-item", role: "button", tabindex: "0" }, [
      h("div", { "class": "menu-item-name" }, [item.Name]),
      viewLink,
      h("div", { "class": "menu-item-meta" }, [
        h("span", null, [t("menu.list.updatedBy") + ": " + item.UpdatedBy]),
        h("span", { "class": "menu-item-date" }, [updatedAt])
      ])
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
