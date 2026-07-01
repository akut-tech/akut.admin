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
      "page.menu.heading": "Menus",
      "page.menu.subheading": "Select a menu to edit or create a new one",
      "page.menu-list.heading": "Menus",
      "page.menu-list.subheading": "Select a menu to edit or create a new one",
      "page.menu-edit.heading": "Menu editor",
      "page.menu-edit.subheading": "Edit the active menu or work on a draft",
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
      "menu.backToList": "← Menus",
      "menu.form": "Form",
      "menu.json": "JSON",
      "menu.saveDraft": "Save",
      "menu.preview": "Preview",
      "menu.previewing": "Previewing…",
      "menu.publish": "Publish (Active)",
      "menu.loading": "Loading…",
      "menu.empty": "No menu selected. Return to the menu list and choose a menu to edit, or create a <strong>New menu</strong>.",
      "menu.list.loading": "Loading menus…",
      "menu.list.empty": "No menus found.",
      "menu.list.errorLoad": "Failed to load menu list.",
      "menu.list.newMenu": "New menu",
      "menu.list.refresh": "Refresh",
      "menu.list.status.Active": "Active",
      "menu.list.status.Disabled": "Disabled",
      "menu.list.status.Deleted": "Deleted",
      "menu.list.noMenusActive": "No active menus.",
      "menu.list.noMenusDisabled": "No disabled menus.",
      "menu.list.noMenusDeleted": "No deleted menus.",
      "menu.list.updatedBy": "Updated by",
      "menu.list.viewPublished": "View published",
      "menu.list.preview": "Preview",
      "menu.jsonHelp": "Raw menu payload sent to <code>PUT {path}</code>. Edit carefully — this must match the akut.domain <code>Menu</code> shape.",
      "menu.applyToForm": "Apply to form",
      "menu.details": "Menu details",
      "menu.templateId": "Template ID",
      "menu.templateIdPlaceholder": "e.g. epicurean",
      "menu.templateIdHelp": "Select a preset or type any custom value.",
      "menu.defaultLanguage": "Default language",
      "menu.currency": "Currency",
      "menu.notes": "Notes (internal)",
      "menu.availabilityTime": "Availability hours",
      "menu.availabilityTimeFrom": "From (h)",
      "menu.availabilityTimeTo": "To (h)",
      "menu.name": "Name",
      "menu.description": "Description",
      "menu.logo": "Logo",
      "menu.categories": "Categories",
      "menu.addCategory": "Add category",
      "menu.noCategories": "No categories yet.",
      "menu.order": "Order",

      "menu.items": "Items",
      "menu.addItem": "Add item",
      "menu.noItems": "No items yet.",
      "menu.price": "Price",
      "menu.tag": "Tag",
      "menu.tag.none": "None",
      "menu.tag.1": "New",
      "menu.tag.2": "Popular",
      "menu.tag.3": "Recommended by Chef",
      "menu.tag.4": "Seasonal",
      "menu.tag.5": "Limited Edition",
      "menu.shortDesc": "Short description",
      "menu.fullDesc": "Full description",
      "menu.ingredients": "Ingredients",
      "menu.allergens": "Allergens",
      "menu.allergen.1": "Gluten",
      "menu.allergen.2": "Crustaceans",
      "menu.allergen.3": "Eggs",
      "menu.allergen.4": "Fish",
      "menu.allergen.5": "Peanuts",
      "menu.allergen.6": "Soybeans",
      "menu.allergen.7": "Milk",
      "menu.allergen.8": "Nuts",
      "menu.allergen.9": "Celery",
      "menu.allergen.10": "Mustard",
      "menu.allergen.11": "Sesame",
      "menu.allergen.12": "Sulphites",
      "menu.allergen.13": "Lupin",
      "menu.allergen.14": "Molluscs",
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
      "menu.status.Disabled": "Disabled",
      "menu.status.Deleted": "Deleted",
      "menu.foundedYear": "Founded year",
      "menu.foundedYearHelp": "Optional. Year the restaurant was founded (1500–{max}).",
      "menu.errorFoundedYear": "Founded year must be between 1500 and {max}.",
      "menu.errorTemplateId": "Template ID is required.",
      "menu.errorName": "Menu name needs at least one translation.",
      "menu.errorLoad": "Failed to load menu.",
      "menu.errorSave": "Failed to save menu.",
      "menu.errorPreview": "Failed to send preview.",
      "menu.errorNothingToSave": "Nothing to save — load or create a menu first.",
      "menu.jsonApplied": "Applied ✓",
      "menu.jsonInvalid": "Invalid JSON: {msg}",
      "menu.categoryN": "Category {n}",
      "menu.itemN": "Item {n}",
      "menu.publish.checking": "Checking…",
      "menu.publish.conflictTitle": "Active menu conflict",
      "menu.publish.conflictDesc": "An active menu already exists with this ID. Choose how to proceed.",
      "menu.publish.replace": "Replace active menu",
      "menu.publish.new": "Create new active menu",
      "menu.publish.cancel": "Cancel",

      "tenant.adminRequired": "Admin access required",
      "tenant.adminRequiredDesc": "Tenant management is restricted to administrators.",
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
      "nav.tenant": "Clientes",
      "nav.signOut": "Sair",

      "login.brand": "Akut Admin",
      "login.tagline": "Gerenciar cardápios e clientes",
      "login.username": "Usuário",
      "login.password": "Senha",
      "login.submit": "Entrar",
      "login.submitting": "Entrando…",
      "login.errorEmpty": "Por favor, insira usuário e senha.",
      "login.errorFailed": "Falha no login. Tente novamente.",

      "page.dashboard.heading": "Painel",
      "page.dashboard.subheading": "Gerencie seu cardápio Akut e o status dos clientes",
      "page.menu.heading": "Cardápios",
      "page.menu.subheading": "Selecione um cardápio para editar ou crie um novo",
      "page.menu-list.heading": "Cardápios",
      "page.menu-list.subheading": "Selecione um cardápio para editar ou crie um novo",
      "page.menu-edit.heading": "Editor de cardápio",
      "page.menu-edit.subheading": "Edite o cardápio ativo ou trabalhe em um rascunho",
      "page.tenant.heading": "Clientes",
      "page.tenant.subheading": "Ativar ou desativar este cliente",

      "dashboard.cardMenu.title": "Cardápio",
      "dashboard.cardMenu.desc": "Visualize e edite o cardápio ativo, trabalhe em um rascunho e publique alterações.",
      "dashboard.cardMenu.cta": "Abrir editor de cardápio →",
      "dashboard.cardTenant.title": "Clientes",
      "dashboard.cardTenant.desc": "Ativar ou desativar o cliente. Desativar oculta o cardápio dos usuários.",
      "dashboard.cardTenant.cta": "Gerenciar clientes →",
      "dashboard.session.title": "Sessão",
      "dashboard.session.signedInAs": "Conectado como",
      "dashboard.session.email": "E-mail",
      "dashboard.session.role": "Função",
      "dashboard.session.tenant": "Cliente",
      "dashboard.subTenant.label": "Sub-cliente alvo",
      "dashboard.subTenant.help": "Escolha qual sub-cliente suas requisições se aplicam. As opções vêm da declaração <code>custom:subtenants</code> da sua conta e a seleção é enviada como o cabeçalho <code>sub-tenant</code>.",
      "dashboard.subTenant.save": "Salvar",
      "dashboard.subTenant.saved": "Salvo ✓",
      "dashboard.role.admin": "Administrador",
      "dashboard.role.customer": "Usuário",

      "menu.editing": "Editando",
      "menu.activeMenu": "Cardápio ativo",
      "menu.draft": "Rascunho",
      "menu.load": "Carregar",
      "menu.newMenu": "Novo cardápio",
      "menu.backToList": "← Cardápios",
      "menu.form": "Formulário",
      "menu.json": "JSON",
      "menu.saveDraft": "Salvar",
      "menu.preview": "Pré-visualizar",
      "menu.previewing": "Pré-visualizando…",
      "menu.publish": "Publicar (Ativo)",
      "menu.loading": "Carregando…",
      "menu.empty": "Nenhum cardápio selecionado. Volte à lista de cardápios e escolha um para editar, ou crie um <strong>Novo cardápio</strong>.",
      "menu.list.loading": "Carregando cardápios…",
      "menu.list.empty": "Nenhum cardápio encontrado.",
      "menu.list.errorLoad": "Falha ao carregar a lista de cardápios.",
      "menu.list.newMenu": "Novo cardápio",
      "menu.list.refresh": "Atualizar",
      "menu.list.status.Active": "Ativo",
      "menu.list.status.Disabled": "Desativado",
      "menu.list.status.Deleted": "Excluído",
      "menu.list.noMenusActive": "Nenhum cardápio ativo.",
      "menu.list.noMenusDisabled": "Nenhum cardápio desativado.",
      "menu.list.noMenusDeleted": "Nenhum cardápio excluído.",
      "menu.list.updatedBy": "Atualizado por",
      "menu.list.viewPublished": "Ver publicado",
      "menu.list.preview": "Pré-visualizar",
      "menu.jsonHelp": "Payload bruto do cardápio enviado para <code>PUT {path}</code>. Edite com cuidado — deve corresponder à forma <code>Menu</code> do akut.domain.",
      "menu.applyToForm": "Aplicar ao formulário",
      "menu.details": "Detalhes do cardápio",
      "menu.templateId": "ID do template",
      "menu.templateIdPlaceholder": "ex.: epicurean",
      "menu.templateIdHelp": "Selecione um preset ou digite qualquer valor.",
      "menu.defaultLanguage": "Idioma padrão",
      "menu.currency": "Moeda",
      "menu.notes": "Notas (internas)",
      "menu.availabilityTime": "Horário de disponibilidade",
      "menu.availabilityTimeFrom": "Das (h)",
      "menu.availabilityTimeTo": "Até (h)",
      "menu.name": "Nome",
      "menu.description": "Descrição",
      "menu.logo": "Logotipo",
      "menu.categories": "Categorias",
      "menu.addCategory": "Adicionar categoria",
      "menu.noCategories": "Nenhuma categoria ainda.",
      "menu.order": "Ordem",

      "menu.items": "Itens",
      "menu.addItem": "Adicionar item",
      "menu.noItems": "Nenhum item ainda.",
      "menu.price": "Preço",
      "menu.tag": "Etiqueta",
      "menu.tag.none": "Nenhuma",
      "menu.tag.1": "Novo",
      "menu.tag.2": "Popular",
      "menu.tag.3": "Recomendado pelo Chef",
      "menu.tag.4": "Sazonal",
      "menu.tag.5": "Edição Limitada",
      "menu.shortDesc": "Descrição curta",
      "menu.fullDesc": "Descrição completa",
      "menu.ingredients": "Ingredientes",
      "menu.allergens": "Alérgenos",
      "menu.allergen.1": "Glúten",
      "menu.allergen.2": "Crustáceos",
      "menu.allergen.3": "Ovos",
      "menu.allergen.4": "Peixe",
      "menu.allergen.5": "Amendoim",
      "menu.allergen.6": "Soja",
      "menu.allergen.7": "Leite",
      "menu.allergen.8": "Frutos secos",
      "menu.allergen.9": "Aipo",
      "menu.allergen.10": "Mostarda",
      "menu.allergen.11": "Gergelim",
      "menu.allergen.12": "Sulfitos",
      "menu.allergen.13": "Tremoço",
      "menu.allergen.14": "Moluscos",
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
      "menu.status.Disabled": "Desativado",
      "menu.status.Deleted": "Excluído",
      "menu.foundedYear": "Ano de fundação",
      "menu.foundedYearHelp": "Opcional. Ano em que o restaurante foi fundado (1500–{max}).",
      "menu.errorFoundedYear": "O ano de fundação deve ser entre 1500 e {max}.",
      "menu.errorTemplateId": "O ID do template é obrigatório.",
      "menu.errorName": "O nome do cardápio precisa de pelo menos uma tradução.",
      "menu.errorLoad": "Falha ao carregar cardápio.",
      "menu.errorSave": "Falha ao salvar cardápio.",
      "menu.errorPreview": "Falha ao enviar pré-visualização.",
      "menu.errorNothingToSave": "Nada para salvar — carregue ou crie um cardápio primeiro.",
      "menu.jsonApplied": "Aplicado ✓",
      "menu.jsonInvalid": "JSON inválido: {msg}",
      "menu.categoryN": "Categoria {n}",
      "menu.itemN": "Item {n}",
      "menu.publish.checking": "Verificando…",
      "menu.publish.conflictTitle": "Conflito de cardápio ativo",
      "menu.publish.conflictDesc": "Já existe um cardápio ativo com este ID. Escolha como prosseguir.",
      "menu.publish.replace": "Substituir cardápio ativo",
      "menu.publish.new": "Criar novo cardápio ativo",
      "menu.publish.cancel": "Cancelar",

      "tenant.adminRequired": "Acesso de administrador necessário",
      "tenant.adminRequiredDesc": "O gerenciamento de clientes é restrito a administradores.",
      "tenant.status": "Status do cliente",
      "tenant.statusDesc": "Desativar um cliente oculta seu cardápio dos usuários. Esta é uma operação de administrador.",
      "tenant.enable": "Ativar cliente",
      "tenant.disable": "Desativar cliente",
      "tenant.note": "Nota: a API não retorna o status atual do cliente, portanto o indicador reflete sua ação mais recente nesta sessão.",
      "tenant.enabled": "Ativo",
      "tenant.disabled": "Inativo",
      "tenant.unknown": "Desconhecido",
      "tenant.confirmDisable": "Desativar este cliente? Seu cardápio ficará oculto dos usuários.",
      "tenant.enabledSuccess": "Cliente ativado com sucesso.",
      "tenant.disabledSuccess": "Cliente desativado com sucesso.",
      "tenant.errorUpdate": "Falha ao atualizar o status do cliente."
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
    var pageKey = document.body && (document.body.getAttribute("data-page-i18n") || document.body.getAttribute("data-page"));
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
