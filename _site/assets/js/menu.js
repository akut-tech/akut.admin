/* Menu editor: loads a menu (Active or Draft) from the API, renders a
 * form-based editor over the akut.domain Menu shape, and saves it back via
 * PUT. A raw-JSON tab mirrors the same state for power users.
 *
 * Property casing is PascalCase to match the lambda's Newtonsoft (de)serialization.
 * Translations are objects keyed by Language *name* (e.g. "English"); other
 * enums are stored as their integer values. */
(function () {
  "use strict";

  var E = window.AKUT_ENUMS;
  var LANGUAGES = Object.keys(E.language).map(function (k) {
    return { value: Number(k), name: E.language[k] };
  });

  var TEMPLATE_PRESETS = ["default", "epicurean", "deepblue", "senjutsu", "lisbon"];

  var state = {
    menuId: null,
    status: "Active",
    menu: null,
    view: "form"
  };

  // Tracks which accordion IDs are open so renderForm() can restore them
  var openCats  = {};
  var openItems = {};

  var refs = {};
  document.addEventListener("DOMContentLoaded", function () {
    // Map logical ref names to the actual DOM element IDs used in menu.html
    refs.statusSelect  = document.getElementById("statusSelect");
    refs.loadBtn       = document.getElementById("loadBtn");
    refs.newBtn        = document.getElementById("newEditorBtn");
    refs.formTab       = document.getElementById("formTab");
    refs.jsonTab       = document.getElementById("jsonTab");
    refs.saveDraftBtn  = document.getElementById("saveDraftBtn");
    refs.publishBtn    = document.getElementById("publishBtn");
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
    refs.saveDraftBtn.addEventListener("click", function () { save("Draft"); });
    refs.publishBtn.addEventListener("click", function () { save("Active"); });
    refs.formTab.addEventListener("click", function () { switchView("form"); });
    refs.jsonTab.addEventListener("click", function () { switchView("json"); });
    refs.jsonApply.addEventListener("click", applyJson);
    refs.backToListBtn.addEventListener("click", function () {
      window.MenuList && window.MenuList.showListView();
    });

    // Expose editor API — called by menu-list.js on item click or "New menu"
    window.MenuEditor = {
      open: function (menuId, status) {
        state.menuId = menuId;
        state.status = status || "Active";
        state.menu   = null;
        state.view   = "form";
        openCats  = {};
        openItems = {};
        refs.statusSelect.value = state.status;
        load();
      },
      newMenu: function (status) {
        state.status = status || "Draft";
        refs.statusSelect.value = state.status;
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

  // ---- Load / new ---------------------------------------------------------
  function load() {
    clearAlert();
    state.status = refs.statusSelect.value;
    showOnly("loading");
    AkutApi.getMenu(state.menuId, state.status)
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
    state.menuId = null;
    state.menu = {
      Id: uuid(),
      Logo: null,
      Name: {},
      AvailabilityTime: null,
      Description: null,
      Notes: null,
      FoundedYear: null,
      TemplateId: "",
      DefaultLanguage: 2,
      Currency: 1,
      Categories: [],
      Status: state.status === "Draft" ? 2 : 1
    };
    render();
  }

  function normalize(menu) {
    menu.Name = menu.Name || {};
    menu.Categories = menu.Categories || [];
    menu.Categories.forEach(function (cat) {
      cat.Name = cat.Name || {};
      cat.Items = cat.Items || [];
      cat.Items.forEach(function (item) {
        if (item.IsNew && item.Tag == null) item.Tag = 1;
        delete item.IsNew;
      });
    });
    return menu;
  }

  function showOnly(which) {
    refs.loadingState.hidden = which !== "loading";
    refs.emptyState.hidden   = which !== "empty";
    var hasEditor = which === "editor";
    refs.editorRoot.hidden = !(hasEditor && state.view === "form");
    refs.jsonRoot.hidden   = !(hasEditor && state.view === "json");
  }

  // ---- View switching -----------------------------------------------------
  function switchView(view) {
    if (!state.menu) return;
    state.view = view;
    refs.formTab.classList.toggle("is-active", view === "form");
    refs.jsonTab.classList.toggle("is-active", view === "json");
    if (view === "json") {
      refs.jsonArea.value = JSON.stringify(sanitize(state.menu), null, 2);
      refs.jsonStatus.textContent = "";
    } else {
      renderForm();
    }
    showOnly("editor");
  }

  function applyJson() {
    try {
      var parsed = JSON.parse(refs.jsonArea.value);
      state.menu = normalize(parsed);
      switchView("form");
    } catch (e) {
      refs.jsonStatus.textContent = t("menu.jsonInvalid", { msg: e.message });
      refs.jsonStatus.className = "field-saved field-error";
    }
  }

  function render() {
    if (state.view === "form") renderForm();
    showOnly("editor");
  }

  // ---- Form rendering -----------------------------------------------------
  function renderForm() {
    var m = state.menu;
    var root = refs.editorRoot;
    root.innerHTML = "";

    root.appendChild(card(t("menu.details"), [
      grid2([
        comboField(t("menu.templateId"), m.TemplateId, TEMPLATE_PRESETS, function (v) { m.TemplateId = v; },
          { required: true, placeholder: t("menu.templateIdPlaceholder"), help: t("menu.templateIdHelp") }),
        selectField(t("menu.defaultLanguage"), m.DefaultLanguage, E.language, function (v) {
          m.DefaultLanguage = Number(v);
        })
      ]),
      grid2([
        selectField(t("menu.currency"), m.Currency, E.currency, function (v) { m.Currency = Number(v); }),
        textField(t("menu.notes"), m.Notes || "", function (v) { m.Notes = v || null; })
      ]),
      grid2([
        foundedYearField(t("menu.foundedYear"), m.FoundedYear, function (v) { m.FoundedYear = v; }),
        null
      ]),
      availabilityTimeField(t("menu.availabilityTime"), m.AvailabilityTime, function (avail) {
        m.AvailabilityTime = avail;
      }),
      translationsField(t("menu.name"), m.Name, function (tr) { m.Name = tr; }),
      translationsField(t("menu.description"), m.Description || {}, function (tr) {
        m.Description = isEmptyTranslations(tr) ? null : tr;
      }),
      imageField(t("menu.logo"), m.Logo, function (img) { m.Logo = img; })
    ]));

    var catsWrap = h("div", { class: "section" }, [
      sectionHeader(t("menu.categories"), t("menu.addCategory"), function () {
        m.Categories.push(newCategory(m.Categories.length));
        renderForm();
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
      grid2([
        numberField(t("menu.order"), cat.Order, function (v) { cat.Order = intOr(v, 0); }),
        null
      ]),
      translationsField(t("menu.name"), cat.Name, function (tr) { cat.Name = tr; }),
      translationsField(t("menu.description"), cat.Description || {}, function (tr) {
        cat.Description = isEmptyTranslations(tr) ? null : tr;
      }),
      imageField(t("menu.categoryImage"), cat.Image, function (img) { cat.Image = img; }),
      itemsBlock(cat, ci)
    ]);

    return accordion(
      t("menu.categoryN", { n: ci + 1 }) + nameHint(cat.Name),
      [
        iconButton("↑", t("menu.moveUp"), function () { move(m.Categories, ci, -1); renderForm(); }),
        iconButton("↓", t("menu.moveDown"), function () { move(m.Categories, ci, 1); renderForm(); }),
        iconButton("✕", t("menu.removeCategory"), function () {
          if (confirm(t("menu.confirmRemoveCategory"))) { m.Categories.splice(ci, 1); renderForm(); }
        })
      ],
      body, false, cat.Id, openCats
    );
  }

  function itemsBlock(cat, ci) {
    var wrap = h("div", { class: "subsection" }, [
      sectionHeader(t("menu.items"), t("menu.addItem"), function () {
        cat.Items.push(newItem(cat.Items.length));
        renderForm();
      }, true)
    ]);
    if (!cat.Items.length) {
      wrap.appendChild(h("p", { class: "muted pad" }, [t("menu.noItems")]));
    }
    cat.Items.forEach(function (item, ii) {
      wrap.appendChild(renderItem(cat, item, ii));
    });
    return wrap;
  }

  function renderItem(cat, item, ii) {
    var body = h("div", { class: "accordion-body" }, [
      grid2([
        numberField(t("menu.order"), item.Order, function (v) { item.Order = intOr(v, 0); }),
        priceField(t("menu.price"), item.Price, function (v) { item.Price = floatOr(v, 0); })
      ]),
      tagField(t("menu.tag"), item.Tag, function (v) { item.Tag = v; }),
      translationsField(t("menu.name"), item.Name, function (tr) { item.Name = tr; }),
      translationsField(t("menu.shortDesc"), item.ShortDescription || {}, function (tr) {
        item.ShortDescription = isEmptyTranslations(tr) ? null : tr;
      }),
      translationsField(t("menu.fullDesc"), item.FullDescription || {}, function (tr) {
        item.FullDescription = isEmptyTranslations(tr) ? null : tr;
      }),
      translationsField(t("menu.ingredients"), item.Ingredients || {}, function (tr) {
        item.Ingredients = isEmptyTranslations(tr) ? null : tr;
      }),
      translationsField(t("menu.allergens"), item.Allergens || {}, function (tr) {
        item.Allergens = isEmptyTranslations(tr) ? null : tr;
      }),
      dietsField(item),
      youTubeField(item),
      imagesField(item)
    ]);

    return accordion(
      t("menu.itemN", { n: ii + 1 }) + nameHint(item.Name),
      [
        iconButton("↑", t("menu.moveUp"), function () { move(cat.Items, ii, -1); renderForm(); }),
        iconButton("↓", t("menu.moveDown"), function () { move(cat.Items, ii, 1); renderForm(); }),
        iconButton("✕", t("menu.removeItem"), function () {
          if (confirm(t("menu.confirmRemoveItem"))) { cat.Items.splice(ii, 1); renderForm(); }
        })
      ],
      body, true, item.Id, openItems
    );
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
    var input = h("input", {
      type: "text", value: value || "", placeholder: opts.placeholder || "",
      oninput: function (e) { onChange(e.target.value); }
    });
    return field(label + (opts.required ? " *" : ""), input);
  }

  function comboField(label, value, options, onChange, opts) {
    opts = opts || {};
    var listId = "combo-" + label.replace(/[^a-z]/gi, "").toLowerCase();
    var input = h("input", {
      type: "text", value: value || "", placeholder: opts.placeholder || "",
      list: listId,
      oninput: function (e) { onChange(e.target.value); }
    });
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

  function numberField(label, value, onChange) {
    var input = h("input", {
      type: "number", value: value == null ? "" : value, step: "1",
      oninput: function (e) { onChange(e.target.value); }
    });
    return field(label, input);
  }

  function priceField(label, value, onChange) {
    var input = h("input", {
      type: "number", value: value == null ? "" : value, step: "0.01", min: "0",
      oninput: function (e) { onChange(e.target.value); }
    });
    return field(label, input);
  }

  function foundedYearField(label, value, onChange) {
    var currentYear = new Date().getFullYear();
    var input = h("input", {
      type: "number", value: value == null ? "" : value,
      min: "1500", max: String(currentYear), step: "1",
      placeholder: "—",
      oninput: function (e) {
        var v = e.target.value.trim();
        onChange(v !== "" ? intOr(v, null) : null);
      }
    });
    return field(label, input, t("menu.foundedYearHelp", { max: currentYear }));
  }

  function selectField(label, value, enumMap, onChange) {
    var select = h("select", {
      onchange: function (e) { onChange(e.target.value); }
    }, Object.keys(enumMap).map(function (k) {
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

  function tagField(label, value, onChange) {
    var options = [h("option", { value: "" }, [t("menu.tag.none")])];
    Object.keys(E.menuItemTag).forEach(function (k) {
      options.push(h("option", { value: k, selected: Number(k) === Number(value) }, [t("menu.tag." + k)]));
    });
    var select = h("select", {
      onchange: function (e) {
        var v = e.target.value;
        onChange(v !== "" ? Number(v) : null);
      }
    }, options);
    return field(label, select);
  }

  function translationsField(label, trans, onChange) {
    var current = Object.assign({}, trans || {});
    var inputs = LANGUAGES.map(function (lang) {
      return h("div", { class: "trans-row" }, [
        h("span", { class: "trans-lang" }, [lang.name]),
        h("input", {
          type: "text", value: current[lang.name] || "",
          placeholder: lang.name + "…",
          oninput: function (e) {
            var v = e.target.value;
            if (v) current[lang.name] = v; else delete current[lang.name];
            onChange(current);
          }
        })
      ]);
    });
    return h("div", { class: "field" }, [
      h("span", { class: "field-label" }, [label]),
      h("div", { class: "trans-grid" }, inputs)
    ]);
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

    return h("div", { class: "field" }, [
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
    return h("div", { class: "field" }, [
      h("span", { class: "field-label" }, [t("menu.diets")]),
      h("div", { class: "chip-grid" }, boxes)
    ]);
  }

  function youTubeField(item) {
    var input = h("textarea", {
      rows: "2", placeholder: t("menu.youtubePlaceholder"),
      oninput: function (e) {
        var urls = e.target.value.split("\n").map(function (s) { return s.trim(); })
          .filter(Boolean);
        item.YouTubeVideoUrls = urls.length ? urls : null;
      }
    });
    input.value = (item.YouTubeVideoUrls || []).join("\n");
    return field(t("menu.youtube"), input);
  }

  function imageField(label, img, onChange) {
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
      }));
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

  function imageEditor(img, onChange, onRemove) {
    return h("div", { class: "image-editor" }, [
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
        })),
        h("input", {
          type: "number", class: "order-input", value: img.Order == null ? 0 : img.Order,
          title: t("menu.order"),
          oninput: function (e) { img.Order = intOr(e.target.value, 0); onChange(); }
        })
      ]),
      iconButton("✕", t("menu.removeImage"), onRemove)
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
    return { Id: uuid(), Order: order, Name: {}, Description: null, Items: [], Image: null };
  }

  function newItem(order) {
    return {
      Id: uuid(), Order: order, Diets: [], Images: [], YouTubeVideoUrls: null,
      Name: {}, ShortDescription: null, FullDescription: null,
      Ingredients: null, Allergens: null, Price: 0, Tag: null
    };
  }

  function nameHint(trans) {
    if (!trans) return "";
    var first = Object.keys(trans)[0];
    return first ? " — " + trans[first] : "";
  }

  function move(arr, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= arr.length) return;
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }

  // ---- Save ---------------------------------------------------------------
  function save(targetStatus) {
    if (!state.menu) { alert("error", t("menu.errorNothingToSave")); return; }
    if (state.view === "json") applyJson();
    clearAlert();
    var payload = sanitize(state.menu);
    payload.Status = targetStatus === "Draft" ? 2 : 1;

    var problem = validate(payload);
    if (problem) { alert("error", problem); return; }

    setBusy(true);
    AkutApi.saveMenu(payload)
      .then(function () {
        state.menu.Status = payload.Status;
        alert("success", t("menu.savedAs", { status: t("menu.status." + targetStatus) }));
      })
      .catch(function (err) { alert("error", err.message || t("menu.errorSave")); })
      .finally(function () { setBusy(false); });
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
    refs.saveDraftBtn.disabled = busy;
    refs.publishBtn.disabled = busy;
    refs.publishBtn.textContent = busy ? t("menu.saving") : t("menu.publish");
  }

  function sanitize(menu) {
    var avail = menu.AvailabilityTime;
    return {
      Id: menu.Id || uuid(),
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
      Status: Number(menu.Status),
      Categories: (menu.Categories || []).map(function (cat) {
        return {
          Id: cat.Id || uuid(),
          Order: intOr(cat.Order, 0),
          Name: cleanTranslations(cat.Name),
          Description: cleanTranslationsOrNull(cat.Description),
          Image: cleanImage(cat.Image),
          Items: (cat.Items || []).map(function (item) {
            return {
              Id: item.Id || uuid(),
              Order: intOr(item.Order, 0),
              Diets: (item.Diets && item.Diets.length) ? item.Diets.map(Number) : null,
              Images: cleanImages(item.Images),
              YouTubeVideoUrls: (item.YouTubeVideoUrls && item.YouTubeVideoUrls.length)
                ? item.YouTubeVideoUrls : null,
              Name: cleanTranslations(item.Name),
              ShortDescription: cleanTranslationsOrNull(item.ShortDescription),
              FullDescription: cleanTranslationsOrNull(item.FullDescription),
              Ingredients: cleanTranslationsOrNull(item.Ingredients),
              Allergens: cleanTranslationsOrNull(item.Allergens),
              Price: floatOr(item.Price, 0),
              Tag: item.Tag != null ? intOr(item.Tag, null) : null
            };
          })
        };
      })
    };
  }

  function cleanImage(img) {
    if (!img || !img.Url) return null;
    return { Order: intOr(img.Order, 0), Url: img.Url, Title: img.Title || null, Source: Number(img.Source) || 0 };
  }

  function cleanImages(images) {
    var cleaned = (images || []).map(cleanImage).filter(Boolean);
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
