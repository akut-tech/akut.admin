/* Menu editor: loads a menu by ID from the API, renders a form-based editor
 * over the akut.domain Menu shape, and saves/publishes it via POST (create) or
 * PUT+PATCH (update). A raw-JSON tab mirrors the same state for power users.
 *
 * Property casing is PascalCase to match the lambda's Newtonsoft (de)serialization.
 * Translations are objects keyed by Language *name* (e.g. "English"); other
 * enums are stored as their integer values.
 *
 * The editor is split into three top-level views: Settings (rarely-touched
 * menu configuration), Content (menu name/description/logo + categories/items),
 * and JSON (raw power-user editing). Items are edited one at a time in a
 * focused panel rather than inline, to keep the category view scannable. */
(function () {
  "use strict";

  var E = window.AKUT_ENUMS;
  var LANGUAGES = Object.keys(E.language).map(function (k) {
    return { value: Number(k), name: E.language[k] };
  });

  var TEMPLATE_PRESETS = ["default", "epicurean", "deepblue", "senjutsu", "lisbon"];

  // Sentinel data-entity-id used for menu-level fields, since a brand-new
  // (never-saved) menu has no server-assigned Id yet to key off of — there is
  // only ever one menu being edited at a time, so a constant is unambiguous.
  var MENU_ENTITY_ID = "menu";

  // Error `code` -> form field key, for codes that already uniquely identify
  // a field. Keys match the property names used on the client-side model.
  var SCALAR_FIELD_BY_CODE = {
    "MENU_NOTES_TOO_LONG": "Notes",
    "MENU_TEMPLATE_REQUIRED": "TemplateId",
    "MENU_DEFAULT_LANGUAGE_INVALID": "DefaultLanguage",
    "MENU_CURRENCY_INVALID": "Currency",
    "MENU_FOUNDED_YEAR_INVALID": "FoundedYear",
    "MENU_CATEGORIES_REQUIRED": "Categories",
    "MENU_ITEM_ALLERGENS_INVALID": "Allergens",
    "MENU_ITEM_PRICE_INVALID": "Price",
    "MENU_ITEM_DIET_INVALID": "Diets",
    "MENU_ITEM_YOUTUBE_URL_INVALID": "YouTubeVideoUrls",
    "MENU_ITEM_TAG_INVALID": "Tag",
    "AVAILABILITY_TIME_INVALID_RANGE": "AvailabilityTime",
    "STANDARD_AVAILABILITY_DAYS_EMPTY": "Availability",
    "STANDARD_AVAILABILITY_DAY_INVALID": "Availability",
    "STANDARD_AVAILABILITY_DAYS_DUPLICATED": "Availability",
    "IMAGE_URL_REQUIRED": "Image",
    "IMAGE_URL_INVALID": "Image",
    "IMAGE_TITLE_TOO_LONG": "Image",
    "IMAGE_SOURCE_INVALID": "Image"
  };

  // Fields only the menu itself can own — used as a fallback when the
  // server's EntityId can't be matched (e.g. a brand-new menu, see above).
  var MENU_ONLY_FIELDS = {
    Notes: 1, TemplateId: 1, DefaultLanguage: 1, Currency: 1,
    FoundedYear: 1, Categories: 1, AvailabilityTime: 1
  };

  // Menu-level fields that live on the Settings tab rather than Content —
  // used by goToError to pick which tab to switch to.
  var MENU_SETTINGS_FIELDS = {
    TemplateId: 1, DefaultLanguage: 1, Currency: 1,
    Notes: 1, FoundedYear: 1, AvailabilityTime: 1
  };

  // TranslationsValidator reuses the same TRANSLATIONS_* codes for every
  // translated field, so the field can't be told apart from the code alone.
  // The English fieldName it was constructed with is always the message's
  // prefix (see akut.domain.validations.TranslationsValidator) — recover the
  // field from that prefix instead.
  var TRANSLATION_FIELD_BY_PREFIX = [
    ["Item short description", "ShortDescription"],
    ["Item full description", "FullDescription"],
    ["Item ingredients", "Ingredients"],
    ["Item name", "Name"],
    ["Category name", "Name"],
    ["Category description", "Description"],
    ["Menu name", "Name"],
    ["Menu description", "Description"]
  ];

  // Field key -> i18n key, reusing the same labels already shown on the form.
  var FIELD_LABEL_KEY = {
    Name: "menu.name",
    Description: "menu.description",
    ShortDescription: "menu.shortDesc",
    FullDescription: "menu.fullDesc",
    Ingredients: "menu.ingredients",
    Notes: "menu.notes",
    TemplateId: "menu.templateId",
    DefaultLanguage: "menu.defaultLanguage",
    Currency: "menu.currency",
    FoundedYear: "menu.foundedYear",
    Categories: "menu.categories",
    Allergens: "menu.allergens",
    Price: "menu.price",
    Diets: "menu.diets",
    YouTubeVideoUrls: "menu.youtube",
    Tag: "menu.tag",
    AvailabilityTime: "menu.availabilityTime",
    Availability: "menu.availability",
    Image: "menu.images"
  };

  var state = {
    menuId: null,   // null for a new (unsaved) menu
    status: "Disabled",
    menu: null,
    view: "content"
  };

  // Tracks which category accordion IDs are open so renderContent() can
  // restore them across re-renders.
  var openCats = {};

  // The language whose input is currently shown by every translationsField
  // on screen (see translationsField below). Global rather than per-field so
  // switching language once updates every translated field consistently.
  var activeLanguage = null;

  // Whichever function currently redraws "the thing the language dots should
  // affect" — the Content view, or an open item editor panel's body.
  var currentRerender = null;

  // The single open item editor panel, if any (see openItemEditor/closeItemEditor).
  var itemPanel = null;

  var refs = {};
  document.addEventListener("DOMContentLoaded", function () {
    // Map logical ref names to the actual DOM element IDs used in menu.html
    refs.statusSelect  = document.getElementById("statusSelect");
    refs.loadBtn       = document.getElementById("loadBtn");
    refs.newBtn        = document.getElementById("newEditorBtn");
    refs.settingsTab   = document.getElementById("settingsTab");
    refs.contentTab    = document.getElementById("contentTab");
    refs.jsonTab       = document.getElementById("jsonTab");
    refs.saveBtn       = document.getElementById("saveDraftBtn");
    refs.publishBtn    = document.getElementById("publishBtn");
    refs.previewBtn    = document.getElementById("previewBtn");
    refs.disableMenuBtn  = document.getElementById("disableMenuBtn");
    refs.deleteMenuBtn   = document.getElementById("deleteMenuBtn");
    refs.restoreMenuBtn  = document.getElementById("restoreMenuBtn");
    refs.menuAlert     = document.getElementById("menuAlert");
    refs.loadingState  = document.getElementById("editorLoading");
    refs.emptyState    = document.getElementById("editorEmpty");
    refs.editorRoot    = document.getElementById("editorRoot");
    refs.jsonRoot      = document.getElementById("jsonRoot");
    refs.jsonArea      = document.getElementById("jsonArea");
    refs.jsonApply     = document.getElementById("jsonApply");
    refs.jsonStatus    = document.getElementById("jsonStatus");
    refs.backToListBtn = document.getElementById("backToListBtn");

    refs.loadBtn.addEventListener("click", load);
    refs.newBtn.addEventListener("click", newMenu);
    refs.saveBtn.addEventListener("click", function () { save(false); });
    refs.publishBtn.addEventListener("click", function () { save(true); });
    if (refs.previewBtn) refs.previewBtn.addEventListener("click", preview);
    refs.settingsTab.addEventListener("click", function () { switchView("settings"); });
    refs.contentTab.addEventListener("click", function () { switchView("content"); });
    refs.jsonTab.addEventListener("click", function () { switchView("json"); });
    refs.jsonApply.addEventListener("click", applyJson);
    refs.backToListBtn.addEventListener("click", function () {
      window.MenuList && window.MenuList.showListView();
    });
    if (refs.disableMenuBtn) refs.disableMenuBtn.addEventListener("click", disableMenu);
    if (refs.deleteMenuBtn)  refs.deleteMenuBtn.addEventListener("click",  deleteMenu);
    if (refs.restoreMenuBtn) refs.restoreMenuBtn.addEventListener("click", restoreMenu);

    // Expose editor API — called by menu-list.js on item click or "New menu"
    window.MenuEditor = {
      open: function (menuId, status) {
        state.menuId = menuId;
        state.status = status || "Active";
        state.menu   = null;
        state.view   = "content";
        openCats = {};
        closeItemEditor();
        if (refs.statusSelect) refs.statusSelect.value = state.status;
        updateStatusButtons();
        load();
      },
      newMenu: function () {
        newMenu();
      }
    };
  });

  // ---- Tiny DOM helper ----------------------------------------------------
  function h(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "class") node.className = props[k];
        else if (k === "html") node.innerHTML = props[k];
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

  // Stamps data-* attributes onto a field's interactive control so a
  // validation error can later be traced back to the exact element that
  // needs fixing (see resolveErrorTarget / goToError below).
  function fieldAttrs(entityId, field, language) {
    var attrs = {};
    if (entityId) attrs["data-entity-id"] = entityId;
    if (field) attrs["data-field"] = field;
    if (language) attrs["data-language"] = language;
    return attrs;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ---- Alerts -------------------------------------------------------------
  function alert(kind, message) {
    refs.menuAlert.className = "alert alert-" + kind;
    refs.menuAlert.textContent = message;
    refs.menuAlert.hidden = false;
  }
  function clearAlert() { refs.menuAlert.hidden = true; }

  // Shows a plain message for generic failures, or — when the API returned a
  // structured validation error list — a clickable, contextualized list that
  // jumps to the offending field.
  function showApiError(err, fallbackKey) {
    if (err && err.errors && err.errors.length && state.menu) {
      renderErrorList(err.errors);
    } else {
      alert("error", (err && err.message) || t(fallbackKey || "menu.errorSave"));
    }
  }

  function renderErrorList(errorItems) {
    refs.menuAlert.className = "alert alert-error";
    refs.menuAlert.innerHTML = "";
    refs.menuAlert.hidden = false;

    var titleText = errorItems.length === 1
      ? t("errors.titleOne")
      : t("errors.titleMany", { count: errorItems.length });
    refs.menuAlert.appendChild(h("p", { class: "alert-error-title" }, [titleText]));

    var list = h("ul", { class: "alert-error-list" });
    errorItems.forEach(function (item) {
      var target = resolveErrorTarget(state.menu, item);
      var label = target ? contextLabel(target) : null;
      var text = (label ? label + ": " : "") + AkutApi.translateError(item);
      var li = h("li", { class: "alert-error-item" + (target ? " is-clickable" : "") }, [text]);
      if (target) li.addEventListener("click", function () { goToError(target); });
      list.appendChild(li);
    });
    refs.menuAlert.appendChild(list);
  }

  // ---- Validation error -> field navigation --------------------------------
  function findEntityById(menu, entityId) {
    if (!entityId) return null;
    if (menu.Id && menu.Id === entityId) return { kind: "menu" };
    var cats = menu.Categories || [];
    for (var ci = 0; ci < cats.length; ci++) {
      var cat = cats[ci];
      if (cat.Id === entityId) return { kind: "category", catIndex: ci, cat: cat };
      var items = cat.Items || [];
      for (var ii = 0; ii < items.length; ii++) {
        if (items[ii].Id === entityId) {
          return { kind: "item", catIndex: ci, itemIndex: ii, cat: cat, item: items[ii] };
        }
      }
    }
    return null;
  }

  function resolveField(item) {
    var code = item.code || "";
    var shortCode = code.indexOf(".") !== -1 ? code.substring(code.indexOf(".") + 1) : code;
    if (shortCode.indexOf("TRANSLATIONS_") === 0) {
      var message = item.message || "";
      for (var i = 0; i < TRANSLATION_FIELD_BY_PREFIX.length; i++) {
        if (message.indexOf(TRANSLATION_FIELD_BY_PREFIX[i][0]) === 0) return TRANSLATION_FIELD_BY_PREFIX[i][1];
      }
      return null;
    }
    return SCALAR_FIELD_BY_CODE[code] || null;
  }

  function resolveErrorTarget(menu, item) {
    var field = resolveField(item);
    if (!field) return null;
    var ctx = item.context || {};
    var entity = findEntityById(menu, ctx.EntityId);
    if (!entity && MENU_ONLY_FIELDS[field]) entity = { kind: "menu" };
    if (!entity) return null;
    var language = (ctx.Language != null && E.language) ? E.language[ctx.Language] : null;
    return { entity: entity, field: field, language: language || null, order: ctx.Order != null ? ctx.Order : null };
  }

  function contextLabel(target) {
    var parts = [];
    if (target.entity.kind === "category" || target.entity.kind === "item") {
      parts.push(t("menu.categoryN", { n: target.entity.catIndex + 1 }) + nameHint(target.entity.cat.Name));
    }
    if (target.entity.kind === "item") {
      parts.push(t("menu.itemN", { n: target.entity.itemIndex + 1 }) + nameHint(target.entity.item.Name));
    }
    var fieldKey = FIELD_LABEL_KEY[target.field];
    parts.push(fieldKey ? t(fieldKey) : target.field);
    if (target.language) parts.push(target.language);
    return parts.join(" › ");
  }

  function goToError(target) {
    // Deep-link to the language the error is about, so the (now single)
    // visible translation input is the one that actually needs fixing.
    if (target.language) activeLanguage = target.language;
    if (target.entity.kind !== "menu") {
      openCats[target.entity.cat.Id] = true;
    }
    var view = (target.entity.kind === "menu" && MENU_SETTINGS_FIELDS[target.field]) ? "settings" : "content";
    switchView(view);
    if (target.entity.kind === "item") {
      openItemEditor(target.entity.cat, target.entity.item, target.entity.itemIndex);
    }
    requestAnimationFrame(function () {
      var domId = target.entity.kind === "menu" ? MENU_ENTITY_ID
        : target.entity.kind === "category" ? target.entity.cat.Id
        : target.entity.item.Id;
      var isOrderedList = target.field === "Image" || target.field === "YouTubeVideoUrls";
      var selector = '[data-entity-id="' + domId + '"][data-field="' + target.field + '"]';
      if (target.language) selector += '[data-language="' + target.language + '"]';
      if (isOrderedList && target.order != null) selector += '[data-order="' + target.order + '"]';
      var el = document.querySelector(selector);
      if (!el && isOrderedList) {
        el = document.querySelector('[data-entity-id="' + domId + '"][data-field="' + target.field + '"]');
      }
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof el.focus === "function") el.focus();
      highlightField(el);
    });
  }

  function highlightField(el) {
    var wrapper = (el.classList.contains("image-editor") || el.classList.contains("video-row")) ? el
      : el.closest(".field") || el;
    wrapper.classList.add("field-flash");
    setTimeout(function () { wrapper.classList.remove("field-flash"); }, 2000);
  }

  // ---- Load / new ---------------------------------------------------------
  function load() {
    clearAlert();
    closeItemEditor();
    showOnly("loading");
    AkutApi.getMenu(state.menuId)
      .then(function (menu) {
        if (!menu) { state.menu = null; showOnly("empty"); return; }
        state.menu = normalize(menu);
        render();
      })
      .catch(function (err) {
        showOnly("empty");
        alert("error", err.message || t("menu.errorLoad"));
      });
  }

  function newMenu() {
    clearAlert();
    closeItemEditor();
    state.menuId = null;
    state.status = "Disabled";
    state.view = "content";
    openCats = {};
    state.menu = {
      Logo: null,
      Name: {},
      AvailabilityTime: null,
      Description: null,
      Notes: null,
      FoundedYear: null,
      TemplateId: "",
      DefaultLanguage: 2,
      Currency: 1,
      Categories: []
    };
    if (refs.statusSelect) refs.statusSelect.value = state.status;
    updateStatusButtons();
    render();
  }

  function normalize(menu) {
    menu.Name = menu.Name || {};
    menu.Categories = menu.Categories || [];
    // Order is not user-editable — it's derived from position (via the up/down
    // arrows). Sort by the stored Order on load so positions match, then let
    // sanitize() rewrite Order from the array index on save.
    menu.Categories.sort(byOrder);
    menu.Categories.forEach(function (cat) {
      cat.Name = cat.Name || {};
      cat.Items = cat.Items || [];
      cat.Items.sort(byOrder);
      cat.Items.forEach(function (item) {
        // Discard legacy free-text allergens (Translations object) — cannot map reliably
        if (item.Allergens && !Array.isArray(item.Allergens)) {
          item.Allergens = [];
        }
        if (item.IsNew && item.Tag == null) item.Tag = 1;
        delete item.IsNew;
        item.Images = item.Images || [];
        item.Images.sort(byOrder);
      });
    });
    return menu;
  }

  function showOnly(which) {
    refs.loadingState.hidden = which !== "loading";
    refs.emptyState.hidden   = which !== "empty";
    var hasEditor = which === "editor";
    refs.editorRoot.hidden = !(hasEditor && state.view !== "json");
    refs.jsonRoot.hidden   = !(hasEditor && state.view === "json");
  }

  // ---- View switching -----------------------------------------------------
  function switchView(view) {
    if (!state.menu) return;
    closeItemEditor();
    state.view = view;
    refs.settingsTab.classList.toggle("is-active", view === "settings");
    refs.contentTab.classList.toggle("is-active", view === "content");
    refs.jsonTab.classList.toggle("is-active", view === "json");
    if (view === "json") {
      refs.jsonArea.value = JSON.stringify(sanitize(state.menu), null, 2);
      refs.jsonStatus.textContent = "";
    } else if (view === "settings") {
      renderSettings();
    } else {
      renderContent();
    }
    showOnly("editor");
  }

  function applyJson() {
    try {
      var parsed = JSON.parse(refs.jsonArea.value);
      closeItemEditor();
      state.menu = normalize(parsed);
      switchView("content");
    } catch (e) {
      refs.jsonStatus.textContent = t("menu.jsonInvalid", { msg: e.message });
      refs.jsonStatus.className = "field-saved field-error";
    }
  }

  function render() {
    if (state.view === "settings") renderSettings();
    else if (state.view === "content") renderContent();
    showOnly("editor");
  }

  // ---- Form rendering: Settings tab ----------------------------------------
  function renderSettings() {
    var m = state.menu;
    var root = refs.editorRoot;
    root.innerHTML = "";

    root.appendChild(card(t("menu.details"), [
      grid2([
        comboField(t("menu.templateId"), m.TemplateId, TEMPLATE_PRESETS, function (v) { m.TemplateId = v; },
          { required: true, placeholder: t("menu.templateIdPlaceholder"), help: t("menu.templateIdHelp"),
            entityId: MENU_ENTITY_ID, field: "TemplateId" }),
        selectField(t("menu.defaultLanguage"), m.DefaultLanguage, E.language, function (v) {
          m.DefaultLanguage = Number(v);
        }, { entityId: MENU_ENTITY_ID, field: "DefaultLanguage" })
      ]),
      grid2([
        selectField(t("menu.currency"), m.Currency, E.currency, function (v) { m.Currency = Number(v); },
          { entityId: MENU_ENTITY_ID, field: "Currency" }),
        foundedYearField(t("menu.foundedYear"), m.FoundedYear, function (v) { m.FoundedYear = v; },
          { entityId: MENU_ENTITY_ID, field: "FoundedYear" })
      ]),
      textField(t("menu.notes"), m.Notes || "", function (v) { m.Notes = v || null; },
        { maxLength: 1000, entityId: MENU_ENTITY_ID, field: "Notes", multiline: true, rows: 4 }),
      availabilityTimeField(t("menu.availabilityTime"), m.AvailabilityTime, function (avail) {
        m.AvailabilityTime = avail;
      })
    ]));
  }

  // ---- Form rendering: Content tab -----------------------------------------
  function renderContent() {
    var m = state.menu;
    ensureActiveLanguage();
    currentRerender = renderContent;
    var root = refs.editorRoot;
    root.innerHTML = "";

    root.appendChild(card(t("menu.menuInfo"), [
      translationsField(t("menu.name"), m.Name, function (tr) { m.Name = tr; },
        { maxLength: 100, entityId: MENU_ENTITY_ID, field: "Name", required: true }),
      translationsField(t("menu.description"), m.Description || {}, function (tr) {
        m.Description = isEmptyTranslations(tr) ? null : tr;
      }, { maxLength: 500, entityId: MENU_ENTITY_ID, field: "Description", multiline: true, rows: 4 }),
      imageField(t("menu.logo"), m.Logo, function (img) { m.Logo = img; },
        { entityId: MENU_ENTITY_ID, field: "Image" })
    ]));

    var catsWrap = h("div", Object.assign({ class: "section" }, fieldAttrs(MENU_ENTITY_ID, "Categories")), [
      sectionHeader(t("menu.categories"), t("menu.addCategory"), function () {
        var cat = newCategory(m.Categories.length);
        m.Categories.push(cat);
        openCats[cat.Id] = true;
        renderContent();
      })
    ]);

    if (!m.Categories.length) {
      catsWrap.appendChild(h("p", { class: "muted pad" }, [t("menu.noCategories")]));
    }
    m.Categories.forEach(function (cat, ci) {
      catsWrap.appendChild(renderCategory(cat, ci));
    });
    root.appendChild(catsWrap);
  }

  function renderCategory(cat, ci) {
    var m = state.menu;
    var body = h("div", { class: "accordion-body" }, [
      translationsField(t("menu.name"), cat.Name, function (tr) { cat.Name = tr; },
        { maxLength: 50, entityId: cat.Id, field: "Name", required: true }),
      translationsField(t("menu.description"), cat.Description || {}, function (tr) {
        cat.Description = isEmptyTranslations(tr) ? null : tr;
      }, { maxLength: 200, entityId: cat.Id, field: "Description", multiline: true, rows: 3 }),
      itemsBlock(cat, ci)
    ]);

    var titleText = t("menu.categoryN", { n: ci + 1 }) + nameHint(cat.Name);
    var issues = categoryIssues(cat);
    var title = issues.length
      ? h("span", { class: "accordion-title-wrap" }, [
          titleText,
          h("span", { class: "badge badge-danger badge-sm", title: issues.join(", ") }, ["⚠"])
        ])
      : titleText;

    return accordion(
      title,
      [
        iconButton("↑", t("menu.moveUp"), function (e) { e.stopPropagation(); move(m.Categories, ci, -1); renderContent(); }),
        iconButton("↓", t("menu.moveDown"), function (e) { e.stopPropagation(); move(m.Categories, ci, 1); renderContent(); }),
        iconButton("✕", t("menu.removeCategory"), function (e) {
          e.stopPropagation();
          if (confirm(t("menu.confirmRemoveCategory"))) { m.Categories.splice(ci, 1); renderContent(); }
        })
      ],
      body, false, cat.Id, openCats
    );
  }

  function categoryIssues(cat) {
    var issues = [];
    if (isEmptyTranslations(cat.Name)) issues.push(t("menu.missingName"));
    return issues;
  }

  function itemIssues(item) {
    var issues = [];
    if (isEmptyTranslations(item.Name)) issues.push(t("menu.missingName"));
    return issues;
  }

  function itemsBlock(cat, ci) {
    var wrap = h("div", { class: "subsection" }, [
      sectionHeader(t("menu.items"), t("menu.addItem"), function () {
        var item = newItem(cat.Items.length);
        cat.Items.push(item);
        renderContent();
        openItemEditor(cat, item, cat.Items.length - 1, { isNew: true });
      }, true)
    ]);
    if (!cat.Items.length) {
      wrap.appendChild(h("p", { class: "muted pad" }, [t("menu.noItems")]));
    }
    var list = h("div", { class: "item-row-list" });
    cat.Items.forEach(function (item, ii) {
      list.appendChild(itemRow(cat, item, ii));
    });
    wrap.appendChild(list);
    return wrap;
  }

  // Compact, scannable row for one item — click (or Enter/Space) opens the
  // focused item editor panel instead of expanding an inline accordion.
  function itemRow(cat, item, ii) {
    var issues = itemIssues(item);
    var nameText = firstTranslation(item.Name) || t("menu.untitledItem");
    var row = h("div", { class: "item-row", tabindex: "0", role: "button" }, [
      h("div", { class: "item-row-main" }, [
        h("span", { class: "item-row-name" }, [nameText]),
        h("span", { class: "item-row-price" }, [formatPrice(item.Price)]),
        issues.length
          ? h("span", { class: "badge badge-danger badge-sm", title: issues.join(", ") }, ["⚠ " + issues[0]])
          : null
      ]),
      h("div", { class: "row-actions" }, [
        iconButton("↑", t("menu.moveUp"), function (e) { e.stopPropagation(); move(cat.Items, ii, -1); renderContent(); }),
        iconButton("↓", t("menu.moveDown"), function (e) { e.stopPropagation(); move(cat.Items, ii, 1); renderContent(); }),
        iconButton("✕", t("menu.removeItem"), function (e) {
          e.stopPropagation();
          if (confirm(t("menu.confirmRemoveItem"))) { cat.Items.splice(ii, 1); renderContent(); }
        })
      ])
    ]);
    row.addEventListener("click", function () { openItemEditor(cat, item, ii); });
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItemEditor(cat, item, ii); }
    });
    return row;
  }

  // ---- Focused item editor panel -------------------------------------------
  // Fields mutate the item model live as the user types (see translationsField
  // etc. below), so "Cancel" needs an explicit snapshot to restore from —
  // there is no other undo mechanism.
  function openItemEditor(cat, item, ii, opts) {
    opts = opts || {};
    closeItemEditor();
    ensureActiveLanguage();
    var isNew = !!opts.isNew;

    var bodyWrap = h("div", { class: "modal-card-body" });

    function paintBody() {
      bodyWrap.innerHTML = "";
      bodyWrap.appendChild(grid2([
        priceField(t("menu.price"), item.Price, function (v) { item.Price = floatOr(v, 0); },
          { entityId: item.Id, field: "Price" }),
        tagField(t("menu.tag"), item.Tag, function (v) { item.Tag = v; }, { entityId: item.Id, field: "Tag" })
      ]));
      bodyWrap.appendChild(translationsField(t("menu.name"), item.Name, function (tr) { item.Name = tr; },
        { maxLength: 50, entityId: item.Id, field: "Name", required: true }));
      bodyWrap.appendChild(translationsField(t("menu.shortDesc"), item.ShortDescription || {}, function (tr) {
        item.ShortDescription = isEmptyTranslations(tr) ? null : tr;
      }, { maxLength: 100, entityId: item.Id, field: "ShortDescription", multiline: true, rows: 2 }));
      bodyWrap.appendChild(translationsField(t("menu.fullDesc"), item.FullDescription || {}, function (tr) {
        item.FullDescription = isEmptyTranslations(tr) ? null : tr;
      }, { maxLength: 800, entityId: item.Id, field: "FullDescription", multiline: true, rows: 6 }));
      bodyWrap.appendChild(translationsField(t("menu.ingredients"), item.Ingredients || {}, function (tr) {
        item.Ingredients = isEmptyTranslations(tr) ? null : tr;
      }, { maxLength: 200, entityId: item.Id, field: "Ingredients", multiline: true, rows: 3 }));
      bodyWrap.appendChild(allergensField(item));
      bodyWrap.appendChild(dietsField(item));
      bodyWrap.appendChild(availabilityField(item));
      bodyWrap.appendChild(youTubeField(item));
      bodyWrap.appendChild(imagesField(item));
    }

    currentRerender = paintBody;
    paintBody();
    // Field builders like youTubeField() normalize null-ish array fields to []
    // as a side effect of first render — snapshot after that so the baseline
    // matches what's actually on screen, not the pre-render shape.
    var snapshot = JSON.parse(JSON.stringify(item));

    function hasUnsavedChanges() {
      return JSON.stringify(item) !== JSON.stringify(snapshot);
    }

    function discard() {
      Object.keys(item).forEach(function (k) { delete item[k]; });
      Object.assign(item, snapshot);
      if (isNew) {
        var idx = cat.Items.indexOf(item);
        if (idx !== -1) cat.Items.splice(idx, 1);
      }
      closeItemEditor();
      renderContent();
    }

    // The only two ways to leave the panel are Cancel and the header ✕ — no
    // backdrop click, no Escape — and both must confirm before throwing away
    // any edits already made (nothing to confirm if nothing changed).
    function requestClose() {
      if (!hasUnsavedChanges()) { discard(); return; }
      window.AkutConfirm({
        title:        t("menu.discardChangesTitle"),
        message:      t("menu.discardChangesMessage"),
        confirmLabel: t("menu.discardChangesConfirm"),
        confirmClass: "btn-danger"
      }).then(function (ok) { if (ok) discard(); });
    }

    function commit() {
      closeItemEditor();
      renderContent();
    }

    var header = h("div", { class: "modal-card-header" }, [
      h("h3", null, [t("menu.itemN", { n: ii + 1 }) + nameHint(item.Name)]),
      iconButton("✕", t("confirm.cancel"), requestClose)
    ]);
    var footer = h("div", { class: "modal-actions modal-actions-row" }, [
      h("button", { type: "button", class: "btn btn-ghost", onclick: requestClose }, [t("confirm.cancel")]),
      h("button", { type: "button", class: "btn btn-primary", onclick: commit }, [t("menu.done")])
    ]);
    var panelCard = h("div", { class: "modal-card modal-card-wide" }, [header, bodyWrap, footer]);
    var overlay = h("div", { class: "modal-overlay modal-overlay-full" }, [panelCard]);
    document.body.appendChild(overlay);

    itemPanel = {
      close: function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (currentRerender === paintBody) currentRerender = renderContent;
      }
    };
  }

  function closeItemEditor() {
    if (itemPanel) { itemPanel.close(); itemPanel = null; }
  }

  // ---- Field builders -----------------------------------------------------
  function card(title, children) {
    return h("section", { class: "card" }, [h("h2", null, [title])].concat(children));
  }

  function grid2(children) {
    return h("div", { class: "grid grid-2 tight" }, children);
  }

  function field(labelText, control, help) {
    return h("label", { class: "field" }, [
      h("span", { class: "field-label" }, [labelText]),
      help ? h("span", { class: "field-help" }, [help]) : null,
      control
    ]);
  }

  function textField(label, value, onChange, opts) {
    opts = opts || {};
    var maxLength = opts.maxLength;
    var counter = maxLength ? h("span", { class: "char-counter" }, [counterText(value, maxLength)]) : null;
    var fieldProps = Object.assign({
      placeholder: opts.placeholder || "",
      maxlength: maxLength || null,
      oninput: function (e) {
        onChange(e.target.value);
        updateCounter(counter, e.target.value, maxLength);
      }
    }, fieldAttrs(opts.entityId, opts.field));
    var input;
    if (opts.multiline) {
      input = h("textarea", Object.assign({ rows: opts.rows || 3 }, fieldProps));
      input.value = value || "";
    } else {
      input = h("input", Object.assign({ type: "text", value: value || "" }, fieldProps));
    }
    var control = counter ? h("div", { class: "field-input-row" }, [input, counter]) : input;
    return field(label + (opts.required ? " *" : ""), control, opts.help);
  }

  function comboField(label, value, options, onChange, opts) {
    opts = opts || {};
    var listId = "combo-" + label.replace(/[^a-z]/gi, "").toLowerCase();
    var input = h("input", Object.assign({
      type: "text", value: value || "", placeholder: opts.placeholder || "",
      list: listId,
      oninput: function (e) { onChange(e.target.value); }
    }, fieldAttrs(opts.entityId, opts.field)));
    var datalist = h("datalist", { id: listId },
      options.map(function (o) { return h("option", { value: o }); })
    );
    // datalist must be a sibling of the label, not nested inside it —
    // browsers (especially Safari) won't connect it to the input otherwise.
    return h("div", null, [
      field(label + (opts.required ? " *" : ""), input, opts.help),
      datalist
    ]);
  }

  function priceField(label, value, onChange, attrs) {
    attrs = attrs || {};
    var input = h("input", Object.assign({
      type: "number", value: value == null ? "" : value, step: "0.01", min: "0",
      oninput: function (e) { onChange(e.target.value); }
    }, fieldAttrs(attrs.entityId, attrs.field)));
    return field(label, input);
  }

  function foundedYearField(label, value, onChange, attrs) {
    attrs = attrs || {};
    var currentYear = new Date().getFullYear();
    var input = h("input", Object.assign({
      type: "number", value: value == null ? "" : value,
      min: "1500", max: String(currentYear), step: "1",
      placeholder: "—",
      oninput: function (e) {
        var v = e.target.value.trim();
        onChange(v !== "" ? intOr(v, null) : null);
      }
    }, fieldAttrs(attrs.entityId, attrs.field)));
    return field(label, input, t("menu.foundedYearHelp", { max: currentYear }));
  }

  function selectField(label, value, enumMap, onChange, attrs) {
    attrs = attrs || {};
    var select = h("select", Object.assign({
      onchange: function (e) { onChange(e.target.value); }
    }, fieldAttrs(attrs.entityId, attrs.field)), Object.keys(enumMap).map(function (k) {
      return h("option", { value: k, selected: Number(k) === Number(value) }, [enumMap[k]]);
    }));
    return field(label, select);
  }

  function checkboxField(label, checked, onChange) {
    var input = h("input", {
      type: "checkbox", checked: !!checked,
      onchange: function (e) { onChange(e.target.checked); }
    });
    return h("label", { class: "field field-checkbox" }, [
      input, h("span", null, [label])
    ]);
  }

  function tagField(label, value, onChange, attrs) {
    attrs = attrs || {};
    var options = [h("option", { value: "" }, [t("menu.tag.none")])];
    Object.keys(E.menuItemTag).forEach(function (k) {
      options.push(h("option", { value: k, selected: Number(k) === Number(value) }, [t("menu.tag." + k)]));
    });
    var select = h("select", Object.assign({
      onchange: function (e) {
        var v = e.target.value;
        onChange(v !== "" ? Number(v) : null);
      }
    }, fieldAttrs(attrs.entityId, attrs.field)), options);
    return field(label, select);
  }

  // Active-language translation control: one visible input for the current
  // `activeLanguage`, plus a row of small language dots that switch it and
  // show (via the "has-content" class) which languages already have text.
  // Switching language re-renders whatever `currentRerender` points at
  // (Content view or an open item panel); typing does not, to avoid losing
  // focus on every keystroke — dots are updated in place instead.
  function translationsField(label, trans, onChange, opts) {
    opts = opts || {};
    var maxLength = opts.maxLength;
    var current = Object.assign({}, trans || {});
    var lang = LANGUAGES.filter(function (l) { return l.name === activeLanguage; })[0] || LANGUAGES[0];
    var dotEls = {};

    var counter = maxLength
      ? h("span", { class: "char-counter" }, [counterText(current[lang.name], maxLength)])
      : null;
    var inputProps = Object.assign({
      placeholder: lang.name + "…",
      maxlength: maxLength || null,
      oninput: function (e) {
        var v = e.target.value;
        if (v) current[lang.name] = v; else delete current[lang.name];
        updateCounter(counter, v, maxLength);
        onChange(current);
        var dotEl = dotEls[lang.name];
        if (dotEl) dotEl.classList.toggle("has-content", !!v);
      }
    }, fieldAttrs(opts.entityId, opts.field, lang.name));
    var input;
    if (opts.multiline) {
      input = h("textarea", Object.assign({ rows: opts.rows || 3 }, inputProps));
      input.value = current[lang.name] || "";
    } else {
      input = h("input", Object.assign({ type: "text", value: current[lang.name] || "" }, inputProps));
    }

    var dots = h("div", { class: "lang-dots" }, LANGUAGES.map(function (l) {
      var hasContent = !!current[l.name];
      var btn = h("button", {
        type: "button",
        class: "lang-dot" + (l.name === lang.name ? " is-active" : "") + (hasContent ? " has-content" : ""),
        title: l.name,
        onclick: function () { activeLanguage = l.name; if (currentRerender) currentRerender(); }
      }, [l.name.slice(0, 2).toUpperCase()]);
      dotEls[l.name] = btn;
      return btn;
    }));

    var row = h("div", { class: "field-input-row" }, [input, counter]);
    return h("div", { class: "field" }, [
      h("div", { class: "field-label-row" }, [
        h("span", { class: "field-label" }, [label + (opts.required ? " *" : "")]),
        dots
      ]),
      row
    ]);
  }

  function counterText(v, max) {
    return (v ? v.length : 0) + "/" + max;
  }

  function updateCounter(counter, value, maxLength) {
    if (!counter) return;
    counter.textContent = counterText(value, maxLength);
    counter.classList.toggle("char-counter-limit", (value ? value.length : 0) >= maxLength);
  }

  function ensureActiveLanguage() {
    if (activeLanguage && LANGUAGES.some(function (l) { return l.name === activeLanguage; })) return;
    var m = state.menu;
    activeLanguage = (m && E.language[m.DefaultLanguage]) || (LANGUAGES[0] && LANGUAGES[0].name) || null;
  }

  function availabilityTimeField(label, avail, onChange) {
    var current = {
      From: avail && avail.From != null ? avail.From : null,
      To:   avail && avail.To   != null ? avail.To   : null
    };

    function update() {
      onChange(current.From == null && current.To == null ? null : current);
    }

    function makeInput(which) {
      var hourVal = current[which] != null ? hourFromTimeOnly(current[which]) : "";
      return h("input", {
        type: "number",
        value: hourVal === "" ? "" : String(hourVal),
        min: "0", max: "24", step: "1",
        placeholder: "—",
        oninput: function (e) {
          var v = e.target.value.trim();
          current[which] = v !== "" ? hourToTimeOnly(parseInt(v, 10)) : null;
          update();
        }
      });
    }

    return h("div", Object.assign({ class: "field" }, fieldAttrs(MENU_ENTITY_ID, "AvailabilityTime")), [
      h("span", { class: "field-label" }, [label]),
      h("div", { class: "grid grid-2 tight" }, [
        field(t("menu.availabilityTimeFrom"), makeInput("From")),
        field(t("menu.availabilityTimeTo"), makeInput("To"))
      ])
    ]);
  }

  function hourFromTimeOnly(str) {
    if (str == null) return "";
    var n = parseInt(String(str).split(":")[0], 10);
    return isNaN(n) ? "" : n;
  }

  function hourToTimeOnly(h) {
    if (h == null || isNaN(h)) return null;
    var hh = Math.max(0, Math.min(24, h));
    return (hh < 10 ? "0" : "") + hh + ":00:00";
  }

  function allergensField(item) {
    item.Allergens = item.Allergens || [];
    var boxes = Object.keys(E.allergen).map(function (k) {
      var val = Number(k);
      return h("label", { class: "chip-check" }, [
        h("input", {
          type: "checkbox", value: val,
          checked: item.Allergens.indexOf(val) !== -1,
          onchange: function (e) {
            if (e.target.checked) {
              if (item.Allergens.indexOf(val) === -1) item.Allergens.push(val);
            } else {
              item.Allergens = item.Allergens.filter(function (a) { return a !== val; });
            }
          }
        }),
        h("span", null, [t("menu.allergen." + k)])
      ]);
    });
    return h("div", Object.assign({ class: "field" }, fieldAttrs(item.Id, "Allergens")), [
      h("span", { class: "field-label" }, [t("menu.allergens")]),
      h("div", { class: "chip-grid" }, boxes)
    ]);
  }

  function dietsField(item) {
    item.Diets = item.Diets || [];
    var boxes = Object.keys(E.foodDietType).map(function (k) {
      var val = Number(k);
      return h("label", { class: "chip-check" }, [
        h("input", {
          type: "checkbox", value: val,
          checked: item.Diets.indexOf(val) !== -1,
          onchange: function (e) {
            if (e.target.checked) {
              if (item.Diets.indexOf(val) === -1) item.Diets.push(val);
            } else {
              item.Diets = item.Diets.filter(function (d) { return d !== val; });
            }
          }
        }),
        h("span", null, [E.foodDietType[k]])
      ]);
    });
    return h("div", Object.assign({ class: "field" }, fieldAttrs(item.Id, "Diets")), [
      h("span", { class: "field-label" }, [t("menu.diets")]),
      h("div", { class: "chip-grid" }, boxes)
    ]);
  }

  function availabilityField(item) {
    var avail = item.Availability || null;

    function ensure() {
      if (!item.Availability) item.Availability = { Temporary: null, Standard: null };
      return item.Availability;
    }

    var unavailableCheckbox = checkboxField(
      t("menu.availability.unavailable"),
      !!(avail && avail.Temporary && avail.Temporary.Unavailable),
      function (checked) {
        var a = ensure();
        a.Temporary = checked ? { Unavailable: true } : null;
      }
    );

    var selectedDays = (avail && avail.Standard && avail.Standard.Days) || [];
    var dayBoxes = Object.keys(E.dayOfWeek).map(function (k) {
      var val = Number(k);
      return h("label", { class: "chip-check" }, [
        h("input", {
          type: "checkbox", value: val,
          checked: selectedDays.indexOf(val) !== -1,
          onchange: function (e) {
            var a = ensure();
            var days = (a.Standard && a.Standard.Days) || [];
            if (e.target.checked) {
              if (days.indexOf(val) === -1) days = days.concat([val]);
            } else {
              days = days.filter(function (d) { return d !== val; });
            }
            a.Standard = days.length ? { Days: days } : null;
          }
        }),
        h("span", null, [t("menu.day." + k)])
      ]);
    });

    return h("div", Object.assign({ class: "field" }, fieldAttrs(item.Id, "Availability")), [
      h("span", { class: "field-label" }, [t("menu.availability")]),
      unavailableCheckbox,
      h("span", { class: "field-help" }, [t("menu.availability.days")]),
      h("div", { class: "chip-grid" }, dayBoxes),
      h("span", { class: "field-help" }, [t("menu.availability.daysHelp")])
    ]);
  }

  function youTubeField(item) {
    item.YouTubeVideoUrls = item.YouTubeVideoUrls || [];
    var container = h("div", { class: "video-list" });

    function paint() {
      container.innerHTML = "";
      item.YouTubeVideoUrls.forEach(function (url, idx) {
        container.appendChild(videoRow(idx));
      });
      container.appendChild(h("button", {
        type: "button", class: "btn btn-ghost btn-sm",
        onclick: function () {
          item.YouTubeVideoUrls.push("");
          paint();
        }
      }, [t("menu.addVideo")]));
    }

    // Order is not user-editable — it's derived from position in the array
    // (via the up/down arrows), same as images.
    function videoRow(idx) {
      var urls = item.YouTubeVideoUrls;
      var rowAttrs = fieldAttrs(item.Id, "YouTubeVideoUrls");
      rowAttrs["data-order"] = idx;
      return h("div", Object.assign({ class: "video-row" }, rowAttrs), [
        h("input", {
          type: "text", value: urls[idx] || "", placeholder: t("menu.youtubePlaceholder"),
          oninput: function (e) { urls[idx] = e.target.value; }
        }),
        h("div", { class: "row-actions" }, [
          iconButton("↑", t("menu.moveUp"), function () { move(urls, idx, -1); paint(); }),
          iconButton("↓", t("menu.moveDown"), function () { move(urls, idx, 1); paint(); }),
          iconButton("✕", t("menu.removeVideo"), function () { urls.splice(idx, 1); paint(); })
        ])
      ]);
    }

    paint();
    return h("div", { class: "field" }, [
      h("span", { class: "field-label" }, [t("menu.youtube")]),
      container
    ]);
  }

  function imageField(label, img, onChange, attrs) {
    attrs = attrs || {};
    var model = img ? Object.assign({}, img) : null;
    var container = h("div", { class: "image-box" });

    function paint() {
      container.innerHTML = "";
      if (!model) {
        container.appendChild(h("button", {
          type: "button", class: "btn btn-ghost btn-sm",
          onclick: function () {
            model = { Order: 0, Url: "", Title: null, Source: 0 };
            onChange(model); paint();
          }
        }, [t("menu.addImage")]));
        return;
      }
      container.appendChild(imageEditor(model, function () { onChange(model); }, function () {
        model = null; onChange(null); paint();
      }, attrs));
    }
    paint();
    return h("div", { class: "field" }, [
      h("span", { class: "field-label" }, [label]),
      container
    ]);
  }

  function imagesField(item) {
    item.Images = item.Images || [];
    var container = h("div", { class: "image-list" });

    function paint() {
      container.innerHTML = "";
      item.Images.forEach(function (img, idx) {
        container.appendChild(imageEditor(img, function () {}, function () {
          item.Images.splice(idx, 1); paint();
        }, { entityId: item.Id, field: "Image" }, {
          onMoveUp: function () { move(item.Images, idx, -1); paint(); },
          onMoveDown: function () { move(item.Images, idx, 1); paint(); }
        }));
      });
      container.appendChild(h("button", {
        type: "button", class: "btn btn-ghost btn-sm",
        onclick: function () {
          item.Images.push({ Order: item.Images.length, Url: "", Title: null, Source: 0 });
          paint();
        }
      }, [t("menu.addImage")]));
    }
    paint();
    return h("div", { class: "field" }, [
      h("span", { class: "field-label" }, [t("menu.images")]),
      container
    ]);
  }

  // Order is not user-editable — it's derived from position (via the up/down
  // arrows), same as categories and items. sanitize() rewrites Order from the
  // array index on save.
  function imageEditor(img, onChange, onRemove, attrs, moveHandlers) {
    attrs = attrs || {};
    var rowAttrs = fieldAttrs(attrs.entityId, attrs.field);
    rowAttrs["data-order"] = img.Order == null ? 0 : img.Order;
    var actions = [];
    if (moveHandlers) {
      actions.push(iconButton("↑", t("menu.moveUp"), moveHandlers.onMoveUp));
      actions.push(iconButton("↓", t("menu.moveDown"), moveHandlers.onMoveDown));
    }
    actions.push(iconButton("✕", t("menu.removeImage"), onRemove));
    return h("div", Object.assign({ class: "image-editor" }, rowAttrs), [
      h("div", { class: "image-fields" }, [
        h("input", {
          type: "text", value: img.Url || "", placeholder: t("menu.imageUrl"),
          oninput: function (e) { img.Url = e.target.value; onChange(); }
        }),
        h("input", {
          type: "text", value: img.Title || "", placeholder: t("menu.imageTitle"),
          oninput: function (e) { img.Title = e.target.value || null; onChange(); }
        }),
        h("select", {
          onchange: function (e) { img.Source = Number(e.target.value); onChange(); }
        }, Object.keys(E.imageSource).map(function (k) {
          return h("option", { value: k, selected: Number(k) === Number(img.Source) },
            [E.imageSource[k]]);
        }))
      ]),
      h("div", { class: "row-actions" }, actions)
    ]);
  }

  // ---- Structural helpers -------------------------------------------------
  function sectionHeader(title, addLabel, onAdd, small) {
    return h("div", { class: "section-header" }, [
      h(small ? "h4" : "h3", null, [title]),
      h("button", {
        type: "button", class: "btn btn-secondary btn-sm", onclick: onAdd
      }, [addLabel])
    ]);
  }

  function accordion(title, actions, body, nested, id, openMap) {
    var open = !!(id && openMap && openMap[id]);
    var bodyWrap = h("div", { class: "accordion-content", hidden: !open }, [body]);
    var caret = h("span", { class: "caret" }, [open ? "▾" : "▸"]);
    var header = h("div", { class: "accordion-header" }, [
      h("button", {
        type: "button", class: "accordion-toggle",
        onclick: function () {
          open = !open;
          if (id && openMap) openMap[id] = open;
          bodyWrap.hidden = !open;
          caret.textContent = open ? "▾" : "▸";
        }
      }, [caret, h("span", null, [title])]),
      h("div", { class: "accordion-actions" }, actions)
    ]);
    return h("div", { class: "accordion" + (nested ? " accordion-nested" : "") }, [header, bodyWrap]);
  }

  function iconButton(glyph, title, onClick) {
    return h("button", {
      type: "button", class: "icon-btn", title: title, onclick: onClick
    }, [glyph]);
  }

  function newCategory(order) {
    return { Id: uuid(), Order: order, Name: {}, Description: null, Items: [] };
  }

  function newItem(order) {
    return {
      Id: uuid(), Order: order, Diets: [], Allergens: [], Images: [], YouTubeVideoUrls: null,
      Name: {}, ShortDescription: null, FullDescription: null,
      Ingredients: null, Price: 0, Tag: null, Availability: null
    };
  }

  function firstTranslation(trans) {
    if (!trans) return "";
    var first = Object.keys(trans)[0];
    return first ? trans[first] : "";
  }

  function nameHint(trans) {
    var v = firstTranslation(trans);
    return v ? " — " + v : "";
  }

  function formatPrice(v) {
    var n = Number(v);
    return isNaN(n) ? "0.00" : n.toFixed(2);
  }

  function move(arr, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= arr.length) return;
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }

  function byOrder(a, b) { return intOr(a && a.Order, 0) - intOr(b && b.Order, 0); }

  // ---- Status button visibility -------------------------------------------
  function updateStatusButtons() {
    var isNew      = !state.menuId;
    var isActive   = state.status === "Active";
    var isDisabled = state.status === "Disabled";
    var isDeleted  = state.status === "Deleted";
    if (refs.disableMenuBtn)  refs.disableMenuBtn.hidden  = isNew || !isActive;
    if (refs.deleteMenuBtn)   refs.deleteMenuBtn.hidden   = isNew || !isDisabled;
    if (refs.restoreMenuBtn)  refs.restoreMenuBtn.hidden  = isNew || !isDeleted;
    // Editing a deleted menu is read-only — save/publish are blocked server-side anyway.
    refs.saveBtn.disabled    = isDeleted;
    refs.publishBtn.disabled = isDeleted;
  }

  // ---- Disable / Delete from editor ---------------------------------------
  function disableMenu() {
    if (!state.menuId) return;
    window.AkutConfirm({
      title:        t("menu.disable"),
      message:      t("menu.confirmDisable"),
      confirmLabel: t("menu.disable"),
      confirmClass: "btn-secondary"
    }).then(function (ok) {
      if (!ok) return;
      setBusy(true);
      refs.disableMenuBtn.textContent = t("menu.disabling");
      AkutApi.setMenuStatus(state.menuId, "disabled")
        .then(function () {
          state.status = "Disabled";
          if (refs.statusSelect) refs.statusSelect.value = state.status;
          updateStatusButtons();
          alert("success", t("menu.disabledSuccess"));
        })
        .catch(function (err) { showApiError(err, "menu.errorSave"); })
        .finally(function () {
          setBusy(false);
          if (refs.disableMenuBtn) refs.disableMenuBtn.textContent = t("menu.disable");
        });
    });
  }

  function deleteMenu() {
    if (!state.menuId) return;
    window.AkutConfirm({
      title:        t("menu.delete"),
      message:      t("menu.confirmDelete"),
      confirmLabel: t("menu.delete"),
      confirmClass: "btn-danger"
    }).then(function (ok) {
      if (!ok) return;
      setBusy(true);
      refs.deleteMenuBtn.textContent = t("menu.deleting");
      AkutApi.deleteMenu(state.menuId)
        .then(function () {
          window.MenuList && window.MenuList.showListView();
        })
        .catch(function (err) { showApiError(err, "menu.errorSave"); })
        .finally(function () {
          setBusy(false);
          if (refs.deleteMenuBtn) refs.deleteMenuBtn.textContent = t("menu.delete");
        });
    });
  }

  function restoreMenu() {
    if (!state.menuId) return;
    setBusy(true);
    refs.restoreMenuBtn.textContent = t("menu.restoring");
    AkutApi.setMenuStatus(state.menuId, "disabled")
      .then(function () {
        state.status = "Disabled";
        if (refs.statusSelect) refs.statusSelect.value = state.status;
        updateStatusButtons();
        alert("success", t("menu.restoredSuccess"));
      })
      .catch(function (err) { showApiError(err, "menu.errorSave"); })
      .finally(function () {
        setBusy(false);
        if (refs.restoreMenuBtn) refs.restoreMenuBtn.textContent = t("menu.restore");
      });
  }

  // ---- Preview ------------------------------------------------------------
  function preview() {
    if (!state.menu) { alert("error", t("menu.errorNothingToSave")); return; }
    if (state.view === "json") applyJson();
    clearAlert();
    var payload = sanitize(state.menu);

    var problem = validate(payload);
    if (problem) { alert("error", problem); return; }

    setBusy(true);
    if (refs.previewBtn) refs.previewBtn.textContent = t("menu.previewing");
    // Use existing menuId as path param, or a temporary uuid for new menus.
    var previewId = state.menuId || uuid();
    AkutApi.previewMenu(previewId, payload)
      .then(function (result) {
        var menuId = (result && result.menuId) ? result.menuId : previewId;
        var tenant = AkutApi.getSubTenant();
        var previewUrl = "https://menu.akut.pt/preview/" +
          encodeURIComponent(tenant) + "/" + encodeURIComponent(menuId);
        window.open(previewUrl, "_blank", "noopener,noreferrer");
      })
      .catch(function (err) { showApiError(err, "menu.errorPreview"); })
      .finally(function () {
        setBusy(false);
        if (refs.previewBtn) refs.previewBtn.textContent = t("menu.preview");
      });
  }

  // ---- Save ---------------------------------------------------------------
  // publish=false → save body only, keep current status (POST for new, PUT for existing)
  // publish=true  → save body + activate (POST→PATCH or PUT→PATCH if not already Active)
  function save(publish) {
    if (!state.menu) { alert("error", t("menu.errorNothingToSave")); return; }
    if (state.view === "json") applyJson();
    clearAlert();
    var payload = sanitize(state.menu);

    var problem = validate(payload);
    if (problem) { alert("error", problem); return; }

    setBusy(true);

    if (!state.menuId) {
      // New menu: create first (always starts as Disabled), then activate if publishing.
      AkutApi.createMenu(payload)
        .then(function (result) {
          state.menuId = result.menuId;
          state.status = "Disabled";
          if (refs.statusSelect) refs.statusSelect.value = state.status;
          if (!publish) {
            alert("success", t("menu.savedAs", { status: t("menu.status.Disabled") }));
            return;
          }
          return AkutApi.setMenuStatus(state.menuId, "active").then(function () {
            state.status = "Active";
            if (refs.statusSelect) refs.statusSelect.value = state.status;
            updateStatusButtons();
            alert("success", t("menu.savedAs", { status: t("menu.status.Active") }));
          });
        })
        .catch(function (err) { showApiError(err, "menu.errorSave"); })
        .finally(function () { setBusy(false); });
    } else {
      // Existing menu: update body, then activate if publishing and not already Active.
      AkutApi.updateMenu(state.menuId, payload)
        .then(function () {
          if (!publish || state.status === "Active") {
            var statusKey = state.status || "Disabled";
            alert("success", t("menu.savedAs", { status: t("menu.status." + statusKey) }));
            return;
          }
          return AkutApi.setMenuStatus(state.menuId, "active").then(function () {
            state.status = "Active";
            if (refs.statusSelect) refs.statusSelect.value = state.status;
            updateStatusButtons();
            alert("success", t("menu.savedAs", { status: t("menu.status.Active") }));
          });
        })
        .catch(function (err) { showApiError(err, "menu.errorSave"); })
        .finally(function () { setBusy(false); });
    }
  }

  function validate(menu) {
    if (!menu.TemplateId) return t("menu.errorTemplateId");
    if (isEmptyTranslations(menu.Name)) return t("menu.errorName");
    if (menu.FoundedYear != null) {
      var currentYear = new Date().getFullYear();
      if (menu.FoundedYear < 1500 || menu.FoundedYear > currentYear) {
        return t("menu.errorFoundedYear", { max: currentYear });
      }
    }
    return null;
  }

  function setBusy(busy) {
    var isDeleted = state.status === "Deleted";
    refs.saveBtn.disabled    = busy || isDeleted;
    refs.publishBtn.disabled = busy || isDeleted;
    if (refs.previewBtn)     refs.previewBtn.disabled     = busy;
    if (refs.disableMenuBtn) refs.disableMenuBtn.disabled = busy;
    if (refs.deleteMenuBtn)  refs.deleteMenuBtn.disabled  = busy;
    if (refs.restoreMenuBtn) refs.restoreMenuBtn.disabled = busy;
    refs.publishBtn.textContent = busy ? t("menu.saving") : t("menu.publish");
  }

  function sanitize(menu) {
    var avail = menu.AvailabilityTime;
    return {
      // Id and Status are managed server-side; omit from the body.
      Logo: cleanImage(menu.Logo),
      Name: cleanTranslations(menu.Name),
      AvailabilityTime: (avail && (avail.From != null || avail.To != null))
        ? { From: avail.From || null, To: avail.To || null }
        : null,
      Description: cleanTranslationsOrNull(menu.Description),
      Notes: menu.Notes || null,
      FoundedYear: menu.FoundedYear != null ? intOr(menu.FoundedYear, null) : null,
      TemplateId: menu.TemplateId || "",
      DefaultLanguage: Number(menu.DefaultLanguage),
      Currency: Number(menu.Currency),
      Categories: (menu.Categories || []).map(function (cat, ci) {
        return {
          Id: cat.Id || uuid(),
          // Order reflects the current position — set by the up/down arrows.
          Order: ci,
          Name: cleanTranslations(cat.Name),
          Description: cleanTranslationsOrNull(cat.Description),

          Items: (cat.Items || []).map(function (item, ii) {
            return {
              Id: item.Id || uuid(),
              Order: ii,
              Diets: (item.Diets && item.Diets.length) ? item.Diets.map(Number) : null,
              Images: cleanImages(item.Images),
              YouTubeVideoUrls: cleanYouTubeUrls(item.YouTubeVideoUrls),
              Name: cleanTranslations(item.Name),
              ShortDescription: cleanTranslationsOrNull(item.ShortDescription),
              FullDescription: cleanTranslationsOrNull(item.FullDescription),
              Ingredients: cleanTranslationsOrNull(item.Ingredients),
              Allergens: (item.Allergens && item.Allergens.length) ? item.Allergens.map(Number) : null,
              Price: floatOr(item.Price, 0),
              Tag: item.Tag != null ? intOr(item.Tag, null) : null,
              Availability: cleanAvailability(item.Availability)
            };
          })
        };
      })
    };
  }

  function cleanAvailability(avail) {
    if (!avail) return null;
    var temporary = (avail.Temporary && avail.Temporary.Unavailable === true)
      ? { Unavailable: true } : null;
    var days = (avail.Standard && Array.isArray(avail.Standard.Days) && avail.Standard.Days.length)
      ? avail.Standard.Days.map(Number) : null;
    var standard = days ? { Days: days } : null;
    return (temporary || standard) ? { Temporary: temporary, Standard: standard } : null;
  }

  function cleanImage(img) {
    if (!img || !img.Url) return null;
    return { Order: intOr(img.Order, 0), Url: img.Url, Title: img.Title || null, Source: Number(img.Source) || 0 };
  }

  function cleanImages(images) {
    var cleaned = (images || []).map(cleanImage).filter(Boolean);
    // Order reflects the current position — set by the up/down arrows.
    cleaned.forEach(function (img, idx) { img.Order = idx; });
    return cleaned.length ? cleaned : null;
  }

  // Order reflects the current position — set by the up/down arrows.
  function cleanYouTubeUrls(urls) {
    var cleaned = (urls || []).map(function (u) { return (u || "").trim(); }).filter(Boolean);
    return cleaned.length ? cleaned : null;
  }

  function cleanTranslations(trans) {
    var out = {};
    Object.keys(trans || {}).forEach(function (k) { if (trans[k]) out[k] = trans[k]; });
    return out;
  }

  function cleanTranslationsOrNull(trans) {
    var out = cleanTranslations(trans);
    return Object.keys(out).length ? out : null;
  }

  function isEmptyTranslations(trans) {
    return !trans || Object.keys(cleanTranslations(trans)).length === 0;
  }

  function intOr(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  function floatOr(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
})();
