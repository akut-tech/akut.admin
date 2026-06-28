---
# This file has YAML front matter so Jekyll processes the Liquid tags below,
# injecting values from _config.yml. The result is a plain JS file served to
# the browser. Rebuild the site after changing config in _config.yml.
---
// Global runtime configuration for the Akut Admin console.
window.AKUT_CONFIG = {
  apiBaseUrl: {{ site.akut.api_base_url | jsonify }},
  menuPath: {{ site.akut.menu_path | jsonify }},
  menuMetadataPath: {{ site.akut.menu_metadata_path | jsonify }},
  tenantPath: {{ site.akut.tenant_path | jsonify }},
  cognito: {
    region: {{ site.akut.cognito_region | jsonify }},
    clientId: {{ site.akut.cognito_client_id | jsonify }}
  },
  baseUrl: {{ site.baseurl | jsonify }}
};

// Enum maps mirroring akut.domain. The lambda (Newtonsoft) serializes enum
// *values* as integers but reads either integers or names; Translations
// dictionary keys are serialized/read as enum *names*.
window.AKUT_ENUMS = {
  language: { 1: "Portuguese", 2: "English", 3: "Spanish", 4: "French" },
  currency: { 1: "Euro", 2: "Dollar", 3: "Pound" },
  menuStatus: { 1: "Active", 2: "Draft" },
  imageSource: { 0: "ExternalGallery", 1: "GoogleDrive", 2: "AkutGallery" },
  foodDietType: {
    1: "Vegan", 2: "Vegetarian", 3: "GlutenFree", 4: "LactoseFree",
    5: "EggFree", 6: "SugarFree", 7: "CaffeineFree", 8: "AlcoholFree",
    9: "LowCarb", 10: "LowFat", 11: "LowSalt", 12: "LowSugar",
    13: "Organic", 14: "Bio", 15: "Kosher", 16: "Raw", 17: "Spicy"
  },
  menuItemTag: {
    1: "New", 2: "Popular", 3: "RecommendedByChef", 4: "Seasonal",
    5: "LimitedTimeOffer", 6: "SpecialOffer", 7: "HealthyChoice"
  }
};
