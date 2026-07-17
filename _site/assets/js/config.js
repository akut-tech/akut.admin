// Global runtime configuration for the Akut Admin console.
window.AKUT_CONFIG = {
  apiBaseUrl: "https://zk5hanxapf.execute-api.eu-west-1.amazonaws.com",
  menuPath: "/menu",
  menuMetadataPath: "/menu/metadata",
  tenantPath: "/tenant",
  cognito: {
    region: "eu-west-1",
    clientId: "175hkjpgbetjh1a5r05vkcps8r"
  },
  baseUrl: ""
};

// Enum maps mirroring akut.domain. The lambda (Newtonsoft) serializes enum
// *values* as integers but reads either integers or names; Translations
// dictionary keys are serialized/read as enum *names*.
window.AKUT_ENUMS = {
  language: { 1: "Portuguese", 2: "English", 3: "Spanish", 4: "French", 5: "Italian" },
  currency: { 1: "Euro", 2: "Dollar", 3: "Pound" },
  menuStatus: { 1: "Active", 2: "Disabled", 3: "Deleted" },
  imageSource: { 0: "ExternalGallery", 1: "GoogleDrive", 2: "AkutGallery" },
  foodDietType: {
    1: "Vegan", 2: "Vegetarian", 3: "GlutenFree", 4: "LactoseFree",
    5: "EggFree", 6: "SugarFree", 7: "CaffeineFree", 8: "AlcoholFree",
    9: "LowCarb", 10: "LowFat", 11: "LowSalt", 12: "LowSugar",
    13: "Organic", 14: "Bio", 15: "Kosher", 16: "Raw", 17: "Spicy"
  },
  menuItemTag: {
    1: "New", 2: "Popular", 3: "RecommendedByChef", 4: "Seasonal",
    5: "LimitedEdition"
  },
  allergen: {
    1: "Gluten", 2: "Crustaceans", 3: "Eggs", 4: "Fish", 5: "Peanuts",
    6: "Soybeans", 7: "Milk", 8: "Nuts", 9: "Celery", 10: "Mustard",
    11: "Sesame", 12: "Sulphites", 13: "Lupin", 14: "Molluscs"
  },
  // Mirrors the .NET System.DayOfWeek enum used by StandardAvailability.Days.
  dayOfWeek: {
    0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
    4: "Thursday", 5: "Friday", 6: "Saturday"
  }
};
