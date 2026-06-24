(function () {
  "use strict";

  var LANG_KEY = "akut.admin.lang";
  var DEFAULT_LANG = "en";

  var translations = {
    en: {
      "nav.brand": "Akut Admin",
      "nav.dashboard": "Dashboard",
      "nav.menu": "Menu",
      "nav.tenant": "Tenant",
      "nav.signOut": "Sign out",

      "login.brand": "Akut Admin",
      "login.tagline": "Manage menus & tenants",
      "login.username": "Username",
      "login.password": "Password",
      "login.submit": "Sign in",
      "login.submitting": "Signing in…",
      "login.errorEmpty": "Please enter both username and password.",
      "login.errorFailed": "Sign-in failed. Please try again.",

      "page.dashboard.heading": "Dashboard",
      "page.dashboard.subheading": "Manage your Akut menu and tenant status",
      "page.menu.heading": "Menu editor",
      "page.menu.subheading": "Edit the active menu or work on a draft",
      "page.tenant.heading": "Tenant",
      "page.tenant.subheading": "Enable or disable this tenant",

      "dashboard.cardMenu.title": "Menu",
      "dashboard.cardMenu.desc": "View and edit the active menu, work on a draft, and publish changes.",
      "dashboard.cardMenu.cta": "Open menu editor →",
      "dashboard.cardTenant.title": "Tenant",
      "dashboard.cardTenant.desc": "Enable or disable the tenant. Disabling hides the menu from customers.",
      "dashboard.cardTenant.cta": "Manage tenant →",
      "dashboard.session.title": "Session",
      "dashboard.session.signedInAs": "Signed in as",
      "dashboard.session.email": "Email",
      "dashboard.session.role": "Role",
      "dashboard.session.tenant": "Tenant",
      "dashboard.subTenant.label": "Target sub-tenant",
      "dashboard.subTenant.help": "Choose which sub-tenant your requests apply to. The options come from your account’s <code>custom:subtenants</code> claim and the selection is sent as the <code>sub-tenant</code> header.",
      "dashboard.subTenant.save": "Save",
      "dashboard.subTenant.saved": "Saved ✓",
      "dashboard.role.admin": "Admin",
      "dashboard.role.customer": "Customer",

      "menu.editing": "Editing",
      "menu.activeMenu": "Active menu",
      "menu.draft": "Draft",
      "menu.load": "Load",
      "menu.newMenu": "New menu",
      "menu.form": "Form",
      "menu.json": "JSON",
      "menu.saveDraft": "Save as draft",
      "menu.publish": "Publish (Active)",
      "menu.loading": "Loading…",
      "menu.empty": "No menu loaded. Choose <strong>Active menu</strong> or <strong>Draft</strong> and press <strong>Load</strong>, or start a <strong>New menu</strong>.",
      "menu.jsonHelp": "Raw menu payload sent to <code>PUT {path}</code>. Edit carefully — this must match the akut.domain <code>Menu</code> shape.",
      "menu.applyToForm": "Apply to form",
      "menu.details": "Menu details",
      "menu.templateId": "Template ID",
      "menu.templateIdPlaceholder": "e.g. classic-01",
      "menu.defaultLanguage": "Default language",
      "menu.currency": "Currency",
      "menu.notes": "Notes (internal)",
      "menu.name": "Name",
      "menu.description": "Description",
      "menu.logo": "Logo",
      "menu.categories": "Categories",
      "menu.addCategory": "Add category",
      "menu.noCategories": "No categories yet.",
      "menu.order": "Order",
      "menu.categoryImage": "Category image",
      "menu.items": "Items",
      "menu.addItem": "Add item",
      "menu.noItems": "No items yet.",
      "menu.price": "Price",
      "menu.markAsNew": "Mark as new",
      "menu.shortDesc": "Short description",
      "menu.fullDesc": "Full description",
      "menu.ingredients": "Ingredients",
      "menu.allergens": "Allergens",
      "menu.diets": "Diets",
      "menu.youtube": "YouTube video URLs",
      "menu.youtubePlaceholder": "One URL per line",
      "menu.images": "Images",
      "menu.imageUrl": "Image URL",
      "menu.imageTitle": "Title (optional)",
      "menu.addImage": "+ Add image",
      "menu.moveUp": "Move up",
      "menu.moveDown": "Move down",
      "menu.removeCategory": "Remove category",
      "menu.removeItem": "Remove item",
      "menu.removeImage": "Remove image",
      "menu.confirmRemoveCategory": "Remove this category and its items?",
      "menu.confirmRemoveItem": "Remove this item?",
      "menu.saving": "Saving…",
      "menu.savedAs": "Menu saved as {status}.",
      "menu.status.Active": "Active",
      "menu.status.Draft": "Draft",
      "menu.errorTemplateId": "Template ID is required.",
      "menu.errorName": "Menu name needs at least one translation.",
      "menu.errorLoad": "Failed to load menu.",
      "menu.errorSave": "Failed to save menu.",
      "menu.errorNothingToSave": "Nothing to save — load or create a menu first.",
      "menu.jsonApplied": "Applied ✓",
      "menu.jsonInvalid": "Invalid JSON: {msg}",
      "menu.categoryN": "Category {n}",
      "menu.itemN": "Item {n}",

      "tenant.status": "Tenant status",
      "tenant.statusDesc": "Disabling a tenant hides its menu from customers. This is an admin operation.",
      "tenant.enable": "Enable tenant",
      "tenant.disable": "Disable tenant",
      "tenant.note": "Note: the API does not return the current tenant status, so the badge reflects your most recent action in this session.",
      "tenant.enabled": "Enabled",
      "tenant.disabled": "Disabled",
      "tenant.unknown": "Unknown",
      "tenant.confirmDisable": "Disable this tenant? Its menu will be hidden from customers.",
      "tenant.enabledSuccess": "Tenant enabled successfully.",
      "tenant.disabledSuccess": "Tenant disabled successfully.",
      "tenant.errorUpdate": "Failed to update tenant status."
    },

    pt: {
      "nav.brand": "Akut Admin",
      "nav.dashboard": "Painel",
      "nav.menu": "Cardápio",
      "nav.tenant": "Tenant",
      "nav.signOut": "Sair",

      "login.brand": "Akut Admin",
      "login.tagline": "Gerenciar cardápios e tenants",
      "login.username": "Usuário",
      "login.password": "Senha",
      "login.submit": "Entrar",
      "login.submitting": "Entrando…",
      "login.errorEmpty": "Por favor, insira usuário e senha.",
      "login.errorFailed": "Falha no login. Tente novamente.",

      "page.dashboard.heading": "Painel",
      "page.dashboard.subheading": "Gerencie seu cardápio Akut e o status do tenant",
      "page.menu.heading": "Editor de cardápio",
      "page.menu.subheading": "Edite o cardápio ativo ou trabalhe em um rascunho",
      "page.tenant.heading": "Tenant",
      "page.tenant.subheading": "Ativar ou desativar este tenant",

      "dashboard.cardMenu.title": "Cardápio",
      "dashboard.cardMenu.desc": "Visualize e edite o cardápio ativo, trabalhe em um rascunho e publique alterações.",
      "dashboard.cardMenu.cta": "Abrir editor de cardápio →",
      "dashboard.cardTenant.title": "Tenant",
      "dashboard.cardTenant.desc": "Ativar ou desativar o tenant. Desativar oculta o cardápio dos clientes.",
      "dashboard.cardTenant.cta": "Gerenciar tenant →",
      "dashboard.session.title": "Sessão",
      "dashboard.session.signedInAs": "Conectado como",
      "dashboard.session.email": "E-mail",
      "dashboard.session.role": "Função",
      "dashboard.session.tenant": "Tenant",
      "dashboard.subTenant.label": "Sub-tenant alvo",
      "dashboard.subTenant.help": "Escolha qual sub-tenant suas requisições se aplicam. As opções vêm da declaração <code>custom:subtenants</code> da sua conta e a seleção é enviada como o cabeçalho <code>sub-tenant</code>.",
      "dashboard.subTenant.save": "Salvar",
      "dashboard.subTenant.saved": "Salvo ✓",
      "dashboard.role.admin": "Administrador",
      "dashboard.role.customer": "Cliente",

      "menu.editing": "Editando",
      "menu.activeMenu": "Cardápio ativo",
      "menu.draft": "Rascunho",
      "menu.load": "Carregar",
      "menu.newMenu": "Novo cardápio",
      "menu.form": "Formulário",
      "menu.json": "JSON",
      "menu.saveDraft": "Salvar como rascunho",
      "menu.publish": "Publicar (Ativo)",
      "menu.loading": "Carregando…",
      "menu.empty": "Nenhum cardápio carregado. Escolha <strong>Cardápio ativo</strong> ou <strong>Rascunho</strong> e pressione <strong>Carregar</strong>, ou inicie um <strong>Novo cardápio</strong>.",
      "menu.jsonHelp": "Payload bruto do cardápio enviado para <code>PUT {path}</code>. Edite com cuidado — deve corresponder à forma <code>Menu</code> do akut.domain.",
      "menu.applyToForm": "Aplicar ao formulário",
      "menu.details": "Detalhes do cardápio",
      "menu.templateId": "ID do template",
      "menu.templateIdPlaceholder": "ex.: classic-01",
      "menu.defaultLanguage": "Idioma padrão",
      "menu.currency": "Moeda",
      "menu.notes": "Notas (internas)",
      "menu.name": "Nome",
      "menu.description": "Descrição",
      "menu.logo": "Logotipo",
      "menu.categories": "Categorias",
      "menu.addCategory": "Adicionar categoria",
      "menu.noCategories": "Nenhuma categoria ainda.",
      "menu.order": "Ordem",
      "menu.categoryImage": "Imagem da categoria",
      "menu.items": "Itens",
      "menu.addItem": "Adicionar item",
      "menu.noItems": "Nenhum item ainda.",
      "menu.price": "Preço",
      "menu.markAsNew": "Marcar como novo",
      "menu.shortDesc": "Descrição curta",
      "menu.fullDesc": "Descrição completa",
      "menu.ingredients": "Ingredientes",
      "menu.allergens": "Alérgenos",
      "menu.diets": "Dietas",
      "menu.youtube": "URLs de vídeo do YouTube",
      "menu.youtubePlaceholder": "Uma URL por linha",
      "menu.images": "Imagens",
      "menu.imageUrl": "URL da imagem",
      "menu.imageTitle": "Título (opcional)",
      "menu.addImage": "+ Adicionar imagem",
      "menu.moveUp": "Mover para cima",
      "menu.moveDown": "Mover para baixo",
      "menu.removeCategory": "Remover categoria",
      "menu.removeItem": "Remover item",
      "menu.removeImage": "Remover imagem",
      "menu.confirmRemoveCategory": "Remover esta categoria e seus itens?",
      "menu.confirmRemoveItem": "Remover este item?",
      "menu.saving": "Salvando…",
      "menu.savedAs": "Cardápio salvo como {status}.",
      "menu.status.Active": "Ativo",
      "menu.status.Draft": "Rascunho",
      "menu.errorTemplateId": "O ID do template é obrigatório.",
      "menu.errorName": "O nome do cardápio precisa de pelo menos uma tradução.",
      "menu.errorLoad": "Falha ao carregar cardápio.",
      "menu.errorSave": "Falha ao salvar cardápio.",
      "menu.errorNothingToSave": "Nada para salvar — carregue ou crie um cardápio primeiro.",
      "menu.jsonApplied": "Aplicado ✓",
      "menu.jsonInvalid": "JSON inválido: {msg}",
      "menu.categoryN": "Categoria {n}",
      "menu.itemN": "Item {n}",

      "tenant.status": "Status do tenant",
      "tenant.statusDesc": "Desativar um tenant oculta seu cardápio dos clientes. Esta é uma operação de administrador.",
      "tenant.enable": "Ativar tenant",
      "tenant.disable": "Desativar tenant",
      "tenant.note": "Nota: a API não retorna o status atual do tenant, portanto o indicador reflete sua ação mais recente nesta sessão.",
      "tenant.enabled": "Ativo",
      "tenant.disabled": "Inativo",
      "tenant.unknown": "Desconhecido",
      "tenant.confirmDisable": "Desativar este tenant? Seu cardápio ficará oculto dos clientes.",
      "tenant.enabledSuccess": "Tenant ativado com sucesso.",
      "tenant.disabledSuccess": "Tenant desativado com sucesso.",
      "tenant.errorUpdate": "Falha ao atualizar o status do tenant."
    }
  };

  function getLang() {
    return localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations();
  }

  function t(key, vars) {
    var lang = getLang();
    var dict = translations[lang] || translations[DEFAULT_LANG];
    var str = (dict && dict[key]) || (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key]) || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.replace("{" + k + "}", vars[k]);
      });
    }
    return str;
  }

  function applyTranslations() {
    var lang = getLang();
    document.documentElement.lang = lang;

    var els, i, el, key, varsAttr, vars;

    els = document.querySelectorAll("[data-i18n]");
    for (i = 0; i < els.length; i++) {
      el = els[i];
      el.textContent = t(el.getAttribute("data-i18n"));
    }

    els = document.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < els.length; i++) {
      el = els[i];
      key = el.getAttribute("data-i18n-html");
      vars = null;
      varsAttr = el.getAttribute("data-i18n-vars");
      if (varsAttr) { try { vars = JSON.parse(varsAttr); } catch (e) {} }
      el.innerHTML = t(key, vars);
    }

    els = document.querySelectorAll("[data-i18n-placeholder]");
    for (i = 0; i < els.length; i++) {
      el = els[i];
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    }

    // Update page heading/subheading using the data-page key on body
    var pageKey = document.body && document.body.getAttribute("data-page");
    if (pageKey) {
      var h1 = document.querySelector(".page-header h1");
      var sub = document.querySelector(".page-header .page-sub");
      if (h1) h1.textContent = t("page." + pageKey + ".heading");
      if (sub) sub.textContent = t("page." + pageKey + ".subheading");
    }

    // Sync language toggle button active state
    els = document.querySelectorAll("[data-lang-btn]");
    for (i = 0; i < els.length; i++) {
      el = els[i];
      el.classList.toggle("is-active", el.getAttribute("data-lang-btn") === lang);
    }
  }

  document.addEventListener("DOMContentLoaded", applyTranslations);

  window.AkutI18n = { t: t, getLang: getLang, setLang: setLang, apply: applyTranslations };
  window.t = t;
})();
